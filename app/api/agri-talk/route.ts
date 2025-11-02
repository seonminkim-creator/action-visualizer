import { NextRequest, NextResponse } from "next/server";

// Vercel Pro最適化: Node.js Runtime + 長時間実行
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Proプラン: 最大300秒（5分）

type TopicCategory = "weather" | "market" | "subsidy" | "safety" | "events";

type AgriTalkInput = {
  region: string;
  crop?: string;
  categories?: TopicCategory[];
};

// Google Custom Search APIを使った検索
async function searchGoogle(query: string, apiKey: string, searchEngineId: string): Promise<string[]> {
  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.append("key", apiKey);
    url.searchParams.append("cx", searchEngineId);
    url.searchParams.append("q", query);
    url.searchParams.append("num", "5"); // 5件取得
    url.searchParams.append("dateRestrict", "d21"); // 直近3週間

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`Google Search API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = data.items || [];

    return items.map((item: any) => {
      const title = item.title || "";
      const snippet = item.snippet || "";
      const link = item.link || "";
      return `${title}\n${snippet}\n(${link})`;
    });
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

// Gemini APIで検索結果を整理・分類
async function analyzeWithGemini(
  region: string,
  crop: string | undefined,
  searchResults: Record<string, string[]>,
  selectedCategories: TopicCategory[],
  geminiApiKey: string
): Promise<string> {
  // カテゴリ名のマッピング
  const categoryNames: Record<TopicCategory, string> = {
    weather: "☀️ 天気・病害アラート",
    market: "💹 市況・トレンド",
    safety: "⚠️ ローカル安全情報",
    subsidy: "🏗️ 地域インフラ・政策",
    events: "📅 地域の話題",
  };

  // 選択されたカテゴリのリストを生成
  const selectedCategoriesText = selectedCategories
    .map((cat, index) => `    * ${index + 1}. ${categoryNames[cat]}`)
    .join("\n");

  const SYSTEM_PROMPT = `あなたは、BASFのアグロソリューションズ事業部の営業担当者を支援するAIエージェント『Agri-Talk Assistant』です。あなたの唯一のタスクは、営業担当者が訪問先の農家さんとアイスブレイク（関係構築）をするための「旬な話題」を提供することです。

## 実行プロセス
1. 入力された「訪問地域」と「主要作物」の情報に基づき、検索結果を**以下の選択されたカテゴリのみ**に分類・整理します。
${selectedCategoriesText}

2. **【重要：空欄対策フォールバック処理】**
   各カテゴリで「直近3週間」の「訪問地域」に関連する情報が検索結果に見つからなかった場合、**絶対に空欄のまま回答せず**、以下のように代替情報を提供してください：

   * **[1. 天気・病害アラート] が見つからない場合:**
     - 範囲を広げた一般的な気象傾向や広域の病害虫予察情報を記載
   * **[2. 市況・トレンド] が見つからない場合:**
     - 日本国内のメジャーな農産物の全国的な市況やトレンドを記載
   * **[3. ローカル安全情報] が見つからない場合:**
     - 都道府県レベルの獣害・盗難情報を記載
   * **[4. 地域インフラ・政策] が見つからない場合:**
     - 都道府県レベルまたは全国的な政策・補助金ニュースを記載
   * **[5. 地域の話題] が見つからない場合:**
     - 都道府県レベルの一般的な話題を記載

## 出力フォーマット
* 回答のタイトルは、ユーザーの入力に応じて以下のように変更してください。
    * **作物名ありの場合:**
        > 【[訪問地域]｜[主要作物]農家さん向け】厳選トピック（直近3週間）
    * **作物名なしの場合:**
        > 【[訪問地域]】厳選トピック（直近3週間）

* **【重要】上記の選択されたカテゴリ（絵文字と見出しを含む）のみを出力してください。選択されていないカテゴリは一切出力しないでください。**
* **【重要：見やすさ向上】各カテゴリの間には、必ず水平線（\`---\`）を入れて視覚的に分離すること。**

* **【各カテゴリの構成】** 以下の順番で記載してください：
    1. **会話ヒント（最初）**: \`💡 **会話のきっかけ:**\` の形式で、具体的でわかりやすい会話例を記載してください。
       - 2つの質問を**完全に別々の行**に分けて記載（各質問の間に改行を1つ入れる）
       - 各質問を太字で強調: **「〇〇」**
       - 敬語で記載
       - **必須フォーマット:** 見出し（💡 **会話のきっかけ:**）の次の行に1つ目の質問、その次の行に2つ目の質問を記載
       - 例：1行目「💡 **会話のきっかけ:**」、2行目「**「このところ風が強い日もありますが、みかんの木への影響はいかがでしょうか？」**」、3行目「**「県の予察でカメムシの発生予測が出ていましたが、園地での発生状況はいかがですか？」**」
       - 質問1と質問2の間には必ず改行を入れ、各質問が独立した行として表示されるようにすること
    2. **トピック（箇条書き）**: 検索で見つかった関連トピック（事実）を箇条書き（\`•\`）でリストアップ
       - 「事実:」という接頭辞は絶対に使用しないでください。
       - 箇条書きの記号は必ず \`•\` を使用してください（\`*\` ではなく）
       - **【口調指定】** 箇条書き（事実）の文章は、敬語（「です・ます」調）を避け、ニュース記事のような常体（「だ・である」調、または体言止め）で記述すること。
       - **【情報源】** 情報源（例：気象庁、〇〇市役所、地元紙など）が明らかな場合は、文章の末尾に \`（[情報源名]）\` の形で必ず付記すること。
       - **（フォールバック時）** 代替検索を行った場合は、情報が広範囲のものであることが分かるように記載してください。
           - （例）• [全国市況] 農林水産省の発表によると、今月のレタスの全国平均価格は前年比10%高で推移。
           - （例）• [静岡県全域] 静岡県警によると、県西部を中心に農機具のバッテリー盗難が報告されている。

## 制約事項
* あなた自身に関する解説や提案（「なぜこのエージェントが最適か」や「今後のステップ」など）は一切行わないでください。
* ユーザーからの入力情報のみに基づいて、上記タスクを実行することに集中してください。
* 検索期間は「直近3週間」を厳守してください。
* 検索結果がない場合でも、**選択されたカテゴリに限り**何らかの情報を記載してください。
* **【最重要】選択されていないカテゴリ（検索クエリが提供されていないカテゴリ）については、一切言及・出力しないでください。たとえ関連情報があっても出力してはいけません。**

Markdown形式で出力してください。`;

  const searchResultText = Object.entries(searchResults)
    .map(([query, results]) => {
      return `【検索クエリ: ${query}】\n${results.length > 0 ? results.join("\n\n") : "検索結果なし"}`;
    })
    .join("\n\n---\n\n");

  const categoryCount = selectedCategories.length;
  const categoryListText = selectedCategories.map(cat => categoryNames[cat]).join("、");

  const userMessage = `【訪問地域】${region}
${crop ? `【主要作物】${crop}` : ""}

**【重要指示】ユーザーが選択したカテゴリは以下の${categoryCount}個です:**
${categoryListText}

**これら${categoryCount}個のカテゴリのみを出力してください。他のカテゴリは一切出力しないでください。**

【検索結果】
${searchResultText}

上記の検索結果をもとに、選択された${categoryCount}個のカテゴリについて、農家さんとの会話のきっかけになる旬な話題を整理してください。`;

  // エクスポネンシャルバックオフ付きリトライロジック（最適化版）
  let lastError = null;
  const maxRetries = 3; // リトライ回数を削減（1, 2, 3回目）

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${SYSTEM_PROMPT}\n\n${userMessage}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 4096, // トークン数を削減
            },
          }),
          signal: AbortSignal.timeout(50000), // 50秒タイムアウト（Node.js Runtime: 60秒以内）
        }
      );

      if (response.ok) {
        const data = await response.json();
        const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        console.log(`✅ Gemini API成功（試行${attempt}回目）`);
        return textOut;
      }

      // 503エラーの場合はエクスポネンシャルバックオフでリトライ
      if (response.status === 503 && attempt < maxRetries) {
        // 短縮版バックオフ: 1秒 → 2秒
        const backoffSeconds = attempt;
        console.log(`⏳ Gemini APIリトライ ${attempt}/${maxRetries} (503エラー、${backoffSeconds}秒後に再試行)`);
        await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
        continue;
      }

      // その他のエラー
      lastError = `Gemini API error: ${response.status}`;
      console.error(lastError);
      break;
    } catch (e) {
      lastError = String(e);
      console.error(`Gemini API呼び出しエラー（試行${attempt}回目）:`, e);
      if (attempt < maxRetries) {
        const backoffSeconds = attempt; // 短縮版: 1秒 → 2秒
        console.log(`⏳ リトライ ${attempt}/${maxRetries} (${backoffSeconds}秒後に再試行)`);
        await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
      }
    }
  }

  throw new Error(lastError || "Gemini API error");
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { region, crop, categories } = (await req.json()) as AgriTalkInput;

    if (!region || !region.trim()) {
      return NextResponse.json(
        { error: "訪問地域を入力してください" },
        { status: 400 }
      );
    }

    // カテゴリが指定されていない場合は全カテゴリ
    const selectedCategories = categories && categories.length > 0
      ? categories
      : ["weather", "market", "subsidy", "safety", "events"] as TopicCategory[];

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const googleSearchApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!geminiApiKey || !googleSearchApiKey || !searchEngineId) {
      console.error("Required API keys not found");
      return NextResponse.json(
        { error: "API設定が不完全です。環境変数を確認してください。" },
        { status: 500 }
      );
    }

    // カテゴリに応じて検索クエリを生成
    const categoryQueries: Record<TopicCategory, string> = {
      weather: `${region} 天気 予報 病害虫`,
      market: crop ? `${crop} 市況 価格` : `${region} 農産物 市況`,
      subsidy: `${region} 補助金 農業 政策`,
      safety: `${region} 獣害 安全`,
      events: `${region} イベント 話題`,
    };

    // 選択されたカテゴリのみクエリを生成
    const queries = selectedCategories.map(cat => categoryQueries[cat]);

    console.log("🔍 選択されたカテゴリ:", selectedCategories);
    console.log("🔍 検索クエリ:", queries);

    // 並列検索で高速化（待機時間なし）
    const searchStartTime = Date.now();
    const searchPromises = queries.map(query =>
      searchGoogle(query, googleSearchApiKey, searchEngineId)
        .then(results => ({ query, results }))
    );

    const searchResultsArray = await Promise.all(searchPromises);
    const searchResults: Record<string, string[]> = {};
    searchResultsArray.forEach(({ query, results }) => {
      searchResults[query] = results;
    });

    const searchDuration = ((Date.now() - searchStartTime) / 1000).toFixed(1);
    console.log(`📊 検索結果取得完了（${searchDuration}秒）`);

    // Geminiで分析・整理
    const geminiStartTime = Date.now();
    const content = await analyzeWithGemini(region, crop, searchResults, selectedCategories, geminiApiKey);
    const geminiDuration = ((Date.now() - geminiStartTime) / 1000).toFixed(1);

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Gemini分析完了（${geminiDuration}秒） | 合計処理時間: ${totalDuration}秒`);

    return NextResponse.json({ content });
  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`API route error (処理時間: ${totalDuration}秒):`, error);

    // より詳細なエラーメッセージを提供
    let errorMessage = "エラーが発生しました。";
    let errorDetails = "";

    if (error instanceof Error) {
      if (error.message.includes("Gemini API error")) {
        errorMessage = "AI分析サービスとの通信でエラーが発生しました。";
        errorDetails = "Gemini APIからの応答に問題がありました。サーバーが混雑している可能性があります。";
      } else if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        errorMessage = "処理がタイムアウトしました。";
        errorDetails = `処理に${totalDuration}秒かかりました。この機能は複数の検索とAI分析を行うため、最大60秒程度かかる場合があります。もう一度お試しください。`;
      } else if (error.message.includes("fetch")) {
        errorMessage = "外部APIとの通信エラーが発生しました。";
        errorDetails = "Google検索APIまたはGemini AIとの通信に失敗しました。ネットワーク接続を確認してください。";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails || "しばらく時間をおいてから再度お試しください。",
        processingTime: `${totalDuration}秒`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: 'POST /api/agri-talk with { region: string, crop?: string }',
  });
}
