// ログ保存ユーティリティ（ファイルベース）
import fs from 'fs';
import path from 'path';
import { UsageLog } from '../types/admin';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'usage.jsonl');

// ログディレクトリを作成
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// ログを追加
export function appendLog(log: UsageLog) {
  try {
    ensureLogDir();
    const logLine = JSON.stringify(log) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf-8');
  } catch (error) {
    console.error('ログ保存エラー:', error);
  }
}

// 全ログを取得
export function getAllLogs(): UsageLog[] {
  try {
    ensureLogDir();
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line);
    return lines.map(line => JSON.parse(line) as UsageLog);
  } catch (error) {
    console.error('ログ読み込みエラー:', error);
    return [];
  }
}

// 期間を指定してログを取得
export function getLogsByDateRange(startDate: Date, endDate: Date): UsageLog[] {
  const allLogs = getAllLogs();
  return allLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= endDate;
  });
}

// ユーザーIDを生成（IPアドレスまたはセッションID）
export function generateUserId(request: Request): string {
  // Vercelの場合、x-forwarded-for ヘッダーからIPアドレスを取得
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

  // IPアドレスの一部をハッシュ化（プライバシー保護）
  const hash = Buffer.from(ip).toString('base64').substring(0, 8);
  return `user_${hash}`;
}
