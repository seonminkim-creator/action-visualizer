import { NextRequest, NextResponse } from "next/server";
import { BoujoItem, BoujoCard, ClaudeOutput, InfoSource } from "@/lib/types/boujo";
import { matchProducts, formatProductCandidates } from "@/lib/utils/boujo-matcher";
import { getForecastUrlByCategory } from "@/lib/data/prefecture-urls";
import { scrapeNiigataPestForecasts, searchForecastsByTopic } from "@/lib/utils/niigata-scraper";
import { extractForecastDataFromPdf } from "@/lib/utils/pdf-extractor";
import {
  BOUJO_PREVENTION_STRATEGIES,
  MONTHLY_FORECAST_DATA,
  getMonthlyForecastContext,
  getPreventionStrategyContext
} from "@/lib/knowledge/niigata-boujo-knowledge";
import { geminiRateLimiter } from "@/lib/utils/rate-limiter";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/boujo/recommend
 *
 * BoujoItemを受け取り、Gemini 2.5 Proで製品推奨カードを生成
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { item }: { item: BoujoItem } = await req.json();

    if (!item || !item.crop || !item.topic) {
      return NextResponse.json(
        { error: "無効なリクエスト: item, crop, topicが必要です" },
        { status: 400 }
      );
    }

    console.log(`🔍 防除暦アラート推奨生成開始 - 作物: ${item.crop}, トピック: ${item.topic}, 地域: ${item.region}`);

    // ステップ0: 静的URLマッピングを取得（新潟県の場合はスクレイピング）
    let staticForecastUrl = "";
    if (item.region === "新潟県") {
      console.log(`🌾 新潟県の予察情報をスクレイピング中...`);
      try {
        const forecastData = await scrapeNiigataPestForecasts();
        console.log(`✅ 新潟県予察情報取得: ${forecastData.forecasts.length}件`);

        // トピックに関連する予察情報を検索
        const relatedForecasts = searchForecastsByTopic(forecastData.forecasts, item.topic);

        if (relatedForecasts.length > 0) {
          // 最新の情報のPDF URLを使用
          staticForecastUrl = relatedForecasts[0].pdfUrl;
          console.log(`✅ トピック「${item.topic}」に関連する予察情報: ${relatedForecasts[0].title}`);
          console.log(`   PDF URL: ${staticForecastUrl}`);
        } else {
          // トピックに完全一致しなくても、カテゴリに応じたデフォルトURLを使用
          staticForecastUrl = getForecastUrlByCategory(item.region, item.category);
          console.log(`ℹ️ トピックに完全一致する予察情報なし、デフォルトURL使用: ${staticForecastUrl}`);
        }
      } catch (error) {
        console.error("⚠️ 新潟県予察情報スクレイピングエラー:", error);
        // エラー時はデフォルトURLを使用
        staticForecastUrl = getForecastUrlByCategory(item.region, item.category);
      }
    } else {
      // 他の県はデフォルトURL（今後実装予定）
      staticForecastUrl = getForecastUrlByCategory(item.region, item.category);
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("❌ GEMINI_API_KEY が設定されていません");
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    // ステップ1: 製品候補をマッチング
    const matchedProducts = matchProducts(item);
    const productCandidates = formatProductCandidates(matchedProducts.slice(0, 5)); // 最大5件

    console.log(`✅ 製品候補: ${productCandidates.length}件`);

    // ステップ2: Gemini APIプロンプトを構築（新潟県知識ベース統合版）

    // 新潟県の場合は専門知識を追加
    let knowledgeContext = "";
    if (item.region === "新潟県") {
      // 月次予測情報を取得
      const monthlyContext = getMonthlyForecastContext(item.date_iso, item.crop);
      if (monthlyContext) {
        knowledgeContext += `\n【${item.region}の発生予測情報】\n${monthlyContext}\n`;
      }

      // 防除対策知識を取得
      const preventionContext = getPreventionStrategyContext(item.topic);
      if (preventionContext) {
        knowledgeContext += `\n【${item.topic}の具体的防除対策（新潟県実データ）】\n${preventionContext}\n`;
      }
    }

    const prompt = `あなたは農業の病害虫防除の専門家です。以下の情報に基づいて、営業担当者向けの防除情報カードを作成してください。

【地域】
${item.region}

【作物】
${item.crop}

【予察情報】
- カテゴリ: ${item.category}
- タイトル: ${item.title}
- 発表日: ${item.date_iso}
- 緊急度: ${item.severity}
- 本文抜粋: ${item.snippet || "（本文なし）"}
${knowledgeContext}
【製品候補】
${productCandidates.length > 0
  ? productCandidates.map((p, i) => `${i + 1}. ${p.name}
   - ID: ${p.id}
   - ラベル情報: ${p.label_excerpt}
   - ラベルURL: ${p.label_url}`).join("\n\n")
  : "（該当製品なし）"}

【タスク】
以下のJSON形式**のみ**で出力してください（前後に説明文は一切不要）：

{
  "status": "OK",
  "summary": "120字以内の一文要約（具体的な行動を含める）",
  "recommendations": [
    {
      "product_id": "製品ID（上記候補から選択）",
      "reason": "適用作物／対象／使用時期（ラベル原文抜粋）"
    }
  ]
}

【重要な制約】
- 推奨製品は上記候補から最大3件まで
- 製品URLはシステムが自動的に設定するため、出力に含めない
- summaryは120字以内で、営業担当者が即座に行動を判断できる内容に
- 予察情報URLもシステムが自動設定するため、出力に含めない
- 上記【具体的防除対策】の情報を参考に、現場で実行可能な具体的アドバイスを含めること
- 月次予測情報がある場合は、その時期の発生状況を考慮すること

**必ず有効なJSON形式のみで出力してください。マークダウンのコードブロックや説明文は含めないでください。**`;

    console.log(`🤖 Gemini API呼び出し中...`);
    const rateLimiterStatus = geminiRateLimiter.getStatus();
    console.log(`   レート制限状態: 実行中=${rateLimiterStatus.activeRequests}, 待機中=${rateLimiterStatus.queueLength}`);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    };

    // リトライロジック + レート制限: 503エラーの場合は最大3回再試行
    let response;
    let lastError;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // レート制限付きでfetchを実行
        response = await geminiRateLimiter.execute(async () => {
          return await fetch(geminiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
        });

        if (response.ok) {
          break; // 成功したらループを抜ける
        }

        // 503 (過負荷)の場合はリトライ
        if (response.status === 503 && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2秒、4秒、8秒
          console.log(`⚠️ Gemini API過負荷(503) - ${waitTime/1000}秒後にリトライ (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // それ以外のエラーは即座に失敗
        const errorText = await response.text();
        console.error(`❌ Gemini APIエラー: ${response.status} ${errorText}`);
        throw new Error(`Gemini API error: ${response.status}`);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⚠️ Gemini APIエラー - ${waitTime/1000}秒後にリトライ (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Gemini API request failed');
    }

    const geminiResponse = await response.json();
    console.log(`✅ Gemini APIレスポンス受信`);

    let responseText = "";
    if (geminiResponse.candidates && geminiResponse.candidates[0]) {
      const candidate = geminiResponse.candidates[0];
      if (candidate.content && candidate.content.parts) {
        responseText = candidate.content.parts.map((part: any) => part.text || "").join("");
      }
    }

    console.log(`📄 Gemini レスポンス内容（最初の500文字）:`, responseText.substring(0, 500));
    console.log(`   レスポンス全長: ${responseText.length}文字`);

    // ステップ3: Gemini出力をパース
    let claudeOutput: ClaudeOutput;
    try {
      claudeOutput = parseGeminiOutput(responseText);
      console.log(`✅ JSON解析成功`);
      console.log(`🔍 パース後の出力:`, JSON.stringify(claudeOutput, null, 2));
    } catch (parseError) {
      console.error(`❌ JSON解析エラー詳細:`, parseError);
      console.error(`   元テキスト（全文）:`, responseText);
      throw new Error(`JSON解析に失敗しました: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // ステップ4: URLを静的データから設定（Gemini生成URLは使用しない）

    // 予察情報URL: 静的マッピング優先、なければitem.source_urlを使用
    const forecastUrl = staticForecastUrl || item.source_url;
    console.log(`✅ 予察情報URL設定: ${forecastUrl}`);
    claudeOutput.links = {
      forecast: forecastUrl,
      product: [], // 製品URLはrecommendationsに含まれる
    };

    // 製品URL: product databaseから取得（常に）
    if (claudeOutput.recommendations) {
      claudeOutput.recommendations = claudeOutput.recommendations.map(rec => {
        const product = matchedProducts.find(p => p.id === rec.product_id);
        return {
          ...rec,
          label_url: product?.label_url || "",
        };
      });
    }

    console.log(`✅ URL設定完了 - forecast=${forecastUrl}, recommendations=${claudeOutput.recommendations?.length || 0}件`);

    // ステップ4.5: PDFから詳細予察情報を抽出（新潟県の場合）
    if (item.region === "新潟県" && staticForecastUrl && staticForecastUrl.endsWith('.pdf')) {
      console.log(`📄 PDF詳細情報抽出を開始...`);
      try {
        const detailedForecast = await extractForecastDataFromPdf(
          staticForecastUrl,
          item.crop,
          item.topic
        );

        if (detailedForecast.length > 0) {
          claudeOutput.detailedForecast = detailedForecast;
          console.log(`✅ PDF詳細情報抽出完了: ${detailedForecast.length}件`);
          console.log(`   抽出データ:`, JSON.stringify(detailedForecast, null, 2));
        } else {
          console.log(`ℹ️ PDF詳細情報抽出: データなし`);
        }
      } catch (error) {
        console.error(`⚠️ PDF詳細情報抽出エラー:`, error);
        // エラーが発生してもカード生成は継続
      }
    }

    // ステップ5: 二本根拠チェック（製品DBのURLを使用）
    const productUrlsFromRecommendations = claudeOutput.recommendations
      ?.map(r => r.label_url)
      .filter(url => url && url.trim() !== "") || [];

    const hasEvidence = hasTwoEvidence(
      claudeOutput.links.forecast,
      productUrlsFromRecommendations
    );

    if (!hasEvidence) {
      console.warn(`⚠️ 二本根拠が揃わないためHOLD`);
      claudeOutput.status = "HOLD";
      claudeOutput.hold_reason = claudeOutput.hold_reason || "有効なURLが見つからないため提案保留";
    }

    // ステップ5.5: 情報ソースを判定
    const infoSource = determineInfoSource(staticForecastUrl || item.source_url);
    console.log(`📌 情報ソース: ${infoSource}`);

    // ステップ6: BoujoCardを生成
    const card: BoujoCard = {
      id: crypto.randomBytes(16).toString("hex"),
      region: item.region,
      crop: item.crop,
      category: item.category,
      severity: item.severity,
      topic: item.topic,
      published_at: item.date_iso,
      summary: claudeOutput.summary || "",
      recommendations: claudeOutput.recommendations?.map(r => {
        const product = matchedProducts.find(p => p.id === r.product_id);
        return {
          product_id: r.product_id,
          name: product?.name || r.product_id,
          image_url: product?.image_url,
          reason: r.reason,
          label_url: r.label_url, // 既にproduct databaseのURLに更新済み
        };
      }) || [],
      evidence: {
        forecast_url: claudeOutput.links.forecast,
        // product_label_urlsもrecommendationsのlabel_urlから取得
        product_label_urls: claudeOutput.recommendations?.map(r => r.label_url).filter(url => url) || [],
      },
      detailedForecast: claudeOutput.detailedForecast, // PDF詳細情報を追加
      status: claudeOutput.status,
      hold_reason: claudeOutput.hold_reason,
      generated_at: new Date().toISOString(),
      model_version: "gemini-2.5-pro",
      info_sources: [infoSource], // 情報ソースを追加（配列化）
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ 推奨カード生成完了 - 処理時間: ${processingTime}ms`);
    console.log(`📋 生成されたカード:`, JSON.stringify({
      evidence: card.evidence,
      recommendations: card.recommendations.map(r => ({ name: r.name, label_url: r.label_url }))
    }, null, 2));

    return NextResponse.json({
      card,
      processingTime: `${(processingTime / 1000).toFixed(1)}秒`,
      metadata: {
        product_candidates_count: productCandidates.length,
        recommendations_count: card.recommendations.length,
        status: card.status,
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ 推奨カード生成エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "推奨カードの生成に失敗しました";

    return NextResponse.json(
      {
        error: errorMessage,
        processingTime: `${(processingTime / 1000).toFixed(1)}秒`,
      },
      { status: 500 }
    );
  }
}

/**
 * Gemini出力をパース（エラーハンドリング付き）
 */
function parseGeminiOutput(text: string): ClaudeOutput {
  // まずそのままJSONパース
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log("直接JSONパース失敗、抽出処理を開始");
  }

  // JSONブロックを抽出（```json ... ``` 形式）
  let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("JSONブロック（```json）抽出後もパース失敗:", e);
    }
  }

  // JSONブロックを抽出（``` ... ``` 形式）
  jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("JSONブロック（```）抽出後もパース失敗:", e);
    }
  }

  // 最後の手段: {} で囲まれた部分を抽出
  jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("JSON {...} 抽出後もパース失敗:", e);
      console.error("抽出されたJSON:", jsonMatch[0].substring(0, 200));
    }
  }

  // 全て失敗した場合のログ出力
  console.error("=== JSON解析完全失敗 ===");
  console.error("元テキスト（最初の500文字）:", text.substring(0, 500));

  throw new Error(`JSON解析に失敗しました。Geminiの出力形式を確認してください。`);
}

/**
 * 二本根拠チェック（MVP版：製品URLのみでもOKとする）
 */
function hasTwoEvidence(forecastUrl: string, productUrls: string[]): boolean {
  // MVP版：製品推奨があれば有効とする（県URLは参考情報）
  return Boolean(productUrls && productUrls.length > 0);
}

/**
 * URLから情報ソースを判定
 */
function determineInfoSource(url: string): InfoSource {
  if (!url) return "その他";

  const lowerUrl = url.toLowerCase();

  // 農水省（maff.go.jp）
  if (lowerUrl.includes("maff.go.jp")) {
    return "農水省";
  }

  // JA（ja-group.jp, ja-.jp など）
  if (lowerUrl.includes("ja-") || lowerUrl.includes("ja.or.jp") || lowerUrl.includes("ja-group.jp")) {
    return "JA";
  }

  // 都道府県（pref.*.jp）
  if (lowerUrl.includes("pref.") && lowerUrl.includes(".jp")) {
    return "県";
  }

  return "その他";
}
