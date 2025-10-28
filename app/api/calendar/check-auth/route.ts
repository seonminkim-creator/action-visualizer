import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const googleToken = request.cookies.get("google_access_token")?.value;
  const microsoftToken = request.cookies.get("microsoft_access_token")?.value;

  // どちらかのトークンがあれば認証済みとする
  const authenticated = !!(googleToken || microsoftToken);

  // 両方のプロバイダーの状態を返す
  const providers = {
    google: !!googleToken,
    microsoft: !!microsoftToken
  };

  console.log("🔍 認証状態チェック:", {
    googleToken: !!googleToken,
    microsoftToken: !!microsoftToken,
    authenticated,
  });

  return NextResponse.json({
    authenticated,
    providers,
    // 後方互換性のため、どちらか1つを返す（優先順位: google > microsoft）
    provider: googleToken ? "google" : microsoftToken ? "microsoft" : null
  });
}
