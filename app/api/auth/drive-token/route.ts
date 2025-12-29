import { NextRequest, NextResponse } from "next/server";
import { createOAuth2Client } from "@/lib/utils/google-drive";

export async function GET(req: NextRequest) {
  try {
    let accessToken = req.cookies.get("google_drive_access_token")?.value;
    const refreshToken = req.cookies.get("google_drive_refresh_token")?.value;

    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: "Google Driveに接続されていません" },
        { status: 401 }
      );
    }

    // トークンが期限切れの場合、バックエンドでリフレッシュして返す
    if (!accessToken && refreshToken) {
      const oauth2Client = createOAuth2Client("", refreshToken);
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token) {
        accessToken = credentials.access_token;
        
        // クッキーも更新しておく
        const res = NextResponse.json({ accessToken });
        res.cookies.set("google_drive_access_token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60, // 1時間
          path: "/",
        });
        return res;
      }
    }

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error("Token error:", error);
    return NextResponse.json({ error: "トークンの取得に失敗しました" }, { status: 500 });
  }
}
