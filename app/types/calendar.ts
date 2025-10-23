// 空き時間みえーるくん - 型定義

export type Slot = {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
};

export type DaySlots = {
  date: string;     // "YYYY-MM-DD"
  weekday: string;  // "月"|"火"|"水"|"木"|"金"|"土"|"日"
  slots: Slot[];
  isHoliday?: boolean; // 祝日フラグ
};

export type Period = "this_week" | "next_week" | "next_next_week" | "next_month";

export type Mode = "visit" | "mail";

export type AvailabilityResponse = {
  period: Period;
  tz: string;
  days: DaySlots[];
  meta?: {
    generatedAt: string;
    source: string;
  };
};

export type FormatRequest = {
  mode: Mode;
  periodLabel: string;
  freeDays: DaySlots[];
  mailTemplate?: string;
  maxItems?: number;
};

export type FormatResponse = {
  text?: string;      // visit mode
  subject?: string;   // mail mode
  body?: string;      // mail mode
};

export type BusinessHours = {
  [key: string]: { start: string; end: string } | null;
};

export type Settings = {
  businessHours: BusinessHours;
  durationMin: number;
  travelBufferMin: number;
  ignoreKeywords: {
    enabled: boolean;
    list: string[];
  };
  mailTemplate: string;
  tz: string;
};
