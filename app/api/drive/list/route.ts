import { NextRequest, NextResponse } from "next/server";
import {
  getDriveClient,
  getOrCreateRootFolder,
  listMeetingFolders,
  getMeetingData,
  MeetingData,
} from "@/lib/utils/google-drive";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 会議一覧をGoogle Driveから取得
 *
 * GET /api/drive/list
 * Query params:
 *   - limit: 取得件数（デフォルト: 50）
 *   - folderId: 特定のフォルダの詳細を取得
 */
export async function GET(req: NextRequest) {
  try {
    // トークンを取得
    const accessToken = req.cookies.get("google_drive_access_token")?.value;
    const refreshToken = req.cookies.get("google_drive_refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Driveに接続されていません", needsAuth: true },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const folderId = searchParams.get("folderId");

    // Driveクライアント作成
    const drive = getDriveClient(accessToken, refreshToken);

    // 特定のフォルダの詳細を取得（内容を含む）
    if (folderId) {
      // フォルダ名を取得
      const folderInfo = await drive.files.get({
        fileId: folderId,
        fields: "name",
      });

      // 詳細読み込みモードでファイル内容も取得
      const meetingData = await getMeetingData(drive, folderId, folderInfo.data.name || "", true);
      return NextResponse.json({ meeting: meetingData });
    }

    // ルートフォルダを取得
    const rootFolderId = await getOrCreateRootFolder(drive);

    // 会議フォルダ一覧を取得
    const folders = await listMeetingFolders(drive, rootFolderId, limit);

    // 各フォルダの詳細を取得
    const meetings: MeetingData[] = await Promise.all(
      folders.map((folder) => getMeetingData(drive, folder.id, folder.name))
    );

    return NextResponse.json({
      meetings,
      rootFolderId,
    });
  } catch (error) {
    console.error("Google Drive一覧取得エラー:", error);

    // トークン期限切れの場合
    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        { error: "認証が期限切れです。再接続してください。", needsAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "一覧の取得に失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
