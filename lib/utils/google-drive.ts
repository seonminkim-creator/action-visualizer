import { google, drive_v3 } from "googleapis";

/**
 * Google Drive ユーティリティ
 * 会議まとめくん用のファイル管理
 */

// 会議まとめくんのルートフォルダ名
const ROOT_FOLDER_NAME = "会議まとめくん";

/**
 * OAuth2クライアントを作成
 */
export function createOAuth2Client(accessToken: string, refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Driveクライアントを取得
 */
export function getDriveClient(accessToken: string, refreshToken?: string): drive_v3.Drive {
  const auth = createOAuth2Client(accessToken, refreshToken);
  return google.drive({ version: "v3", auth });
}

/**
 * ルートフォルダを取得または作成
 */
export async function getOrCreateRootFolder(drive: drive_v3.Drive): Promise<string> {
  // 既存のフォルダを検索
  const response = await drive.files.list({
    q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: "drive",
    fields: "files(id, name)",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // フォルダを作成
  const folder = await drive.files.create({
    requestBody: {
      name: ROOT_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  console.log(`📁 Google Driveにルートフォルダを作成: ${ROOT_FOLDER_NAME}`);
  return folder.data.id!;
}

/**
 * 会議フォルダを作成（日付_タイトル形式）
 */
export async function createMeetingFolder(
  drive: drive_v3.Drive,
  parentFolderId: string,
  title: string,
  date: Date = new Date()
): Promise<string> {
  // YYYY-MM-DD形式の日付
  const dateStr = date.toISOString().split("T")[0];
  const folderName = `${dateStr}_${title}`;

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  console.log(`📁 会議フォルダを作成: ${folderName}`);
  return folder.data.id!;
}

/**
 * ファイルをアップロード（新規作成または更新）
 */
export async function uploadFile(
  drive: drive_v3.Drive,
  folderId: string,
  fileName: string,
  mimeType: string,
  content: Buffer | string
): Promise<{ id: string; webViewLink: string }> {
  const bufferContent = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

  // 既存のファイルを検索
  const existingFiles = await drive.files.list({
    q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
    spaces: "drive",
    fields: "files(id)",
  });

  if (existingFiles.data.files && existingFiles.data.files.length > 0) {
    // 既存ファイルを更新
    const existingFileId = existingFiles.data.files[0].id!;
    const file = await drive.files.update({
      fileId: existingFileId,
      media: {
        mimeType,
        body: require("stream").Readable.from(bufferContent),
      },
      fields: "id, webViewLink",
    });

    console.log(`📝 ファイルを更新: ${fileName}`);
    return {
      id: file.data.id!,
      webViewLink: file.data.webViewLink || "",
    };
  }

  // 新規作成
  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: require("stream").Readable.from(bufferContent),
    },
    fields: "id, webViewLink",
  });

  console.log(`📤 ファイルをアップロード: ${fileName}`);
  return {
    id: file.data.id!,
    webViewLink: file.data.webViewLink || "",
  };
}

/**
 * 既存の会議フォルダを検索
 */
export async function findMeetingFolder(
  drive: drive_v3.Drive,
  parentFolderId: string,
  title: string,
  date: Date = new Date()
): Promise<string | null> {
  const dateStr = date.toISOString().split("T")[0];
  const folderName = `${dateStr}_${title}`;

  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: "drive",
    fields: "files(id)",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  return null;
}

/**
 * 会議フォルダを取得または作成
 */
export async function getOrCreateMeetingFolder(
  drive: drive_v3.Drive,
  parentFolderId: string,
  title: string,
  date: Date = new Date()
): Promise<{ folderId: string; isNew: boolean }> {
  // 既存フォルダを検索
  const existingFolderId = await findMeetingFolder(drive, parentFolderId, title, date);

  if (existingFolderId) {
    console.log(`📂 既存の会議フォルダを使用: ${title}`);
    return { folderId: existingFolderId, isNew: false };
  }

  // 新規作成
  const folderId = await createMeetingFolder(drive, parentFolderId, title, date);
  return { folderId, isNew: true };
}

/**
 * 会議フォルダ一覧を取得
 */
export async function listMeetingFolders(
  drive: drive_v3.Drive,
  rootFolderId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  name: string;
  createdTime: string;
}>> {
  const response = await drive.files.list({
    q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: "drive",
    fields: "files(id, name, createdTime)",
    orderBy: "createdTime desc",
    pageSize: limit,
  });

  return (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    createdTime: file.createdTime!,
  }));
}

/**
 * フォルダ内のファイル一覧を取得
 */
export async function listFilesInFolder(
  drive: drive_v3.Drive,
  folderId: string
): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  size: string;
}>> {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    spaces: "drive",
    fields: "files(id, name, mimeType, webViewLink, size)",
  });

  return (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    webViewLink: file.webViewLink || "",
    size: file.size || "0",
  }));
}

/**
 * ファイルの内容を取得
 */
export async function getFileContent(
  drive: drive_v3.Drive,
  fileId: string
): Promise<string> {
  const response = await drive.files.get({
    fileId,
    alt: "media",
  }, {
    responseType: "text",
  });

  // response.dataが文字列でない場合はJSON.stringifyで変換
  if (typeof response.data === "string") {
    return response.data;
  }
  return JSON.stringify(response.data);
}

/**
 * 会議データ型
 */
export type MeetingData = {
  id: string;
  folderName: string;
  date: string;
  title: string;
  folderId: string;
  summary?: string; // 1行サマリー（会議の目的）
  category?: string; // カテゴリ（分類）
  // ファイル内容（読み込み時に取得）
  transcript?: string;
  minutes?: string;
  metadata?: {
    category?: string;
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
  };
  files: {
    audio?: { id: string; name: string; webViewLink: string };
    transcript?: { id: string; name: string; webViewLink: string };
    minutes?: { id: string; name: string; webViewLink: string };
    metadata?: { id: string; name: string; webViewLink: string };
  };
};

/**
 * フォルダ名から日付とタイトルを抽出
 */
export function parseFolderName(folderName: string): { date: string; title: string } {
  const match = folderName.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (match) {
    return { date: match[1], title: match[2] };
  }
  return { date: "", title: folderName };
}

/**
 * 会議データを取得（フォルダ内のファイル情報を含む）
 * loadContent: trueの場合、ファイル内容も読み込む
 */
export async function getMeetingData(
  drive: drive_v3.Drive,
  folderId: string,
  folderName: string,
  loadContent: boolean = false
): Promise<MeetingData> {
  const files = await listFilesInFolder(drive, folderId);
  const { date, title } = parseFolderName(folderName);

  const meetingData: MeetingData = {
    id: folderId,
    folderName,
    date,
    title,
    folderId,
    files: {},
  };

  let metadataFileId: string | null = null;
  let transcriptFileId: string | null = null;
  let minutesFileId: string | null = null;

  for (const file of files) {
    if (file.name.endsWith(".webm") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".m4a")) {
      meetingData.files.audio = { id: file.id, name: file.name, webViewLink: file.webViewLink };
    } else if (file.name === "transcript.txt") {
      meetingData.files.transcript = { id: file.id, name: file.name, webViewLink: file.webViewLink };
      transcriptFileId = file.id;
    } else if (file.name === "minutes.md") {
      meetingData.files.minutes = { id: file.id, name: file.name, webViewLink: file.webViewLink };
      minutesFileId = file.id;
    } else if (file.name === "metadata.json") {
      meetingData.files.metadata = { id: file.id, name: file.name, webViewLink: file.webViewLink };
      metadataFileId = file.id;
    }
  }

  // メタデータを取得
  if (metadataFileId) {
    try {
      const metadataContent = await getFileContent(drive, metadataFileId);
      const metadata = JSON.parse(metadataContent);

      // 詳細読み込みモードの場合、全メタデータを保存
      if (loadContent) {
        meetingData.metadata = metadata;
      }

      // サマリーとカテゴリは常に設定
      if (metadata.summary?.purpose) {
        meetingData.summary = metadata.summary.purpose;
      }
      if (metadata.category) {
        meetingData.category = metadata.category;
      }
    } catch (err) {
      console.warn(`メタデータの読み込みに失敗: ${folderName}`, err);
    }
  }

  // 詳細読み込みモードの場合、transcript と minutes も読み込む
  if (loadContent) {
    if (transcriptFileId) {
      try {
        meetingData.transcript = await getFileContent(drive, transcriptFileId);
      } catch (err) {
        console.warn(`トランスクリプトの読み込みに失敗: ${folderName}`, err);
      }
    }
    if (minutesFileId) {
      try {
        meetingData.minutes = await getFileContent(drive, minutesFileId);
      } catch (err) {
        console.warn(`議事録の読み込みに失敗: ${folderName}`, err);
      }
    }
  }

  return meetingData;
}
