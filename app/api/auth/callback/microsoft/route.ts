import { NextRequest, NextResponse } from "next/server";

// Edge Runtimeを使用（Vercel互換性向上）
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Microsoft OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/agents/calendar-finder?error=microsoft_${error}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/agents/calendar-finder?error=no_code", request.url)
    );
  }

  try {
    const host = request.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const redirectUri = `${protocol}://${host}/api/auth/callback/microsoft`;

    console.log(`🔑 Microsoft OAuth コールバック: リダイレクトURI = ${redirectUri}`);

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Microsoft credentials not configured");
    }

    // 認証コードをトークンに交換
    const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: "offline_access Calendars.Read User.Read",
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange error:", errorData);
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    }

    const tokens = await tokenResponse.json();

    console.log("✅ Microsoft トークン取得成功:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
    });

    // トークンをクッキーに保存
    const response = NextResponse.redirect(
      new URL("/agents/calendar-finder?authenticated=true&provider=microsoft", request.url)
    );

    if (tokens.access_token) {
      response.cookies.set("microsoft_access_token", tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: tokens.expires_in || 3600, // トークンの有効期限（通常1時間）
        path: "/",
      });
      console.log("🍪 microsoft_access_token クッキーを設定");
    }

    if (tokens.refresh_token) {
      response.cookies.set("microsoft_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 90, // 90日（Microsoftのrefresh tokenは長期有効）
        path: "/",
      });
      console.log("🍪 microsoft_refresh_token クッキーを設定");
    }

    return response;
  } catch (error: any) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/agents/calendar-finder?error=microsoft_auth_failed&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
