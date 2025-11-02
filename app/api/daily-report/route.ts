import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { appendLog, generateUserId } from "@/lib/utils/logger";
import { DailyReport } from "@/lib/types/daily-report";
import {
  getAgricultureKnowledge,
  getProductKnowledge,
  getReportExamples,
} from "@/lib/knowledge/agriculture";

export const runtime = "nodejs";
export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ユーティリティ: 遅延関数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ユーティリティ: JSONパースの改善
function parseJSONWithFallback(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    // JSONブロックを抽出してリトライ
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[jsonMatch.length > 1 ? 1 : 0]);
      } catch (e2) {
        console.error("JSONブロック抽出後もパース失敗:", e2);
      }
    }
    throw new Error("JSON解析に失敗しました");
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const userId = generateUserId(req);

  try {
    const { transcript, destination, products } = await req.json();

    // 入力検証
    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "商談内容を入力してください" },
        { status: 400 }
      );
    }

    const charCount = transcript.trim().length;
    if (charCount < 50) {
      return NextResponse.json(
        { error: "商談内容が短すぎます。もう少し詳しく入力してください（最低50文字）" },
        { status: 400 }
      );
    }

    if (charCount > 35000) {
      return NextResponse.json(
        { error: "テキストが長すぎます（35,000文字以内）" },
        { status: 400 }
      );
    }

    console.log(`📝 日報生成開始 - 文字数: ${charCount}, ユーザー: ${userId}, 製品: ${products?.join(", ") || "指定なし"}`);

    // Gemini APIで日報を生成（リトライロジック付き）
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.4, // 日報は一貫性重視で低めに設定
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    // プロンプト構築（知識注入）
    const agricultureKnowledge = getAgricultureKnowledge();
    const productKnowledge = getProductKnowledge(products);
    const reportExamples = getReportExamples();

    const systemPrompt = `あなたは農業資材営業の日報作成アシスタントです。
BASFの営業担当として、商談内容から正確で詳細な営業日報を作成してください。

${agricultureKnowledge}

${productKnowledge}

${reportExamples}

【出力形式】
以下のJSON形式で必ず出力してください：
{
  "title": "日報のタイトル（訪問先と主要内容を含む、30文字以内）",
  "visitInfo": {
    "destination": "訪問先企業名・農家名（正式名称）",
    "participants": ["役職・氏名の形式で記載", "例: 代表 田中太郎様", "営業担当 山田"]
  },
  "targetProducts": ["商談対象製品1（正式名称・®マーク含む）", "商談対象製品2", ...],
  "visitSummary": {
    "purpose": "訪問の目的を1~2文で簡潔に記載",
    "result": "商談の結果を具体的に3~5文で記載。顧客の反応、関心度、決定事項などを含む",
    "proposal": "提案した内容を具体的に2~4文で記載。製品の特長、使用方法、メリットを含む",
    "challenges": "課題や懸念事項を2~3文で記載。解決すべき問題、リスク、競合状況などを含む",
    "nextSteps": "次のステップを具体的に2~4文で記載。実施時期、担当者、目標を明確に"
  }
}

【重要な指示】
1. **具体性**: 抽象的な表現を避け、数値・日付・固有名詞を積極的に使用
2. **正確性**: 製品名は必ず正式名称（®マーク含む）を使用。農業用語は正確に
3. **詳細性**: 各項目は2~5文程度の詳細な記載を心がける
4. **論理性**: 目的→結果→提案→課題→次のステップの流れが論理的に繋がるように
5. **実用性**: 後で見返したときに具体的なアクションが分かる内容にする
6. **顧客視点**: 顧客の課題、ニーズ、懸念を明確に記載
7. **数値化**: 面積（ha、10a）、使用量、時期、金額などは必ず具体的に
8. **推測の補完**: 情報が不足している場合は、商談内容から合理的に推測して補完
9. **顧客の声**: 顧客の発言や反応は、可能な限り直接引用または要約して記載
10. **状況描写**: 圃場の状態、作物の生育状況、気象条件などの環境情報も含める
11. **競合情報**: 他社製品の使用状況や比較検討の内容があれば記載
12. **フォローアップ**: 次回訪問時に確認すべき事項を明確に記載`;

    const userPrompt = `
以下の商談内容から営業日報を作成してください。

【商談内容】
${transcript}

${destination ? `【訪問先】\n${destination}\n` : ""}
${products && products.length > 0 ? `【商談対象製品】\n${products.join(", ")}\n` : ""}

上記の情報を元に、詳細で実用的な営業日報をJSON形式で出力してください。
各項目は具体的かつ詳細に記載し、後で見返したときに商談の全体像が分かる内容にしてください。`;

    let report: DailyReport | null = null;
    let lastError: Error | null = null;

    // リトライロジック
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🤖 Gemini API呼び出し (試行${attempt}/${MAX_RETRIES})`);

        const result = await model.generateContent([
          { text: systemPrompt },
          { text: userPrompt },
        ]);

        const response = result.response;
        const text = response.text();

        console.log(`✅ Gemini APIレスポンス受信 (試行${attempt}/${MAX_RETRIES}, ${text.length}文字)`);

        // JSONパース（改善版）
        const parsed = parseJSONWithFallback(text);

        // データ検証（詳細）
        if (!parsed.title || typeof parsed.title !== "string") {
          throw new Error("タイトルが不正です");
        }
        if (!parsed.visitInfo || !parsed.visitInfo.destination || !Array.isArray(parsed.visitInfo.participants)) {
          throw new Error("訪問先情報が不正です");
        }
        if (!Array.isArray(parsed.targetProducts)) {
          throw new Error("商談対象製品が不正です");
        }
        if (!parsed.visitSummary ||
            !parsed.visitSummary.purpose ||
            !parsed.visitSummary.result ||
            !parsed.visitSummary.proposal ||
            !parsed.visitSummary.challenges ||
            !parsed.visitSummary.nextSteps) {
          throw new Error("訪問内容要約が不完全です");
        }

        // 品質チェック
        const qualityIssues: string[] = [];
        if (parsed.visitSummary.purpose.length < 20) {
          qualityIssues.push("目的が短すぎます");
        }
        if (parsed.visitSummary.result.length < 30) {
          qualityIssues.push("結果の記載が不十分です");
        }
        if (parsed.visitSummary.proposal.length < 30) {
          qualityIssues.push("提案の記載が不十分です");
        }

        if (qualityIssues.length > 0 && attempt < MAX_RETRIES) {
          console.warn(`⚠️ 品質チェック警告 (試行${attempt}/${MAX_RETRIES}):`, qualityIssues.join(", "));
          throw new Error(`品質チェック失敗: ${qualityIssues.join(", ")}`);
        }

        report = parsed as DailyReport;
        console.log(`✅ 日報生成成功 (試行${attempt}/${MAX_RETRIES})`);
        break; // 成功したらループを抜ける

      } catch (error) {
        console.error(`❌ 試行${attempt}/${MAX_RETRIES}でエラー:`, error);
        lastError = error instanceof Error ? error : new Error("不明なエラー");

        if (attempt < MAX_RETRIES) {
          console.log(`⏳ ${RETRY_DELAY_MS}ms後にリトライします...`);
          await delay(RETRY_DELAY_MS * attempt); // 指数バックオフ
        }
      }
    }

    // 全てのリトライが失敗した場合
    if (!report) {
      throw lastError || new Error("日報の生成に失敗しました");
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ 日報生成完了 - 処理時間: ${processingTime}ms`);

    // ログ記録
    appendLog({
      id: `daily-report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      action: "meeting-summary",
      status: "success",
      characterCount: charCount,
      processingTime,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      report,
      processingTime: `${(processingTime / 1000).toFixed(1)}秒`,
      metadata: {
        inputLength: charCount,
        outputLength: JSON.stringify(report).length,
        retries: 0, // 成功時はリトライ回数をカウントしていないが、必要なら追加可能
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ 日報生成エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "日報の生成に失敗しました";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // エラーログ記録
    appendLog({
      id: `daily-report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      action: "meeting-summary",
      status: "error",
      processingTime,
      errorMessage,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
        processingTime: `${(processingTime / 1000).toFixed(1)}秒`,
        suggestion: "もう一度お試しください。問題が続く場合は、入力内容を短くするか、より詳しく記載してください。"
      },
      { status: 500 }
    );
  }
}
