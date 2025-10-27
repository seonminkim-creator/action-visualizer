import { NextResponse } from "next/server";

export const runtime = "edge";

// アプリケーションのビルドバージョン
// このタイムスタンプは、サーバー起動時に設定される
const BUILD_VERSION = Date.now().toString();

export async function GET() {
  return NextResponse.json({
    version: BUILD_VERSION,
    timestamp: new Date().toISOString(),
  });
}
