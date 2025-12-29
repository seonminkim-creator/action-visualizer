import { NextRequest, NextResponse } from "next/server";

/**
 * パスワード検証 API
 * POST /api/auth/verify
 */
export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();

        // 環境変数から期待されるパスワードを取得（未設定の場合はデフォルト 6501）
        const EXPECTED_PASSWORD = process.env.ACCESS_PASSWORD || "6501";

        if (password === EXPECTED_PASSWORD) {
            // 成功時、クッキーまたは何らかのレスポンスを返す
            // ここでは簡易的に成功ステータスのみ
            return NextResponse.json({ success: true, message: "認証に成功しました" });
        }

        return NextResponse.json(
            { success: false, error: "パスワードが正しくありません" },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
