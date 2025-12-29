import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();

    console.log(`🔓 ${provider}カレンダーとの連携を解除中...`);

    const response = NextResponse.json({ success: true });

    // プロバイダーに応じたクッキーを削除
    if (provider === "google") {
      response.cookies.set("google_access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
      });
      response.cookies.set("google_refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
      });
      console.log("✅ Googleカレンダーとの連携を解除しました");
    } else if (provider === "microsoft") {
      response.cookies.set("microsoft_access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
      });
      response.cookies.set("microsoft_refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
      });
      console.log("✅ Outlookカレンダーとの連携を解除しました");
    } else if (provider === "google-drive") {
      response.cookies.set("google_drive_access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
      });
      response.cookies.set("google_drive_refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
      });
      console.log("✅ Google Driveとの連携を解除しました");
    }

    return response;
  } catch (error) {
    console.error("連携解除エラー:", error);
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}
