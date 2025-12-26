import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, getFileContent } from "@/lib/utils/google-drive";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 会議のカテゴリーを更新
 *
 * POST /api/drive/update-category
 * Body: { folderId, metadataFileId, category }
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

    const { metadataFileId, category } = await req.json();

    if (!metadataFileId) {
      return NextResponse.json(
        { error: "metadataFileIdは必須です" },
        { status: 400 }
      );
    }

    const drive = getDriveClient(accessToken, refreshToken);

    // 現在のメタデータを取得
    const currentContent = await getFileContent(drive, metadataFileId);
    let metadata: Record<string, unknown> = {};

    try {
      metadata = JSON.parse(currentContent);
    } catch {
      // パースに失敗した場合は空のオブジェクトを使用
      metadata = {};
    }

    // カテゴリーを更新
    if (category) {
      metadata.category = category;
    } else {
      delete metadata.category;
    }

    // メタデータを更新
    const updatedContent = JSON.stringify(metadata, null, 2);

    await drive.files.update({
      fileId: metadataFileId,
      media: {
        mimeType: "application/json",
        body: require("stream").Readable.from(Buffer.from(updatedContent, "utf-8")),
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("カテゴリー更新エラー:", error);

    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        { error: "認証が期限切れです。再接続してください。", needsAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "カテゴリーの更新に失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
