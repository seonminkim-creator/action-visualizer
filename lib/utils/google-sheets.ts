import { google } from "googleapis";

/**
 * Google Sheets へのログ出力ユーティリティ
 */

export interface LogRow {
    timestamp: string;
    userId: string;
    action: string;
    status: string;
    processingTime?: number;
    characterCount?: number;
    errorMessage?: string;
    rating?: string;
    comment?: string;
    userAgent?: string;
}

/**
 * Google Sheets に行を追加
 */
export async function appendToGlobalSheet(row: LogRow) {
    const spreadsheetId = process.env.GOOGLE_LOG_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    // 改行コードの処理
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");

    if (!spreadsheetId || !clientEmail || !privateKey) {
        // 未設定の場合はローカルログ（console）のみ出力
        console.log("ℹ️ Google Sheets Configuration missing. Log entry:", JSON.stringify(row));
        return;
    }

    try {
        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "Sheet1!A:J",
            valueInputOption: "RAW",
            requestBody: {
                values: [[
                    row.timestamp,
                    row.userId,
                    row.action,
                    row.status,
                    row.processingTime || 0,
                    row.characterCount || 0,
                    row.rating || "",
                    row.comment || "",
                    row.errorMessage || "",
                    row.userAgent || ""
                ]]
            }
        });

        console.log("✅ Log successfully sent to Google Sheets");
    } catch (error) {
        console.error("❌ Failed to append log to Google Sheets:", error);
    }
}
