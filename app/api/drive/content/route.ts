import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, getFileContent } from "@/lib/utils/google-drive";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * ファイルの内容を取得
 *
 * GET /api/drive/content?fileId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("google_drive_access_token")?.value;
    const refreshToken = req.cookies.get("google_drive_refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Driveに接続されていません", needsAuth: true },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "fileIdは必須です" },
        { status: 400 }
      );
    }

    const drive = getDriveClient(accessToken, refreshToken);
    const content = await getFileContent(drive, fileId);

    return NextResponse.json({ content });
  } catch (error) {
    console.error("ファイル内容取得エラー:", error);

    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        { error: "認証が期限切れです。再接続してください。", needsAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "ファイルの取得に失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
