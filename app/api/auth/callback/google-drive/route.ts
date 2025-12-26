import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/agents/meeting-recorder?error=no_code", request.url));
  }

  try {
    // リクエストから現在のホストを取得
    const host = request.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const redirectUri = `${protocol}://${host}/api/auth/callback/google-drive`;

    console.log(`🔑 Google Drive OAuth コールバック: リダイレクトURI = ${redirectUri}`);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // 認証コードをトークンに交換
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // トークンをクッキーに保存
    const response = NextResponse.redirect(new URL("/agents/meeting-recorder?drive_authenticated=true", request.url));

    if (tokens.access_token) {
      response.cookies.set("google_drive_access_token", tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60, // 1時間
        path: "/",
      });
    }

    if (tokens.refresh_token) {
      response.cookies.set("google_drive_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30, // 30日
        path: "/",
      });
    }

    console.log(`✅ Google Drive認証成功`);
    return response;
  } catch (error) {
    console.error("Google Drive OAuth callback error:", error);
    return NextResponse.redirect(new URL("/agents/meeting-recorder?error=auth_failed", request.url));
  }
}
