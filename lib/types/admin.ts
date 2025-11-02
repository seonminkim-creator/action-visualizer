// 管理者機能の型定義

export type UsageLog = {
  id: string;
  timestamp: string;
  userId: string; // セッションIDまたはIPアドレス
  action: 'transcribe' | 'meeting-summary';
  status: 'success' | 'error';
  characterCount?: number;
  segmentCount?: number;
  processingTime: number; // ミリ秒
  errorMessage?: string;
  userAgent?: string;
};

export type UsageStats = {
  totalUsers: number;
  totalTranscriptions: number;
  totalMeetingSummaries: number;
  totalErrors: number;
  averageProcessingTime: number;
  apiCallCount: number;
};

export type DailyStats = {
  date: string;
  transcriptions: number;
  meetingSummaries: number;
  errors: number;
  uniqueUsers: number;
};
