import { NextRequest, NextResponse } from "next/server";

// Microsoft OAuth 2.0 認証URLを生成
export async function GET(request: NextRequest) {
  // リクエストから現在のホストを取得
  const host = request.headers.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const redirectUri = `${protocol}://${host}/api/auth/callback/microsoft`;

  console.log(`🔑 Microsoft OAuth認証開始: リダイレクトURI = ${redirectUri}`);

  const clientId = process.env.MICROSOFT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "Microsoft Client ID not configured" }, { status: 500 });
  }

  // Microsoft identity platform (v2.0) のOAuth 2.0エンドポイント
  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");

  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("response_mode", "query");
  authUrl.searchParams.append("scope", "offline_access Calendars.Read User.Read");
  // prompt=select_account: ユーザーに管理者承認を求めず、アカウント選択のみ促す
  authUrl.searchParams.append("prompt", "select_account");

  return NextResponse.json({ url: authUrl.toString(), redirectUri });
}
