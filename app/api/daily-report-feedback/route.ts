import { NextRequest, NextResponse } from "next/server";
import { appendLog, generateUserId } from "@/lib/utils/logger";
import { ReportFeedback } from "@/lib/types/daily-report";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const FEEDBACK_LOG_PATH = path.join(process.cwd(), "logs", "daily-report-feedback.jsonl");

// ログディレクトリの確保
function ensureLogDirectory() {
  const logDir = path.dirname(FEEDBACK_LOG_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// フィードバックを保存
function saveFeedback(feedback: ReportFeedback) {
  ensureLogDirectory();
  const logLine = JSON.stringify(feedback) + "\n";
  fs.appendFileSync(FEEDBACK_LOG_PATH, logLine, "utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const { reportId, rating, comment } = await req.json();

    // 入力検証
    if (!reportId || typeof reportId !== "string") {
      return NextResponse.json(
        { error: "報告IDが不正です" },
        { status: 400 }
      );
    }

    if (!rating || !["good", "bad"].includes(rating)) {
      return NextResponse.json(
        { error: "評価が不正です" },
        { status: 400 }
      );
    }

    const userId = generateUserId(req);

    const feedback: ReportFeedback = {
      reportId,
      rating,
      comment: comment || undefined,
      timestamp: new Date().toISOString(),
      userId,
    };

    // フィードバックを保存
    saveFeedback(feedback);

    console.log(`✅ フィードバック保存 - ${rating} by ${userId}`);

    // 管理用ログにも記録
    appendLog({
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      action: "meeting-summary",
      status: "success",
      processingTime: 0,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "フィードバックを送信しました",
    });

  } catch (error) {
    console.error("❌ フィードバック保存エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "フィードバックの保存に失敗しました";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
