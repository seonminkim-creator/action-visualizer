import { NextRequest, NextResponse } from "next/server";
import {
  getDriveClient,
  getOrCreateRootFolder,
  getOrCreateMeetingFolder,
  uploadFile,
  createOAuth2Client,
} from "@/lib/utils/google-drive";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

export const runtime = "nodejs";
export const maxDuration = 300; // 5分タイムアウト

// Word文書を生成する関数
async function generateWordDocument(
  title: string,
  metadata: {
    summary?: {
      purpose?: string;
      discussions?: string[];
      decisions?: string[];
    };
    todos?: Array<{
      task: string;
      assignee: string;
      deadline?: string;
      priority: "high" | "medium" | "low";
    }>;
    createdAt?: string;
  },
  minutes: string
): Promise<Buffer> {
  const priorityLabel = { high: "高", medium: "中", low: "低" };
  const createdDate = metadata.createdAt
    ? new Date(metadata.createdAt).toLocaleString("ja-JP")
    : new Date().toLocaleString("ja-JP");

  const children: Paragraph[] = [];

  // タイトル
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // 作成日時
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `作成日時: ${createdDate}`,
          size: 20,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 400 },
    })
  );

  // 会議の目的
  if (metadata.summary?.purpose) {
    children.push(
      new Paragraph({
        text: "会議の目的",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        },
      })
    );
    children.push(
      new Paragraph({
        text: metadata.summary.purpose,
        spacing: { after: 200 },
      })
    );
  }

  // 主な議論内容
  if (metadata.summary?.discussions && metadata.summary.discussions.length > 0) {
    children.push(
      new Paragraph({
        text: "主な議論内容",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        },
      })
    );
    for (const discussion of metadata.summary.discussions) {
      children.push(
        new Paragraph({
          text: `• ${discussion.replace(/^・/, "")}`,
          spacing: { after: 100 },
          indent: { left: 400 },
        })
      );
    }
  }

  // 決定事項
  if (metadata.summary?.decisions && metadata.summary.decisions.length > 0) {
    children.push(
      new Paragraph({
        text: "決定事項",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        },
      })
    );
    for (const decision of metadata.summary.decisions) {
      children.push(
        new Paragraph({
          text: `• ${decision.replace(/^・/, "")}`,
          spacing: { after: 100 },
          indent: { left: 400 },
        })
      );
    }
  }

  // TODOリスト
  if (metadata.todos && metadata.todos.length > 0) {
    children.push(
      new Paragraph({
        text: "TODOリスト",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        },
      })
    );
    for (const todo of metadata.todos) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${priorityLabel[todo.priority]}] `,
              bold: true,
              color: todo.priority === "high" ? "DC2626" : todo.priority === "medium" ? "D97706" : "2563EB",
            }),
            new TextRun({
              text: `[${todo.assignee}] `,
              color: "666666",
            }),
            new TextRun({
              text: todo.deadline ? `[${todo.deadline}] ` : "",
              color: "D97706",
            }),
            new TextRun({
              text: todo.task,
            }),
          ],
          spacing: { after: 100 },
          indent: { left: 400 },
        })
      );
    }
  }

  // 詳細議事録
  if (minutes) {
    children.push(
      new Paragraph({
        text: "詳細議事録",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        },
      })
    );
    // Markdownを簡易的にパース
    const lines = minutes.split("\n");
    for (const line of lines) {
      if (line.startsWith("# ")) {
        children.push(
          new Paragraph({
            text: line.replace("# ", ""),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (line.startsWith("## ")) {
        children.push(
          new Paragraph({
            text: line.replace("## ", ""),
            heading: HeadingLevel.HEADING_4,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (line.startsWith("### ")) {
        children.push(
          new Paragraph({
            text: line.replace("### ", ""),
            heading: HeadingLevel.HEADING_5,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (line.startsWith("#### ")) {
        children.push(
          new Paragraph({
            text: line.replace("#### ", ""),
            heading: HeadingLevel.HEADING_6,
            spacing: { before: 150, after: 80 },
          })
        );
      } else if (line.startsWith("■ ")) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.replace("■ ", ""),
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("・")) {
        children.push(
          new Paragraph({
            text: `• ${line.replace(/^(- |\* |・)/, "")}`,
            indent: { left: 400 },
            spacing: { after: 50 },
          })
        );
      } else if (line.trim()) {
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 50 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * 会議データをGoogle Driveにアップロード
 *
 * POST /api/drive/upload
 * Body: FormData with:
 *   - title: 会議タイトル
 *   - audio: 音声ファイル (optional)
 *   - transcript: 文字起こしテキスト (optional)
 *   - minutes: 議事録JSON (optional)
 *   - metadata: メタデータJSON (optional)
 */
export async function POST(req: NextRequest) {
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

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const audioFile = formData.get("audio") as Blob | null;
    const audioFileId = formData.get("audioFileId") as string | null;
    const transcript = formData.get("transcript") as string | null;
    const minutes = formData.get("minutes") as string | null;
    const metadata = formData.get("metadata") as string | null;

    if (!title) {
      return NextResponse.json(
        { error: "タイトルは必須です" },
        { status: 400 }
      );
    }

    console.log(`📤 Google Driveアップロード開始: ${title}`);

    // Driveクライアント作成
    const drive = getDriveClient(accessToken!, refreshToken);

    // ルートフォルダを取得/作成
    const rootFolderId = await getOrCreateRootFolder(drive);

    // 会議フォルダを取得または作成（既存があれば更新）
    const { folderId: meetingFolderId, isNew } = await getOrCreateMeetingFolder(drive, rootFolderId, title);

    const uploadedFiles: {
      audio?: { id: string; webViewLink: string };
      transcript?: { id: string; webViewLink: string };
      minutes?: { id: string; webViewLink: string };
      minutesDocx?: { id: string; webViewLink: string };
      metadata?: { id: string; webViewLink: string };
    } = {};

    // 音声ファイルの処理
    if (audioFileId) {
      // すでにDriveにあるファイルを会議フォルダに移動
      try {
        const file = await drive.files.get({ fileId: audioFileId, fields: "parents" });
        const previousParents = file.data.parents?.join(",") || "";
        
        await drive.files.update({
          fileId: audioFileId,
          addParents: meetingFolderId,
          removeParents: previousParents,
          fields: "id, webViewLink",
        });

        // ファイル名を統一（任意）
        await drive.files.update({
          fileId: audioFileId,
          requestBody: { name: "recording.webm" }
        });

        const updatedFile = await drive.files.get({ fileId: audioFileId, fields: "id, webViewLink" });
        uploadedFiles.audio = { id: updatedFile.data.id!, webViewLink: updatedFile.data.webViewLink || "" };
        console.log(`✅ 既存の音声ファイルを会議フォルダに移動しました: ${audioFileId}`);
      } catch (moveError) {
        console.error("音声ファイルの移動に失敗:", moveError);
      }
    } else if (audioFile && audioFile.size > 0) {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      // ファイルタイプから拡張子とMIMEタイプを決定
      const mimeType = audioFile.type || "audio/webm";
      let extension = "webm";
      if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
        extension = "mp3";
      } else if (mimeType.includes("wav")) {
        extension = "wav";
      } else if (mimeType.includes("m4a") || mimeType.includes("mp4")) {
        extension = "m4a";
      } else if (mimeType.includes("webm")) {
        extension = "webm";
      }
      const audioResult = await uploadFile(
        drive,
        meetingFolderId,
        `recording.${extension}`,
        mimeType,
        audioBuffer
      );
      uploadedFiles.audio = audioResult;
      console.log(`✅ 音声ファイルをアップロード: ${audioResult.id}`);
    }

    // 文字起こしをアップロード
    if (transcript) {
      const transcriptResult = await uploadFile(
        drive,
        meetingFolderId,
        "transcript.txt",
        "text/plain",
        transcript
      );
      uploadedFiles.transcript = transcriptResult;
      console.log(`✅ 文字起こしをアップロード: ${transcriptResult.id}`);
    }

    // 議事録をアップロード（Markdown形式）
    if (minutes) {
      const minutesResult = await uploadFile(
        drive,
        meetingFolderId,
        "minutes.md",
        "text/markdown",
        minutes
      );
      uploadedFiles.minutes = minutesResult;
      console.log(`✅ 議事録（Markdown）をアップロード: ${minutesResult.id}`);
    }

    // メタデータをアップロード
    if (metadata) {
      const metadataResult = await uploadFile(
        drive,
        meetingFolderId,
        "metadata.json",
        "application/json",
        metadata
      );
      uploadedFiles.metadata = metadataResult;
      console.log(`✅ メタデータをアップロード: ${metadataResult.id}`);

      // Word形式の議事録を生成してアップロード
      try {
        const metadataObj = JSON.parse(metadata);
        const wordBuffer = await generateWordDocument(title, metadataObj, minutes || "");
        const docxResult = await uploadFile(
          drive,
          meetingFolderId,
          `${title}_議事録.docx`,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          wordBuffer
        );
        uploadedFiles.minutesDocx = docxResult;
        console.log(`✅ 議事録（Word）をアップロード: ${docxResult.id}`);
      } catch (docxError) {
        console.error("Word文書生成エラー:", docxError);
        // Word生成に失敗しても続行
      }
    }

    console.log(`✅ Google Drive${isNew ? "新規保存" : "更新"}完了: ${title}`);

    const response = NextResponse.json({
      isNew,
      success: true,
      folderId: meetingFolderId,
      files: uploadedFiles,
    });

    // 新しいアクセストークンがある場合、クッキーを更新
    if (newAccessToken) {
      response.cookies.set("google_drive_access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60, // 1時間
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Google Driveアップロードエラー:", error);

    // トークン期限切れの場合
    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        { error: "認証が期限切れです。再接続してください。", needsAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "アップロードに失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
