import { NextResponse } from "next/server";

// 環境変数のデバッグ用エンドポイント（本番では削除推奨）
export async function GET() {
  return NextResponse.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "未設定",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "設定済み" : "未設定",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "設定済み" : "未設定",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL || "未設定",
    // 実際に生成されるリダイレクトURI
    redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
  });
}
