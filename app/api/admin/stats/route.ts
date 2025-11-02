import { NextRequest, NextResponse } from "next/server";
import { getAllLogs } from "@/lib/utils/logger";
import { UsageStats, DailyStats } from "@/lib/types/admin";

export const runtime = "nodejs";

// 認証チェック
function checkAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') return false;

  const decoded = Buffer.from(credentials, 'base64').toString();
  const [username, password] = decoded.split(':');

  const validUsername = process.env.ADMIN_USERNAME || 'admin';
  const validPassword = process.env.ADMIN_PASSWORD || 'password';

  return username === validUsername && password === validPassword;
}

export async function GET(req: NextRequest) {
  // 認証チェック
  if (!checkAuth(req)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Area"',
      },
    });
  }

  try {
    const logs = getAllLogs();

    // 統計計算
    const uniqueUsers = new Set(logs.map(log => log.userId)).size;
    const transcriptions = logs.filter(log => log.action === 'transcribe');
    const summaries = logs.filter(log => log.action === 'meeting-summary');
    const errors = logs.filter(log => log.status === 'error');

    const totalProcessingTime = logs.reduce((sum, log) => sum + log.processingTime, 0);
    const avgProcessingTime = logs.length > 0 ? totalProcessingTime / logs.length : 0;

    const stats: UsageStats = {
      totalUsers: uniqueUsers,
      totalTranscriptions: transcriptions.length,
      totalMeetingSummaries: summaries.length,
      totalErrors: errors.length,
      averageProcessingTime: Math.round(avgProcessingTime),
      apiCallCount: logs.length,
    };

    // 日次統計（過去7日間）
    const dailyStats: DailyStats[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= date && logDate < nextDate;
      });

      const uniqueDailyUsers = new Set(dayLogs.map(log => log.userId)).size;

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        transcriptions: dayLogs.filter(log => log.action === 'transcribe').length,
        meetingSummaries: dayLogs.filter(log => log.action === 'meeting-summary').length,
        errors: dayLogs.filter(log => log.status === 'error').length,
        uniqueUsers: uniqueDailyUsers,
      });
    }

    return NextResponse.json({ stats, dailyStats });
  } catch (error) {
    console.error('統計取得エラー:', error);
    return NextResponse.json(
      { error: '統計の取得に失敗しました' },
      { status: 500 }
    );
  }
}
