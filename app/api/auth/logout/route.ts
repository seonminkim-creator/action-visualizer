import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // クッキーを削除
  response.cookies.set("google_access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("google_refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  return response;
}
