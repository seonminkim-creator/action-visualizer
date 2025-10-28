import { NextRequest, NextResponse } from "next/server";

// Node.js Runtimeに変更（最大300秒実行可能）
export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Pro: 最大60秒

type TaskType = "reply" | "compose" | "revise";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { taskType, inputText, additionalInfo, styleProfile, availability, userName, companyName } = await req.json();

    if (!taskType || !inputText) {
      return NextResponse.json(
        { error: "タスクタイプとメール内容は必須です" },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("❌ GEMINI_API_KEY が設定されていません");
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    // 挨拶文の例を動的に生成
    const greetingExample = userName && companyName
      ? `「大変お世話になっております。${companyName}の${userName}です。」`
      : `「大変お世話になっております。[会社名]の[名前]です。」`;

    // システムプロンプト
    const SYSTEM_PROMPT = `あなたは私のビジネスメール作成アシスタントです。
私が受け取ったメールへの返信や、新規メールの作成・添削を依頼します。
以下の条件と文体をベースに、依頼内容を処理してください。

■あなたの役割
私のビジネスメール作成アシスタント

■タスク
・受信メールへの返信案作成
・新規メールの作成
・既存メール文の添削

■文体・トーン
・ビジネス日本語として丁寧で誠実であること
・かしこまりすぎず、あたたかみ・親しみのある自然な言葉づかい
・「ありがとうございます」「恐縮です」「承知いたしました」など、礼節を保ちながら柔らかい表現を使う
・相手との関係を深めるようなトーン

${userName && companyName ? `■送信者情報
・会社名: ${companyName}
・名前: ${userName}
` : ""}
■構成ルール
1.  冒頭であいさつ（例：${greetingExample}）
2.  相手のメール内容への感謝・共感を一文添える
3.  本題（要件）を簡潔に明確に伝える
4.  最後に、今後の流れやお願い・お礼・フォローの言葉で締める
5.  適宜改行を入れて、読みやすくする

■使いたい文の雰囲気（例）
・「ご連絡ありがとうございます。承知いたしました。」
・「お忙しいところ恐れ入りますが、どうぞよろしくお願いいたします。」
・「ご確認のうえ、不明点などございましたらお気軽にお知らせくださいませ。」
・「ご一緒できることを大変嬉しく思っております。」

■私のメールでよくあるシーン
・業種：農業向けの営業
・やり取り相手：JA（農業協同組合）、卸売業者、市場関係者
・トピック例：農産物の取引、新規契約、価格交渉、出荷調整、販促企画、資料送付など

■あなたの出力形式
・以下の形式で出力してください：
  件名: [メールの件名]

  [メール本文]

・「承知いたしました」「以下の通り、メール本文を作成します」などの前置き・確認文は一切不要です
・「---」などの装飾も不要です
・件名と本文のみを、上記の形式で直接出力してください
・一文ごとに改行を多めに入れて読みやすくする
・不要な難語や固い表現は避け、自然で実務的に使えるメール文に仕上げる

${styleProfile ? `\n■学習済みのユーザーの文体\n以下は、このユーザーの実際のメールから分析した文体の特徴です。今後のメール生成では、この文体を最優先で反映してください：\n\n${styleProfile}\n` : ""}`;

    // タスクごとのユーザープロンプト
    let userPrompt = "";
    if (taskType === "reply") {
      userPrompt = `以下のメールに対する返信を作成してください。

【受信メール】
${inputText}

${additionalInfo ? `【返信内容の指示】\n${additionalInfo}\n` : ""}
${availability ? `\n【あなたの空き時間】\n今後7日間の空き時間: ${availability}\n\n【重要】受信メールで日程調整・打ち合わせ・ミーティング・訪問などが言及されている場合は、**必ず**上記の空き時間から2〜3個の候補日時を具体的にメール本文に含めてください。\n\n例：「以下の日程でご都合はいかがでしょうか？\n・11月5日(火) 10:00〜12:00\n・11月6日(水) 14:00〜16:00\nご都合の良い日時をお知らせいただけますと幸いです。」\n` : ""}
上記の条件に基づいて、適切な返信メール文を件名と本文の形式で生成してください。`;
    } else if (taskType === "compose") {
      userPrompt = `以下の要件に基づいて、新規メールを作成してください。

【作成要件】
${inputText}

${additionalInfo ? `【補足情報】\n${additionalInfo}\n` : ""}
${availability ? `\n【あなたの空き時間】\n今後7日間の空き時間: ${availability}\n\n【重要】作成要件で日程調整・打ち合わせ・ミーティング・訪問などが必要な場合は、**必ず**上記の空き時間から2〜3個の候補日時を具体的にメール本文に含めてください。\n\n例：「以下の日程でご都合はいかがでしょうか？\n・11月5日(火) 10:00〜12:00\n・11月6日(水) 14:00〜16:00\nご都合の良い日時をお知らせいただけますと幸いです。」\n` : ""}
上記の条件に基づいて、適切なメール文を件名と本文の形式で生成してください。`;
    } else if (taskType === "revise") {
      userPrompt = `以下のメール文を添削してください。

【添削対象メール】
${inputText}

${additionalInfo ? `【添削指示】\n${additionalInfo}\n` : ""}
上記の条件に基づいて、より良いメール文を本文のみ生成してください。`;
    }

    console.log(`📧 メール生成リクエスト: タスクタイプ=${taskType}`);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: SYSTEM_PROMPT + "\n\n" + userPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    };

    // エクスポネンシャルバックオフでリトライ（強化版）
    let lastError = null;
    const maxRetries = 5; // リトライ回数を増やす

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(50000), // 50秒タイムアウト
        });

        if (response.ok) {
          const data = await response.json();
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`✅ Gemini API成功（試行${attempt}回目、処理時間: ${duration}秒）`);

          const textOut =
            data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

          if (!textOut || textOut.trim() === "") {
            throw new Error("メール生成結果が空です");
          }

          return NextResponse.json({ email: textOut.trim() });
        }

        // 503エラーの場合、エクスポネンシャルバックオフでリトライ
        if (response.status === 503 && attempt < maxRetries) {
          const backoffSeconds = Math.pow(2, attempt); // 2秒 → 4秒 → 8秒 → 16秒 → 32秒
          console.log(
            `⏳ Gemini APIリトライ ${attempt}/${maxRetries} (503エラー、${backoffSeconds}秒後に再試行)`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, backoffSeconds * 1000)
          );
          continue;
        }

        const errorText = await response.text();
        console.error(
          `❌ Gemini API エラー (試行${attempt}/${maxRetries}):`,
          errorText
        );
        lastError = errorText;
        continue;
      } catch (error) {
        console.error(
          `❌ リクエストエラー (試行${attempt}/${maxRetries}):`,
          error
        );
        lastError = error;

        if (attempt < maxRetries) {
          const backoffSeconds = Math.pow(2, attempt); // 2秒 → 4秒 → 8秒 → 16秒 → 32秒
          console.log(
            `⏳ リトライ中... (${attempt}/${maxRetries}、${backoffSeconds}秒後に再試行)`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, backoffSeconds * 1000)
          );
        }
      }
    }

    // すべてのリトライが失敗した場合
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ メール生成に失敗しました（${maxRetries}回試行、処理時間: ${totalDuration}秒）:`, lastError);

    let errorMessage = "メール生成に失敗しました。";
    let errorDetails = "";

    if (typeof lastError === "string") {
      if (lastError.includes("503")) {
        errorMessage = "AI分析サービスが一時的に混雑しています。";
        errorDetails = `処理に${totalDuration}秒かかりましたが、Gemini APIサーバーが過負荷状態です。1〜2分後に再度お試しください。`;
      } else if (lastError.includes("timeout") || lastError.includes("ETIMEDOUT")) {
        errorMessage = "処理がタイムアウトしました。";
        errorDetails = `処理に${totalDuration}秒かかりました。メール生成には最大60秒程度かかる場合があります。もう一度お試しください。`;
      } else if (lastError.includes("fetch")) {
        errorMessage = "外部APIとの通信エラーが発生しました。";
        errorDetails = "Gemini AIとの通信に失敗しました。ネットワーク接続を確認してください。";
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
  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ 予期しないエラー (処理時間: ${totalDuration}秒):`, error);

    let errorMessage = "サーバーエラーが発生しました";
    let errorDetails = "";

    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        errorMessage = "処理がタイムアウトしました。";
        errorDetails = `処理に${totalDuration}秒かかりました。メール生成には最大60秒程度かかる場合があります。もう一度お試しください。`;
      } else {
        errorDetails = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails || "予期しないエラーが発生しました。",
        processingTime: `${totalDuration}秒`,
      },
      { status: 500 }
    );
  }
}
