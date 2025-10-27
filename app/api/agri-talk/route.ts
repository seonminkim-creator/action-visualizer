import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type AgriTalkInput = {
  region: string;
  crop?: string;
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
  geminiApiKey: string
): Promise<string> {
  const SYSTEM_PROMPT = `あなたは、BASFのアグロソリューションズ事業部の営業担当者を支援するAIエージェント『Agri-Talk Assistant』です。あなたの唯一のタスクは、営業担当者が訪問先の農家さんとアイスブレイク（関係構築）をするための「旬な話題」を提供することです。

## 実行プロセス
1. 入力された「訪問地域」と「主要作物」の情報に基づき、検索結果を以下の5つのカテゴリに分類・整理します。
    * 1. ☀️ 天気・病害アラート
    * 2. 💹 市況・トレンド
    * 3. ⚠️ ローカル安全情報
    * 4. 🏗️ 地域インフラ・政策
    * 5. 地域の話題

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

* 上記5つのカテゴリ（絵文字と見出しを含む）を必ず使用してください。
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
* 検索結果がない場合でも、必ず全てのカテゴリに何らかの情報を記載してください。

Markdown形式で出力してください。`;

  const searchResultText = Object.entries(searchResults)
    .map(([query, results]) => {
      return `【検索クエリ: ${query}】\n${results.length > 0 ? results.join("\n\n") : "検索結果なし"}`;
    })
    .join("\n\n---\n\n");

  const userMessage = `【訪問地域】${region}
${crop ? `【主要作物】${crop}` : ""}

【検索結果】
${searchResultText}

上記の検索結果をもとに、農家さんとの会話のきっかけになる旬な話題を整理してください。`;

  // エクスポネンシャルバックオフ付きリトライロジック
  let lastError = null;
  const maxRetries = 7; // リトライ回数を増やす

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
              maxOutputTokens: 8192,
            },
          }),
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
        // エクスポネンシャルバックオフ: 2秒 → 4秒 → 8秒 → 16秒 → 32秒 → 64秒
        const backoffSeconds = Math.pow(2, attempt);
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
        const backoffSeconds = Math.pow(2, attempt);
        console.log(`⏳ リトライ ${attempt}/${maxRetries} (${backoffSeconds}秒後に再試行)`);
        await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
      }
    }
  }

  throw new Error(lastError || "Gemini API error");
}

export async function POST(req: NextRequest) {
  try {
    const { region, crop } = (await req.json()) as AgriTalkInput;

    if (!region || !region.trim()) {
      return NextResponse.json(
        { error: "訪問地域を入力してください" },
        { status: 400 }
      );
    }

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

    // 検索クエリを自動生成
    const queries = [
      `${region} 天気 予報`,
      `${region} 病害虫`,
      crop ? `${crop} 市況` : `${region} 農産物 市況`,
      `${region} 補助金 農業`,
      `${region} 獣害`,
      `${region} 道路工事`,
      `${region} イベント`,
      crop ? `${crop} 価格` : "",
    ].filter(Boolean);

    console.log("🔍 検索クエリ:", queries);

    // 各クエリで検索を実行
    const searchResults: Record<string, string[]> = {};

    for (const query of queries) {
      const results = await searchGoogle(query, googleSearchApiKey, searchEngineId);
      searchResults[query] = results;
      // API制限対策：少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log("📊 検索結果取得完了");

    // Geminiで分析・整理
    const content = await analyzeWithGemini(region, crop, searchResults, geminiApiKey);

    console.log("✅ Gemini分析完了");

    return NextResponse.json({ content });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "エラーが発生しました。しばらくしてから再度お試しください。",
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
