import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/utils/google-drive";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 会議フォルダを削除（ゴミ箱に移動）
 *
 * DELETE /api/drive/delete
 * Body: { folderId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("google_drive_access_token")?.value;
    const refreshToken = req.cookies.get("google_drive_refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Driveに接続されていません", needsAuth: true },
        { status: 401 }
      );
    }

    const { folderId } = await req.json();

    if (!folderId) {
      return NextResponse.json(
        { error: "folderIdは必須です" },
        { status: 400 }
      );
    }

    const drive = getDriveClient(accessToken, refreshToken);

    // フォルダをゴミ箱に移動（完全削除ではない）
    await drive.files.update({
      fileId: folderId,
      requestBody: {
        trashed: true,
      },
    });

    console.log(`🗑️ フォルダを削除: ${folderId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("フォルダ削除エラー:", error);

    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        { error: "認証が期限切れです。再接続してください。", needsAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "フォルダの削除に失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
