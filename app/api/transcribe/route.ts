import { NextRequest, NextResponse } from "next/server";
import { appendLog, generateUserId } from "@/lib/utils/logger";
import { geminiRateLimiter } from "@/lib/utils/gemini-rate-limiter";
import { getDriveClient, createOAuth2Client } from "@/lib/utils/google-drive";

// Vercel Pro最適化: Node.js Runtime + 5分タイムアウト
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Proプラン: 最大300秒（5分）

/**
 * Gemini APIで音声認識（最大限の最適化版）
 *
 * 最適化ポイント:
 * 1. グローバルレート制限キュー
 * 2. インテリジェントエクスポネンシャルバックオフ
 * 3. 503エラー専用の長時間待機
 * 4. リクエストサイズの最適化
 */
async function transcribeWithGemini(audioFile: Blob, apiKey: string): Promise<string> {
  // レート制限: リクエスト前に適切な待機
  await geminiRateLimiter.waitForSlot();

  console.log("🎯 Gemini APIで音声認識を実行...");

  // 音声データをBase64に変換
  const arrayBuffer = await audioFile.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");

  // Gemini 3 Flash（最新の第3世代高速モデル）を使用
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            // プロンプト強化: フィラー除去、方言補正、話者分離の指示を追加
            text: `以下の音声を日本語で非常に正確に文字起こししてください。

【重要な指示】
1. **逐一の書き起こし**: 短くまとめたり要約したりせず、聞こえる全ての言葉をそのまま、一字一句漏らさず書き出してください。
2. **話者分離**: 複数の話者がいる場合は、[話者A], [話者B] のようにラベルを付けて区別のつくようにしてください。
3. **フィラー除去**: 「えー」「あのー」などの不要な間音のみ、読みやすくするために適宜除去してください。
4. **出力形式**: 文字起こし結果のテキストのみを出力してください。解説などは不要です。`,
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
      temperature: 0, // 完全に決定的（最速）
      topP: 1,
      topK: 1, // 最小（最速）
      maxOutputTokens: 64000, // Gemini 3の最大出力上限まで拡大し、絶対に途切れないようにする
      candidateCount: 1,
    },
    // 安全性フィルターを緩和（処理高速化）
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  // インテリジェントリトライロジック
  const maxRetries = 5;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Gemini API リクエスト送信 (試行${attempt}/${maxRetries})`);

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(180000), // 3分タイムアウト
      });

      if (response.ok) {
        const data = await response.json();

        if (
          !data.candidates ||
          !data.candidates[0] ||
          !data.candidates[0].content ||
          !data.candidates[0].content.parts ||
          !data.candidates[0].content.parts[0]
        ) {
          throw new Error("Invalid response format from Gemini API");
        }

        const transcription = data.candidates[0].content.parts[0].text || "";
        console.log(`✅ Gemini API 音声認識成功（試行${attempt}回目）: ${transcription.length} 文字`);

        if (transcription.trim() === "") {
          console.warn("⚠️ Gemini returned empty transcription text");
        }

        // 成功を記録（レート制限緩和）
        geminiRateLimiter.recordSuccess();

        return transcription || "（音声が認識できませんでした。マイクの設定や音量を確認してください）";
      }

      // エラーハンドリング
      const errorText = await response.text();
      lastError = `Status ${response.status}: ${errorText}`;
      console.error(`❌ Gemini API エラー (試行${attempt}/${maxRetries}, status=${response.status})`);

      // エラーを記録（レート制限強化）
      geminiRateLimiter.recordError(response.status);

      if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
        // 503エラー専用の超長時間バックオフ
        let backoffSeconds: number;

        if (response.status === 503) {
          // 503: サーバー過負荷 → 非常に長い待機
          // 1回目: 20秒、2回目: 40秒、3回目: 60秒、4回目: 90秒
          backoffSeconds = Math.min(20 * Math.pow(1.5, attempt - 1), 90);
          console.log(`🔴 503エラー: Gemini APIサーバー過負荷、${backoffSeconds}秒待機...`);
        } else if (response.status === 429) {
          // 429: レート制限 → 長い待機
          backoffSeconds = Math.min(30 * attempt, 120);
          console.log(`🟠 429エラー: レート制限、${backoffSeconds}秒待機...`);
        } else {
          // その他の5xx: 標準バックオフ
          backoffSeconds = Math.min(10 * Math.pow(2, attempt - 1), 60);
          console.log(`🟡 ${response.status}エラー: ${backoffSeconds}秒待機...`);
        }

        await new Promise((resolve) => setTimeout(resolve, backoffSeconds * 1000));
        continue;
      }

      // 400番台エラー（リトライしても無駄）
      break;
    } catch (error) {
      console.error(`❌ リクエストエラー (試行${attempt}/${maxRetries}):`, error);
      lastError = error instanceof Error ? error.message : String(error);

      geminiRateLimiter.recordError();

      if (attempt < maxRetries) {
        const backoffSeconds = Math.min(15 * Math.pow(2, attempt - 1), 90);
        console.log(`⏳ ネットワークエラー、${backoffSeconds}秒後に再試行...`);
        await new Promise((resolve) => setTimeout(resolve, backoffSeconds * 1000));
      }
    }
  }

  throw new Error(`Gemini API failed after ${maxRetries} attempts: ${lastError}`);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const userId = generateUserId(req);

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob | null;
    const driveFileId = formData.get("fileId") as string | null;

    let finalAudioBlob: Blob;

    if (driveFileId) {
      // Google Driveからファイルを取得
      console.log(`📂 Google Driveからファイルを取得中: ${driveFileId}`);
      
      const accessToken = req.cookies.get("google_drive_access_token")?.value;
      const refreshToken = req.cookies.get("google_drive_refresh_token")?.value;

      if (!accessToken && !refreshToken) {
        return NextResponse.json({ error: "Google Drive連携が必要です" }, { status: 401 });
      }

      const drive = getDriveClient(accessToken!, refreshToken);
      
      // メタデータを取得してMIMEタイプを確認
      const fileMeta = await drive.files.get({
        fileId: driveFileId,
        fields: "mimeType, name",
      });

      // ファイル本体を取得
      const response = await drive.files.get(
        { fileId: driveFileId, alt: "media" },
        { responseType: "arraybuffer" }
      );

      finalAudioBlob = new Blob([response.data as ArrayBuffer], { type: fileMeta.data.mimeType || "audio/webm" });
      console.log(`✅ Google Driveからファイル取得完了: ${fileMeta.data.name} (${finalAudioBlob.size} bytes)`);
    } else if (audioFile) {
      finalAudioBlob = audioFile;
    } else {
      return NextResponse.json(
        { error: "音声ファイルまたはFile IDが見つかりません" },
        { status: 400 }
      );
    }

    const fileSizeMB = finalAudioBlob.size / 1024 / 1024;
    console.log(`🎤 音声データを受信: ${finalAudioBlob.size} bytes (${fileSizeMB.toFixed(2)} MB), type: ${finalAudioBlob.type}`);

    // ファイルサイズチェック（100MB以上は警告）
    if (fileSizeMB > 100) {
      console.warn(`⚠️ 大きなファイル: ${fileSizeMB.toFixed(2)} MB - 処理時間が長くなる可能性があります`);
    }

    // APIキーの確認
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      console.error("❌ GEMINI_API_KEY が設定されていません");
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    // 文字起こし実行
    const transcription = await transcribeWithGemini(finalAudioBlob, geminiApiKey);

    // 一時ファイルの削除（Google Drive経由の場合のみ）
    if (driveFileId) {
      try {
        const accessToken = req.cookies.get("google_drive_access_token")?.value;
        const refreshToken = req.cookies.get("google_drive_refresh_token")?.value;
        const drive = getDriveClient(accessToken!, refreshToken);
        await drive.files.delete({ fileId: driveFileId });
        console.log(`🗑️ Google Driveの一時ファイルを削除しました: ${driveFileId}`);
      } catch (deleteError) {
        console.warn(`⚠️ 一時ファイルの削除に失敗しましたが、処理は継続します: ${driveFileId}`, deleteError);
      }
    }

    console.log(`📝 文字起こし完了: ${transcription.substring(0, 100)}...`);

    // 異常パターン検出（同じ文字が100回以上繰り返される場合）
    const repeatedPattern = /(.{1,10})\1{100,}/;
    if (repeatedPattern.test(transcription)) {
      console.warn(`⚠️ 異常な繰り返しパターンを検出`);
    }

    // ログ保存（成功）
    appendLog({
      id: `transcribe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      action: "transcribe",
      status: "success",
      characterCount: transcription.length,
      processingTime: Date.now() - startTime,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    // 推奨待機時間をレスポンスに含める（フロントエンド用）
    const recommendedWaitMs = geminiRateLimiter.getRecommendedWaitMs();

    return NextResponse.json({
      transcription,
      recommendedWaitMs,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error("❌ 音声認識エラー:", error);

    const errorMessage = error instanceof Error ? error.message : "不明なエラー";

    // ログ保存（失敗）
    appendLog({
      id: `transcribe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      action: "transcribe",
      status: "error",
      processingTime: Date.now() - startTime,
      errorMessage,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    // 503を検出した場合、フロントエンドに長い待機を推奨
    const is503 = errorMessage.includes("503") || errorMessage.includes("Service Unavailable");
    const recommendedWaitMs = is503 ? 30000 : 15000;

    return NextResponse.json(
      {
        error: "音声認識に失敗しました。しばらく待ってから再度お試しください。",
        details: errorMessage,
        recommendedWaitMs,
      },
      { status: 500 }
    );
  }
}
