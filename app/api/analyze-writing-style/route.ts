import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { sampleEmails } = await req.json();

    if (!sampleEmails || !Array.isArray(sampleEmails) || sampleEmails.length === 0) {
      return NextResponse.json(
        { error: "サンプルメールが必要です" },
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

    // 文体分析プロンプト
    const analysisPrompt = `以下は、ある人が書いたビジネスメールのサンプルです。
このメールから、その人の文体・トーン・表現パターンの特徴を分析し、以下の形式で出力してください。

【分析対象メール】
${sampleEmails.map((email, i) => `\n=== メール${i + 1} ===\n${email}`).join("\n")}

【出力形式】
以下の形式で、この人の文体の特徴を簡潔に（200-300文字程度で）まとめてください：

---
■文体の特徴
・[トーンの特徴]（例：丁寧だが親しみやすい、簡潔で要点が明確、など）
・[よく使う表現]（例：「承知いたしました」「お手数ですが」「よろしくお願いいたします」など）
・[文章構成の特徴]（例：冒頭で必ず感謝を述べる、箇条書きを多用する、など）
・[その他の特徴]（例：絵文字の使用、改行の頻度、など）
---

※ 上記形式で、実際の特徴を箇条書きで記述してください。
※ 推測や一般論ではなく、実際のメール内容に基づいた具体的な特徴を抽出してください。`;

    console.log(`📊 文体分析リクエスト: ${sampleEmails.length}件のメールを分析`);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: analysisPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    };

    // エクスポネンシャルバックオフでリトライ
    let lastError = null;
    const maxRetries = 7;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Gemini API成功（試行${attempt}回目）`);

          const styleAnalysis = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

          if (!styleAnalysis || styleAnalysis.trim() === "") {
            throw new Error("文体分析結果が空です");
          }

          return NextResponse.json({
            styleProfile: styleAnalysis.trim(),
            timestamp: new Date().toISOString()
          });
        }

        // 503エラーの場合、エクスポネンシャルバックオフでリトライ
        if (response.status === 503 && attempt < maxRetries) {
          const backoffSeconds = Math.pow(2, attempt);
          console.log(`⏳ Gemini APIリトライ ${attempt}/${maxRetries} (503エラー、${backoffSeconds}秒後に再試行)`);
          await new Promise((resolve) => setTimeout(resolve, backoffSeconds * 1000));
          continue;
        }

        const errorText = await response.text();
        console.error(`❌ Gemini API エラー (試行${attempt}/${maxRetries}):`, errorText);
        lastError = errorText;
        continue;
      } catch (error) {
        console.error(`❌ リクエストエラー (試行${attempt}/${maxRetries}):`, error);
        lastError = error;

        if (attempt < maxRetries) {
          const backoffSeconds = Math.pow(2, attempt);
          console.log(`⏳ リトライ中... (${attempt}/${maxRetries}、${backoffSeconds}秒後に再試行)`);
          await new Promise((resolve) => setTimeout(resolve, backoffSeconds * 1000));
        }
      }
    }

    // すべてのリトライが失敗した場合
    console.error(`❌ 文体分析に失敗しました（${maxRetries}回試行）:`, lastError);
    return NextResponse.json(
      { error: "文体分析に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  } catch (error) {
    console.error("❌ 予期しないエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
