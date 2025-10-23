import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { DaySlots, Slot } from "@/app/types/calendar";
import JapaneseHolidays from "japanese-holidays";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
);

// 日付範囲を計算
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  let end = new Date(now);

  switch (period) {
    case "this_week":
      // 今週の月曜日から日曜日
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(diff + 6);
      break;
    case "next_week":
      // 来週の月曜日から日曜日
      const nextWeekDay = start.getDay();
      const nextWeekDiff = start.getDate() - nextWeekDay + (nextWeekDay === 0 ? -6 : 1) + 7;
      start.setDate(nextWeekDiff);
      end.setDate(nextWeekDiff + 6);
      break;
    case "next_next_week":
      // 再来週の月曜日から日曜日
      const nextNextWeekDay = start.getDay();
      const nextNextWeekDiff = start.getDate() - nextNextWeekDay + (nextNextWeekDay === 0 ? -6 : 1) + 14;
      start.setDate(nextNextWeekDiff);
      end.setDate(nextNextWeekDiff + 6);
      break;
    case "next_month":
      // 1ヶ月後の同じ週
      start.setMonth(start.getMonth() + 1);
      end.setMonth(end.getMonth() + 1);
      const monthDay = start.getDay();
      const monthDiff = start.getDate() - monthDay + (monthDay === 0 ? -6 : 1);
      start.setDate(monthDiff);
      end.setDate(monthDiff + 6);
      break;
  }

  // 日本時間の0時と23:59をUTCに変換
  // JST 00:00 = UTC 前日 15:00
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // JSTからUTCに変換（-9時間）
  const startUTC = new Date(start.getTime() - 9 * 60 * 60 * 1000);
  const endUTC = new Date(end.getTime() - 9 * 60 * 60 * 1000);

  return { start: startUTC, end: endUTC };
}

// Busy時間からFree時間を計算
function convertBusyToFree(busySlots: { start: string; end: string }[], date: Date, durationMin: number): Slot[] {
  const freeSlots: Slot[] = [];
  const workStart = 9; // 9:00
  const workEnd = 18; // 18:00

  // Busy時間をソート
  const sortedBusy = busySlots.sort((a, b) => {
    const aTime = new Date(a.start).getTime();
    const bTime = new Date(b.start).getTime();
    return aTime - bTime;
  });

  let currentTime = workStart * 60; // 分単位

  sortedBusy.forEach(busy => {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);

    // 日本時間（JST = UTC+9）に変換
    const busyStartJST = new Date(busyStart.getTime() + 9 * 60 * 60 * 1000);
    const busyEndJST = new Date(busyEnd.getTime() + 9 * 60 * 60 * 1000);

    const busyStartMin = busyStartJST.getUTCHours() * 60 + busyStartJST.getUTCMinutes();
    const busyEndMin = busyEndJST.getUTCHours() * 60 + busyEndJST.getUTCMinutes();

    // 現在時刻からBusy開始までの空き時間
    if (currentTime < busyStartMin) {
      const duration = busyStartMin - currentTime;
      if (duration >= durationMin) {
        freeSlots.push({
          start: `${String(Math.floor(currentTime / 60)).padStart(2, "0")}:${String(currentTime % 60).padStart(2, "0")}`,
          end: `${String(Math.floor(busyStartMin / 60)).padStart(2, "0")}:${String(busyStartMin % 60).padStart(2, "0")}`,
        });
      }
    }

    currentTime = Math.max(currentTime, busyEndMin);
  });

  // 最後のBusyから終業時刻までの空き時間
  const workEndMin = workEnd * 60;
  if (currentTime < workEndMin) {
    const duration = workEndMin - currentTime;
    if (duration >= durationMin) {
      freeSlots.push({
        start: `${String(Math.floor(currentTime / 60)).padStart(2, "0")}:${String(currentTime % 60).padStart(2, "0")}`,
        end: `${String(Math.floor(workEndMin / 60)).padStart(2, "0")}:${String(workEndMin % 60).padStart(2, "0")}`,
      });
    }
  }

  return freeSlots;
}

// 曜日を取得
function getWeekday(date: Date): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  // JST基準で曜日を取得（UTC+9時間）
  const dateJST = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return weekdays[dateJST.getUTCDay()];
}

export async function POST(request: NextRequest) {
  try {
    const { period, durationMin = 60 } = await request.json();

    // クッキーからトークンを取得
    const accessToken = request.cookies.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // 日付範囲を取得
    const { start, end } = getDateRange(period);

    // freeBusy APIを呼び出し
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busySlots = response.data.calendars?.primary?.busy || [];

    // 日ごとにFree時間を計算
    const days: DaySlots[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      // UTC日付をJSTに変換
      const dateJST = new Date(currentDate.getTime() + 9 * 60 * 60 * 1000);
      const dateStr = dateJST.toISOString().split("T")[0]; // JST基準の日付文字列
      const dayOfWeek = dateJST.getUTCDay(); // JST基準の曜日

      // 日本の祝日をチェック（JST基準の日付を使用）
      const [year, month, day] = dateStr.split("-").map(Number);
      const checkDate = new Date(year, month - 1, day);
      const isHoliday = JapaneseHolidays.isHoliday(checkDate);

      console.log(`${dateStr}: dayOfWeek=${dayOfWeek}, isHoliday=${isHoliday}, skip=${dayOfWeek === 0 || dayOfWeek === 6 || isHoliday}`);

      // 土日と祝日をスキップ
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {

        // その日のBusy時間を抽出（日本時間ベースで日付比較）
        const dayBusy = busySlots.filter(busy => {
          const busyStart = new Date(busy.start!);
          const busyStartJST = new Date(busyStart.getTime() + 9 * 60 * 60 * 1000);
          const busyDateStr = busyStartJST.toISOString().split("T")[0];
          return busyDateStr === dateStr;
        });

        // Free時間を計算
        const freeSlots = convertBusyToFree(
          dayBusy.map(b => ({ start: b.start!, end: b.end! })),
          currentDate,
          durationMin
        );

        days.push({
          date: dateStr,
          weekday: getWeekday(currentDate),
          slots: freeSlots,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({ days });
  } catch (error: any) {
    console.error("Calendar API error:", error);

    if (error.code === 401) {
      return NextResponse.json({ error: "Token expired", needsReauth: true }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch calendar data", details: error.message },
      { status: 500 }
    );
  }
}
