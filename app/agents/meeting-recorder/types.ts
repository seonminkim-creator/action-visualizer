export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
};

export type DriveMeeting = {
  folderId: string;
  title: string;
  date: string;
  category?: string;
  files: {
    audio?: DriveFile;
    transcript?: DriveFile;
    minutes?: DriveFile;
    metadata?: DriveFile;
  };
  minutesContent?: string;
  transcriptContent?: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "all", name: "すべて", color: "#10b981" },
  { id: "general", name: "一般", color: "#6b7280" },
  { id: "basf", name: "BASF", color: "#3b82f6" },
  { id: "sales", name: "営業代行", color: "#f97316" },
  { id: "petline", name: "ペットライン", color: "#8b5cf6" },
];

export type MeetingSummary = {
  title?: string; // AIが自動生成するタイトル
  summary: {
    purpose: string;
    discussions: string[];
    decisions: string[];
  };
  todos: Array<{
    task: string;
    assignee: string;
    deadline?: string;
    priority: "high" | "medium" | "low";
  }>;
  detailedMinutes: string;
};

export type HistoryItem = {
  id: string;
  date: string;
  title?: string;
  summary: MeetingSummary;
  category?: string;
  highlight?: string;
};
