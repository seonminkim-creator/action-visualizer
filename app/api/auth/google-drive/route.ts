import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

// Google Drive認証URLを生成
export async function GET(request: NextRequest) {
  // リクエストから現在のホストを取得
  const host = request.headers.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const redirectUri = `${protocol}://${host}/api/auth/callback/google-drive`;

  console.log(`🔑 Google Drive OAuth認証開始: リダイレクトURI = ${redirectUri}`);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  // Google Drive用スコープ
  const scopes = [
    "https://www.googleapis.com/auth/drive.file", // アプリが作成したファイルのみアクセス
    "https://www.googleapis.com/auth/userinfo.email", // ユーザー識別用
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  // Google認証ページにリダイレクト
  return NextResponse.redirect(url);
}
