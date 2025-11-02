// 営業日報の型定義

export type DailyReport = {
  title: string;
  visitInfo: {
    destination: string; // 訪問先
    participants: string[]; // 参加者
  };
  targetProducts: string[]; // 商談対象製品
  visitSummary: {
    purpose: string; // ① 目的
    result: string; // ② 結果
    proposal: string; // ③ 提案
    challenges: string; // ④ 課題
    nextSteps: string; // ⑤ 次のステップ
  };
  attachments?: string[]; // 添付ファイル（将来的に実装）
};

export type DailyReportInput = {
  transcript: string; // 文字起こしテキスト
  destination?: string; // 訪問先（任意で事前入力可能）
  products?: string[]; // 製品名（任意で事前入力可能）
};

// フィードバックの型定義
export type ReportFeedback = {
  reportId: string;
  rating: 'good' | 'bad';
  comment?: string;
  timestamp: string;
  userId: string;
};
