import { NextRequest, NextResponse } from "next/server";
import {
  getDriveClient,
  getOrCreateBackupFolder,
  uploadBackupFile,
} from "@/lib/utils/google-drive";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * バックアップファイルをGoogle Driveにアップロード
 *
 * POST /api/drive/backup
 * Body: { fileName, content }
 */
export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("google_drive_access_token")?.value;
    const refreshToken = req.cookies.get("google_drive_refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Driveに接続されていません", needsAuth: true },
        { status: 401 }
      );
    }

    const { fileName, content } = await req.json();

    if (!fileName || !content) {
      return NextResponse.json(
        { error: "fileName と content は必須です" },
        { status: 400 }
      );
    }

    console.log(`📦 バックアップアップロード開始: ${fileName}`);

    const drive = getDriveClient(accessToken, refreshToken);

    // バックアップフォルダを取得/作成
    const backupFolderId = await getOrCreateBackupFolder(drive);

    // タイムスタンプ付きファイル名
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `${timestamp}_${fileName}`;

    // ファイルをアップロード
    const result = await uploadBackupFile(drive, backupFolderId, backupFileName, content);

    console.log(`✅ バックアップ完了: ${backupFileName}`);

    return NextResponse.json({
      success: true,
      fileId: result.id,
      webViewLink: result.webViewLink,
      fileName: backupFileName,
    });
  } catch (error) {
    console.error("バックアップエラー:", error);

    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        { error: "認証が期限切れです。再接続してください。", needsAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "バックアップに失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * バックアップ一覧を取得
 *
 * GET /api/drive/backup
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

    const drive = getDriveClient(accessToken, refreshToken);

    // バックアップフォルダを取得
    const backupFolderId = await getOrCreateBackupFolder(drive);

    // ファイル一覧を取得
    const response = await drive.files.list({
      q: `'${backupFolderId}' in parents and trashed=false`,
      spaces: "drive",
      fields: "files(id, name, createdTime, webViewLink)",
      orderBy: "createdTime desc",
      pageSize: 50,
    });

    const backups = (response.data.files || []).map((file) => ({
      id: file.id,
      name: file.name,
      createdTime: file.createdTime,
      webViewLink: file.webViewLink,
    }));

    return NextResponse.json({ backups, backupFolderId });
  } catch (error) {
    console.error("バックアップ一覧取得エラー:", error);

    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        { error: "認証が期限切れです。再接続してください。", needsAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "バックアップ一覧の取得に失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
