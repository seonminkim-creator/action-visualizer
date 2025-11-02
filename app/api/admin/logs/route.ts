import { NextRequest, NextResponse } from "next/server";
import { getAllLogs, getLogsByDateRange } from "@/lib/utils/logger";

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
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    let logs = startDate && endDate
      ? getLogsByDateRange(new Date(startDate), new Date(endDate))
      : getAllLogs();

    // 最新順にソート
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 件数制限
    logs = logs.slice(0, limit);

    return NextResponse.json({ logs, total: logs.length });
  } catch (error) {
    console.error('ログ取得エラー:', error);
    return NextResponse.json(
      { error: 'ログの取得に失敗しました' },
      { status: 500 }
    );
  }
}
