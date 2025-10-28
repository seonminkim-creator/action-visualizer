import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    message: "Debug endpoint working",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasMicrosoftClientId: !!process.env.MICROSOFT_CLIENT_ID,
      hasMicrosoftClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
    },
  });
}
