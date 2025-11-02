import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const validUsername = process.env.ADMIN_USERNAME || 'peco_admin';
    const validPassword = process.env.ADMIN_PASSWORD || 'peco2024!secure';

    if (username === validUsername && password === validPassword) {
      // 認証成功 - セッショントークンを生成
      const token = Buffer.from(`${username}:${password}`).toString('base64');

      return NextResponse.json({
        success: true,
        token
      });
    }

    return NextResponse.json(
      { success: false, error: 'ユーザー名またはパスワードが正しくありません' },
      { status: 401 }
    );
  } catch (error) {
    console.error('認証エラー:', error);
    return NextResponse.json(
      { success: false, error: '認証に失敗しました' },
      { status: 500 }
    );
  }
}
