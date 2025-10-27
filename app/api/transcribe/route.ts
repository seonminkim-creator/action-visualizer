import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return NextResponse.json(
        { error: "音声ファイルが見つかりません" },
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

    // 音声データをBase64に変換
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    console.log(`🎤 音声データを受信: ${audioFile.size} bytes, type: ${audioFile.type}`);

    // Gemini API で音声認識
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "以下の音声を文字起こししてください。日本語で話されている内容をそのまま文字に起こしてください。",
            },
            {
              inline_data: {
                mime_type: audioFile.type || "audio/webm",
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    };

    console.log("📤 Gemini APIに音声認識リクエスト送信中...");

    // リトライロジック（最大7回、エクスポネンシャルバックオフ）
    let lastError = null;
    const maxRetries = 7;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Gemini API 音声認識成功（試行${attempt}回目）`);

          if (
            !data.candidates ||
            !data.candidates[0] ||
            !data.candidates[0].content ||
            !data.candidates[0].content.parts ||
            !data.candidates[0].content.parts[0]
          ) {
            console.error("❌ 不正なレスポンス形式:", JSON.stringify(data));
            return NextResponse.json(
              { error: "音声認識結果が取得できませんでした" },
              { status: 500 }
            );
          }

          const transcription = data.candidates[0].content.parts[0].text;
          console.log(`📝 文字起こし結果: ${transcription.substring(0, 100)}...`);

          return NextResponse.json({ transcription });
        }

        // 503エラーの場合、エクスポネンシャルバックオフでリトライ
        if (response.status === 503 && attempt < maxRetries) {
          const backoffSeconds = Math.pow(2, attempt); // 2, 4, 8, 16, 32, 64
          const errorText = await response.text();
          console.error(`❌ Gemini API エラー (試行${attempt}/${maxRetries}):`, errorText);
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
    console.error(`❌ 音声認識に失敗しました（${maxRetries}回試行）:`, lastError);
    return NextResponse.json(
      { error: "音声認識に失敗しました。もう一度お試しください。" },
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
