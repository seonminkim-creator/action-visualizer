import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { appendLog, generateUserId } from "@/lib/utils/logger";
import { DailyReport } from "@/lib/types/daily-report";

export const runtime = "nodejs";
export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const userId = generateUserId(req);

  try {
    const { transcript, destination, products } = await req.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "商談内容を入力してください" },
        { status: 400 }
      );
    }

    const charCount = transcript.trim().length;
    if (charCount > 35000) {
      return NextResponse.json(
        { error: "テキストが長すぎます（35,000文字以内）" },
        { status: 400 }
      );
    }

    console.log(`📝 日報生成開始 - 文字数: ${charCount}, ユーザー: ${userId}`);

    // Gemini APIで日報を生成
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const systemPrompt = `あなたは農業資材営業の日報作成アシスタントです。
商談内容から営業日報を作成してください。

【出力形式】
以下のJSON形式で出力してください：
{
  "title": "日報のタイトル（簡潔に）",
  "visitInfo": {
    "destination": "訪問先企業名・農家名",
    "participants": ["参加者1", "参加者2", ...]
  },
  "targetProducts": ["商談対象製品1", "商談対象製品2", ...],
  "visitSummary": {
    "purpose": "訪問の目的を簡潔に記載",
    "result": "商談の結果を具体的に記載",
    "proposal": "提案した内容を記載",
    "challenges": "課題や懸念事項を記載",
    "nextSteps": "次のステップ・アクションアイテムを記載"
  }
}

【重要な指示】
1. 商談内容から重要な情報を抽出し、簡潔で分かりやすい日報を作成してください
2. 参加者は役職・氏名の形式で記載してください（例: "営業部長 田中様"）
3. 製品名は正確に記載してください
4. 目的・結果・提案・課題・次のステップは具体的に記載してください
5. 情報が不足している場合は、商談内容から推測して補完してください
6. 数値や日付がある場合は必ず含めてください
7. 農業に関する専門用語はそのまま使用してください`;

    const userPrompt = `
以下の商談内容から営業日報を作成してください。

【商談内容】
${transcript}

${destination ? `【訪問先】\n${destination}\n` : ""}
${products && products.length > 0 ? `【商談対象製品】\n${products.join(", ")}\n` : ""}

上記の情報を元に、営業日報をJSON形式で出力してください。`;

    console.log("🤖 Gemini API呼び出し開始");
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt },
    ]);

    const response = result.response;
    const text = response.text();

    console.log("✅ Gemini APIレスポンス受信");

    // JSONパース
    let report: DailyReport;
    try {
      report = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ JSONパースエラー:", parseError);
      console.error("レスポンステキスト:", text);
      throw new Error("日報データの解析に失敗しました");
    }

    // データ検証
    if (!report.title || !report.visitInfo || !report.visitSummary) {
      console.error("❌ 不完全な日報データ:", report);
      throw new Error("日報データが不完全です");
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
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ 日報生成エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "日報の生成に失敗しました";

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
        details: error instanceof Error ? error.stack : undefined,
        processingTime: `${(processingTime / 1000).toFixed(1)}秒`,
      },
      { status: 500 }
    );
  }
}
