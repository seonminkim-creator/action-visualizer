import { NextRequest, NextResponse } from "next/server";
import {
  getDriveClient,
  getOrCreateRootFolder,
  listMeetingFolders,
  getMeetingData,
  MeetingData,
  createOAuth2Client,
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
    let accessToken = req.cookies.get("google_drive_access_token")?.value;
    const refreshToken = req.cookies.get("google_drive_refresh_token")?.value;
    let newAccessToken: string | undefined;

    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: "Google Driveに接続されていません", needsAuth: true },
        { status: 401 }
      );
    }

    // アクセストークンがない（期限切れ）が、リフレッシュトークンがある場合 → 更新を試みる
    if (!accessToken && refreshToken) {
      try {
        console.log("🔄 アクセストークン期限切れのため、リフレッシュを試みます...");
        const oauth2Client = createOAuth2Client("", refreshToken);
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (credentials.access_token) {
          accessToken = credentials.access_token;
          newAccessToken = credentials.access_token;
          console.log("✅ アクセストークンを更新しました");
        } else {
          throw new Error("更新されたアクセストークンが取得できませんでした");
        }
      } catch (refreshError) {
        console.error("トークンリフレッシュ失敗:", refreshError);
        return NextResponse.json(
          { error: "認証の更新に失敗しました。再接続してください。", needsAuth: true },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const folderId = searchParams.get("folderId");

    // Driveクライアント作成
    const drive = getDriveClient(accessToken!, refreshToken);

    let resultResponse: NextResponse;

    // 特定のフォルダの詳細を取得（内容を含む）
    if (folderId) {
      // フォルダ名を取得
      const folderInfo = await drive.files.get({
        fileId: folderId,
        fields: "name",
      });

      // 詳細読み込みモードでファイル内容も取得
      const meetingData = await getMeetingData(drive, folderId, folderInfo.data.name || "", true);
      resultResponse = NextResponse.json({ meeting: meetingData });
    } else {
      // ルートフォルダを取得
      const rootFolderId = await getOrCreateRootFolder(drive);

      // 会議フォルダ一覧を取得
      const folders = await listMeetingFolders(drive, rootFolderId, limit);

      // 各フォルダの詳細を取得
      const meetings: MeetingData[] = await Promise.all(
        folders.map((folder) => getMeetingData(drive, folder.id, folder.name))
      );

      resultResponse = NextResponse.json({
        meetings,
        rootFolderId,
      });
    }

    // 新しいアクセストークンがある場合、クッキーを更新
    if (newAccessToken) {
      resultResponse.cookies.set("google_drive_access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60, // 1時間
        path: "/",
      });
    }

    return resultResponse;

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
