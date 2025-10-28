import { NextRequest, NextResponse } from "next/server";
import { DaySlots, Slot } from "@/app/types/calendar";
import JapaneseHolidays from "japanese-holidays";

// 日付範囲を計算（Google Calendar APIと同じロジック）
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  let end = new Date(now);

  switch (period) {
    case "this_week":
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(diff + 6);
      break;
    case "next_week":
      const nextWeekDay = start.getDay();
      const nextWeekDiff = start.getDate() - nextWeekDay + (nextWeekDay === 0 ? -6 : 1) + 7;
      start.setDate(nextWeekDiff);
      end.setDate(nextWeekDiff + 6);
      break;
    case "next_next_week":
      const nextNextWeekDay = start.getDay();
      const nextNextWeekDiff = start.getDate() - nextNextWeekDay + (nextNextWeekDay === 0 ? -6 : 1) + 14;
      start.setDate(nextNextWeekDiff);
      end.setDate(nextNextWeekDiff + 6);
      break;
    case "next_month":
      start.setMonth(start.getMonth() + 1);
      end.setMonth(end.getMonth() + 1);
      const monthDay = start.getDay();
      const monthDiff = start.getDate() - monthDay + (monthDay === 0 ? -6 : 1);
      start.setDate(monthDiff);
      end.setDate(monthDiff + 6);
      break;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // JSTからUTCに変換（-9時間）
  const startUTC = new Date(start.getTime() - 9 * 60 * 60 * 1000);
  const endUTC = new Date(end.getTime() - 9 * 60 * 60 * 1000);

  return { start: startUTC, end: endUTC };
}

// Busy時間からFree時間を計算（Google Calendar APIと同じロジック）
function convertBusyToFree(
  busySlots: { start: string; end: string }[],
  date: Date,
  durationMin: number,
  isToday: boolean,
  currentTimeMin: number
): Slot[] {
  const freeSlots: Slot[] = [];
  const workStart = 9; // 9:00
  const workEnd = 18; // 18:00

  const sortedBusy = busySlots.sort((a, b) => {
    const aTime = new Date(a.start).getTime();
    const bTime = new Date(b.start).getTime();
    return aTime - bTime;
  });

  let currentTime = isToday ? Math.max(workStart * 60, currentTimeMin) : workStart * 60;

  sortedBusy.forEach((busy) => {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);

    // 日本時間（JST = UTC+9）に変換
    const busyStartJST = new Date(busyStart.getTime() + 9 * 60 * 60 * 1000);
    const busyEndJST = new Date(busyEnd.getTime() + 9 * 60 * 60 * 1000);

    const busyStartMin = busyStartJST.getUTCHours() * 60 + busyStartJST.getUTCMinutes();
    const busyEndMin = busyEndJST.getUTCHours() * 60 + busyEndJST.getUTCMinutes();

    if (currentTime < busyStartMin) {
      const duration = busyStartMin - currentTime;
      if (duration >= durationMin) {
        freeSlots.push({
          start: `${String(Math.floor(currentTime / 60)).padStart(2, "0")}:${String(
            currentTime % 60
          ).padStart(2, "0")}`,
          end: `${String(Math.floor(busyStartMin / 60)).padStart(2, "0")}:${String(
            busyStartMin % 60
          ).padStart(2, "0")}`,
        });
      }
    }

    currentTime = Math.max(currentTime, busyEndMin);
  });

  const workEndMin = workEnd * 60;
  if (currentTime < workEndMin) {
    const duration = workEndMin - currentTime;
    if (duration >= durationMin) {
      freeSlots.push({
        start: `${String(Math.floor(currentTime / 60)).padStart(2, "0")}:${String(
          currentTime % 60
        ).padStart(2, "0")}`,
        end: `${String(Math.floor(workEndMin / 60)).padStart(2, "0")}:${String(
          workEndMin % 60
        ).padStart(2, "0")}`,
      });
    }
  }

  return freeSlots;
}

// 曜日を取得
function getWeekday(date: Date): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const dateJST = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return weekdays[dateJST.getUTCDay()];
}

export async function POST(request: NextRequest) {
  try {
    const { period, durationMin = 60, ignoreKeywords = [] } = await request.json();

    // クッキーからMicrosoft access tokenを取得
    const accessToken = request.cookies.get("microsoft_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 日付範囲を取得
    const { start, end } = getDateRange(period);

    // Microsoft Graph API: カレンダーイベント一覧を取得
    // https://learn.microsoft.com/en-us/graph/api/calendar-list-events
    const graphUrl = `https://graph.microsoft.com/v1.0/me/calendar/events?$filter=start/dateTime ge '${start.toISOString()}' and end/dateTime le '${end.toISOString()}'&$orderby=start/dateTime&$select=subject,start,end,showAs`;

    const eventsResponse = await fetch(graphUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.json();
      console.error("Microsoft Graph API error:", errorData);

      if (eventsResponse.status === 401) {
        return NextResponse.json({ error: "Token expired", needsReauth: true }, { status: 401 });
      }

      throw new Error(
        `Microsoft Graph API failed: ${errorData.error?.message || eventsResponse.statusText}`
      );
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.value || [];

    console.log(`📅 Microsoft Calendar: ${events.length}件のイベントを取得`);

    // 無視するキーワードを含まないイベントのみを抽出
    const busySlots = events
      .filter((event: any) => {
        const subject = event.subject || "";
        // ignoreKeywordsのいずれかを含む場合はスキップ
        return !ignoreKeywords.some((keyword: string) => subject.includes(keyword));
      })
      .map((event: any) => ({
        start: event.start?.dateTime || "",
        end: event.end?.dateTime || "",
      }))
      .filter((slot: any) => slot.start && slot.end);

    // 日ごとにFree時間を計算
    const days: DaySlots[] = [];
    const currentDate = new Date(start);

    // 今日の日付と時刻（JST）を取得
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = nowJST.toISOString().split("T")[0];
    const currentTimeMin = nowJST.getUTCHours() * 60 + nowJST.getUTCMinutes();

    while (currentDate <= end) {
      // UTC日付をJSTに変換
      const dateJST = new Date(currentDate.getTime() + 9 * 60 * 60 * 1000);
      const dateStr = dateJST.toISOString().split("T")[0];
      const dayOfWeek = dateJST.getUTCDay();

      // 今日より前の日付はスキップ
      if (dateStr < todayStr) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 日本の祝日をチェック
      const [year, month, day] = dateStr.split("-").map(Number);
      const checkDate = new Date(year, month - 1, day);
      const isHoliday = JapaneseHolidays.isHoliday(checkDate);

      // 土日はスキップ
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // その日のBusy時間を抽出
        const dayBusy = busySlots.filter((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyStartJST = new Date(busyStart.getTime() + 9 * 60 * 60 * 1000);
          const busyDateStr = busyStartJST.toISOString().split("T")[0];
          return busyDateStr === dateStr;
        });

        const isToday = dateStr === todayStr;

        // Free時間を計算
        const freeSlots = convertBusyToFree(dayBusy, currentDate, durationMin, isToday, currentTimeMin);

        days.push({
          date: dateStr,
          weekday: getWeekday(currentDate),
          slots: freeSlots,
          isHoliday: isHoliday,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({ days });
  } catch (error: any) {
    console.error("Microsoft Calendar API error:", error);

    if (error.message?.includes("401")) {
      return NextResponse.json({ error: "Token expired", needsReauth: true }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch Microsoft calendar data", details: error.message },
      { status: 500 }
    );
  }
}
