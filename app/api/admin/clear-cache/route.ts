import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Node.js runtime for file system access

export async function POST() {
  try {
    console.log("⚠️ キャッシュクリアリクエスト受信");

    // 開発サーバー実行中に.nextフォルダを削除すると、
    // Next.jsが壊れるため、手動での再起動を案内
    return NextResponse.json({
      success: true,
      message: "キャッシュをクリアするには、以下の手順を実行してください：\n\n1. ターミナルで開発サーバーを停止 (Ctrl+C)\n2. 以下のコマンドを実行:\n   rm -rf .next && npm run dev\n\nこれにより、キャッシュがクリアされ、サーバーが再起動されます。",
      manual: true,
      instructions: {
        step1: "開発サーバーを停止 (Ctrl+C)",
        step2: "ターミナルで実行: rm -rf .next && npm run dev"
      }
    });
  } catch (error) {
    console.error("❌ エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "エラーが発生しました",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST /api/admin/clear-cache to clear build cache",
  });
}
