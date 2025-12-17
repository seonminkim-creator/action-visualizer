// 防除暦アラートDB 型定義

/**
 * 作物セット
 */
export const CROPS = ["水稲", "大豆", "秋冬ねぎ", "西洋なし"] as const;
export type Crop = typeof CROPS[number];

/**
 * カテゴリ（予報/注意報/警報/速報）
 */
export type Category = "forecast" | "advisory" | "warning" | "bulletin";

/**
 * 緊急度
 */
export type Severity = "low" | "medium" | "high";

/**
 * 文書タイプ
 */
export type DocType = "html" | "pdf";

/**
 * 情報ソース
 */
export type InfoSource = "農水省" | "県" | "JA" | "その他";

/**
 * 正規化アイテム（DBスキーマ）
 */
export type BoujoItem = {
  id: string;
  date_iso: string; // YYYY-MM-DD
  region: string; // "新潟県"
  crop: Crop;
  topic: string; // 例: "いもち病", "シロイチモジヨトウ"
  category: Category;
  severity: Severity;
  title: string;
  source_url: string;
  doc_type: DocType;
  snippet: string; // PDF冒頭300字 or 空
  created_at: string; // ISO timestamp
  info_sources?: InfoSource[]; // 情報ソース（農水省/県/JA）複数可
};

/**
 * 製品情報（ラベル一次情報）
 */
export type ProductInfo = {
  id: string;
  name: string;
  type: "fungicide" | "insecticide" | "herbicide"; // 殺菌剤/殺虫剤/除草剤
  image_url?: string; // 製品画像URL
  label_url: string;
  label_excerpt: string; // 適用作物/対象/使用時期（原文）
  applicable_crops: Crop[];
  target_pests?: string[]; // 対象病害虫
  target_weeds?: string[]; // 対象雑草
  usage_timing?: string; // 使用時期（原文）
  dosage?: string; // 使用量（原文）
  notes?: string; // 注意事項（原文）
};

/**
 * 詳細予察情報（PDFから抽出）
 */
export type DetailedForecastData = {
  crop: string; // 作物名
  pest: string; // 病害虫名
  occurrenceLevel: string; // 発生量: "やや少ない", "少ない", "並", "やや多い", "多い"
  comparisonToAverage: string; // 平年比
  occurrenceDegree: string; // 発生程度: "少発生", "中発生", "多発生"
  percentageRange?: string; // 発病葉率/寄生葉率: "1～25%", "26～50%", etc.
  rationale: Array<{
    point: string; // ①, ②, ③, etc.
    description: string; // 根拠の説明
    indicator?: string; // ○, ±, +, -, etc.
  }>;
};

/**
 * 推奨製品（カード生成用）
 */
export type Recommendation = {
  product_id: string;
  name: string;
  image_url?: string; // 製品画像URL
  reason: string; // ラベル原文抜粋（適用/対象/時期）
  label_url: string;
  label_excerpt?: string;
};

/**
 * 根拠リンク
 */
export type Evidence = {
  forecast_url: string; // 県ページURL
  product_label_urls: string[]; // 製品ラベルURL配列
};

/**
 * 推奨カード（生成後JSON）
 */
export type BoujoCard = {
  id: string;
  region: string;
  crop: Crop;
  category: Category;
  severity: Severity;
  topic: string;
  published_at: string; // YYYY-MM-DD
  summary: string; // 120字以内
  recommendations: Recommendation[];
  evidence: Evidence;
  detailedForecast?: DetailedForecastData[]; // PDFから抽出した詳細予察情報
  status: "OK" | "HOLD"; // 二本根拠が揃わない場合はHOLD
  hold_reason?: string; // status=HOLDの場合の理由
  generated_at: string; // ISO timestamp
  model_version?: string; // Claude model version
  info_sources?: InfoSource[]; // 情報ソース（農水省/県/JA）複数可
};

/**
 * Claude API 入力形式
 */
export type ClaudeInput = {
  region: string;
  crop: Crop;
  item: {
    category: Category;
    title: string;
    published_at: string;
    source_url: string;
    severity: Severity;
    snippet: string;
  };
  product_candidates: {
    id: string;
    name: string;
    label_url: string;
    label_excerpt: string;
  }[];
};

/**
 * Claude API 出力形式
 */
export type ClaudeOutput = {
  status: "OK" | "HOLD";
  summary?: string; // 120字以内
  recommendations?: {
    product_id: string;
    reason: string;
    label_url: string;
  }[];
  links: {
    forecast: string;
    product: string[];
  };
  detailedForecast?: DetailedForecastData[]; // PDFから抽出した詳細予察情報
  hold_reason?: string; // status=HOLDの場合
};

/**
 * 監査ログ
 */
export type AuditLog = {
  id: string;
  timestamp: string; // ISO timestamp
  source_url: string;
  title: string;
  parsed_fields: {
    crop?: Crop;
    category?: Category;
    severity?: Severity;
    topic?: string;
  };
  model_name?: string;
  prompt_hash?: string;
  output_hash?: string;
  input_json?: string; // Claude入力JSON
  output_json?: string; // Claude出力JSON
};

/**
 * フィルタ条件
 */
export type BoujoFilter = {
  crop?: Crop;
  severity?: Severity;
  category?: Category;
  days?: number; // 直近N日間
  search?: string; // トピック検索
};
