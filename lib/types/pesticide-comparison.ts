/**
 * 農薬比較用の型定義
 */

/**
 * 農薬メーカー
 */
export type PesticideManufacturer =
  | "BASF"
  | "シンジェンタ"
  | "バイエル"
  | "住友化学"
  | "日本曹達"
  | "クミアイ化学"
  | "その他";

/**
 * 薬剤系統（作用機構）
 */
export type ChemicalClass =
  | "ストロビルリン系"
  | "トリアゾール系"
  | "ジアミド系"
  | "ネオニコチノイド系"
  | "ピレスロイド系"
  | "カーバメート系"
  | "有機リン系"
  | "その他";

/**
 * 農薬比較データ
 */
export interface PesticideComparison {
  id: string;
  name: string; // 製品名
  manufacturer: PesticideManufacturer; // メーカー
  type: "fungicide" | "insecticide" | "herbicide"; // 殺菌剤/殺虫剤/除草剤
  chemicalClass: ChemicalClass; // 薬剤系統

  // 適用情報
  applicableCrops: string[]; // 適用作物
  targetPests: string[]; // 対象病害虫

  // 使用制限
  preDaysLimit: number | null; // 収穫前使用日数制限（日）null = 制限なし
  usageLimit: number | null; // 使用回数制限（回）null = 制限なし

  // 効果
  effectDuration: number | null; // 効果持続期間（日）null = データなし

  // 価格（10aあたり）
  pricePerArea: number | null; // 円/10a、null = データなし

  // ラベル情報
  labelUrl: string;
  imageUrl?: string;

  // 備考
  notes?: string;
}

/**
 * 農薬比較グループ（同じ用途の農薬をまとめる）
 */
export interface PesticideComparisonGroup {
  id: string;
  title: string; // 例: "ねぎのシロイチモジヨトウ防除剤"
  description: string;
  crop: string; // 作物
  targetPest: string; // 対象病害虫
  pesticides: PesticideComparison[]; // 比較対象の農薬リスト
  basfRecommendation?: string; // BASF製品ID（推奨製品）
}
