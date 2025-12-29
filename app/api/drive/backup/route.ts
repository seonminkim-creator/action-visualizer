import { NextRequest, NextResponse } from "next/server";
import {
  getDriveClient,
  getOrCreateBackupFolder,
  uploadBackupFile,
  uploadFile,
} from "@/lib/utils/google-drive";

export const runtime = "nodejs";
export const maxDuration = 300; // 5分（複数ファイル対応）

/**
 * バックアップファイルをGoogle Driveにアップロード
 *
 * POST /api/drive/backup
 * Body:
 *   - 単一ファイル: { fileName, content }
 *   - 複数ファイル: { files: [{ fileName, content, path? }], folderName? }
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

    const body = await req.json();
    const drive = getDriveClient(accessToken, refreshToken);

    // バックアップフォルダを取得/作成
    const backupFolderId = await getOrCreateBackupFolder(drive);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // 複数ファイルモード
    if (body.files && Array.isArray(body.files)) {
      const folderName = body.folderName || `backup_${timestamp}`;

      // サブフォルダを作成
      const subFolder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [backupFolderId],
        },
        fields: "id, webViewLink",
      });
      const subFolderId = subFolder.data.id!;

      console.log(`📦 バックアップフォルダ作成: ${folderName}`);

      const uploadedFiles: Array<{ fileName: string; id: string; webViewLink: string }> = [];

      for (const file of body.files) {
        if (!file.fileName || !file.content) continue;

        // パスが含まれている場合はファイル名のみ使用
        const cleanFileName = file.path
          ? file.path.replace(/\//g, "_")
          : file.fileName;

        const result = await uploadFile(
          drive,
          subFolderId,
          cleanFileName,
          "text/plain",
          file.content
        );

        uploadedFiles.push({
          fileName: cleanFileName,
          id: result.id,
          webViewLink: result.webViewLink,
        });

        console.log(`  ✅ ${cleanFileName}`);
      }

      console.log(`✅ バックアップ完了: ${uploadedFiles.length}ファイル`);

      return NextResponse.json({
        success: true,
        folderId: subFolderId,
        folderName,
        webViewLink: subFolder.data.webViewLink,
        files: uploadedFiles,
        totalFiles: uploadedFiles.length,
      });
    }

    // 単一ファイルモード（後方互換性）
    const { fileName, content } = body;

    if (!fileName || !content) {
      return NextResponse.json(
        { error: "fileName と content は必須です" },
        { status: 400 }
      );
    }

    console.log(`📦 バックアップアップロード開始: ${fileName}`);

    const backupFileName = `${timestamp}_${fileName}`;
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
