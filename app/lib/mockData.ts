import { AvailabilityResponse, Period } from "../types/calendar";

// モックデータ生成関数
export function getMockAvailability(period: Period): AvailabilityResponse {
  const mockData: Record<Period, AvailabilityResponse> = {
    this_week: {
      period: "this_week",
      tz: "Asia/Tokyo",
      days: [
        {
          date: "2025-01-27",
          weekday: "月",
          slots: [
            { start: "10:00", end: "11:00" },
            { start: "14:00", end: "15:30" }
          ]
        },
        {
          date: "2025-01-28",
          weekday: "火",
          slots: [
            { start: "09:00", end: "10:30" },
            { start: "15:30", end: "16:00" }
          ]
        },
        {
          date: "2025-01-29",
          weekday: "水",
          slots: []
        },
        {
          date: "2025-01-30",
          weekday: "木",
          slots: [
            { start: "10:00", end: "11:30" },
            { start: "13:00", end: "14:00" },
            { start: "16:00", end: "17:00" }
          ]
        },
        {
          date: "2025-01-31",
          weekday: "金",
          slots: [
            { start: "11:00", end: "12:00" }
          ]
        }
      ],
      meta: {
        generatedAt: new Date().toISOString(),
        source: "mock"
      }
    },
    next_week: {
      period: "next_week",
      tz: "Asia/Tokyo",
      days: [
        {
          date: "2025-02-03",
          weekday: "月",
          slots: [
            { start: "09:00", end: "10:00" },
            { start: "14:30", end: "16:00" }
          ]
        },
        {
          date: "2025-02-04",
          weekday: "火",
          slots: [
            { start: "10:00", end: "11:00" }
          ]
        },
        {
          date: "2025-02-05",
          weekday: "水",
          slots: [
            { start: "13:00", end: "15:00" }
          ]
        },
        {
          date: "2025-02-06",
          weekday: "木",
          slots: []
        },
        {
          date: "2025-02-07",
          weekday: "金",
          slots: [
            { start: "09:30", end: "11:00" },
            { start: "15:00", end: "17:00" }
          ]
        }
      ],
      meta: {
        generatedAt: new Date().toISOString(),
        source: "mock"
      }
    },
    next_next_week: {
      period: "next_next_week",
      tz: "Asia/Tokyo",
      days: [
        {
          date: "2025-02-10",
          weekday: "月",
          slots: [
            { start: "10:00", end: "12:00" }
          ]
        },
        {
          date: "2025-02-11",
          weekday: "火",
          slots: []
        },
        {
          date: "2025-02-12",
          weekday: "水",
          slots: [
            { start: "14:00", end: "16:00" }
          ]
        },
        {
          date: "2025-02-13",
          weekday: "木",
          slots: [
            { start: "09:00", end: "10:00" },
            { start: "11:00", end: "12:00" }
          ]
        },
        {
          date: "2025-02-14",
          weekday: "金",
          slots: [
            { start: "13:00", end: "17:00" }
          ]
        }
      ],
      meta: {
        generatedAt: new Date().toISOString(),
        source: "mock"
      }
    },
    next_month: {
      period: "next_month",
      tz: "Asia/Tokyo",
      days: [
        {
          date: "2025-02-24",
          weekday: "月",
          slots: [
            { start: "10:00", end: "11:30" },
            { start: "14:00", end: "16:00" }
          ]
        },
        {
          date: "2025-02-25",
          weekday: "火",
          slots: [
            { start: "09:00", end: "12:00" }
          ]
        },
        {
          date: "2025-02-26",
          weekday: "水",
          slots: []
        },
        {
          date: "2025-02-27",
          weekday: "木",
          slots: [
            { start: "13:00", end: "15:00" }
          ]
        },
        {
          date: "2025-02-28",
          weekday: "金",
          slots: [
            { start: "10:00", end: "11:00" },
            { start: "15:00", end: "17:00" }
          ]
        }
      ],
      meta: {
        generatedAt: new Date().toISOString(),
        source: "mock"
      }
    }
  };

  return mockData[period];
}

// 期間ラベルのマッピング
export const periodLabels: Record<Period, string> = {
  this_week: "今週",
  next_week: "来週",
  next_next_week: "再来週",
  next_month: "1ヶ月後"
};
