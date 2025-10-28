import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const googleToken = request.cookies.get("google_access_token")?.value;
  const microsoftToken = request.cookies.get("microsoft_access_token")?.value;

  // どちらかのトークンがあれば認証済みとする
  const authenticated = !!(googleToken || microsoftToken);

  // どのプロバイダーで認証されているかも返す
  const provider = googleToken ? "google" : microsoftToken ? "microsoft" : null;

  return NextResponse.json({
    authenticated,
    provider
  });
}
