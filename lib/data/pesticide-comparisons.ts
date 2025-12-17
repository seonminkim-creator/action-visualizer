/**
 * 農薬比較データベース
 *
 * BASF製品と競合製品の客観的データ比較
 */

import {
  PesticideComparison,
  PesticideComparisonGroup,
} from "@/lib/types/pesticide-comparison";

/**
 * ねぎのシロイチモジヨトウ防除剤の比較データ
 */
export const NEGI_SHIROICHIMOJI_COMPARISON: PesticideComparisonGroup = {
  id: "negi-shiroichimoji-001",
  title: "ねぎのシロイチモジヨトウ防除剤",
  description: "ねぎ栽培におけるシロイチモジヨトウの防除に使用される殺虫剤の比較",
  crop: "ねぎ",
  targetPest: "シロイチモジヨトウ",
  basfRecommendation: "basf-afarm",
  pesticides: [
    // BASF製品1
    {
      id: "basf-afarm",
      name: "アファーム乳剤",
      manufacturer: "BASF",
      type: "insecticide",
      chemicalClass: "その他",
      applicableCrops: ["ねぎ", "キャベツ", "はくさい", "レタス"],
      targetPests: ["シロイチモジヨトウ", "ネギコガ", "ネギハモグリバエ"],
      preDaysLimit: 1, // 収穫前日まで
      usageLimit: 3, // 3回以内
      effectDuration: 7, // 約7日間
      pricePerArea: 2500, // 円/10a（仮）
      labelUrl: "https://crop-protection.basf.co.jp/product-information",
      imageUrl: "/images/products/afarm.jpg",
      notes: "収穫前日まで使用可能。若齢幼虫に高い効果。",
    },

    // BASF製品2
    {
      id: "basf-phoenix",
      name: "フェニックス®フロアブル",
      manufacturer: "BASF",
      type: "insecticide",
      chemicalClass: "ジアミド系",
      applicableCrops: ["ねぎ", "キャベツ", "だいこん", "ブロッコリー"],
      targetPests: ["シロイチモジヨトウ", "ネギアザミウマ", "ネギハモグリバエ"],
      preDaysLimit: 3, // 収穫3日前まで
      usageLimit: 3, // 3回以内
      effectDuration: 10, // 約10日間
      pricePerArea: 3000, // 円/10a（仮）
      labelUrl: "https://crop-protection.basf.co.jp/product-information",
      imageUrl: "/images/products/phoenix.jpg",
      notes: "長期残効性。幅広い害虫に効果。",
    },

    // 競合製品1: シンジェンタ
    {
      id: "syngenta-proclaim",
      name: "プロクレイム®乳剤",
      manufacturer: "シンジェンタ",
      type: "insecticide",
      chemicalClass: "その他",
      applicableCrops: ["ねぎ", "キャベツ", "はくさい", "だいこん"],
      targetPests: ["シロイチモジヨトウ", "ヨトウガ", "アオムシ"],
      preDaysLimit: 3, // 収穫3日前まで
      usageLimit: 2, // 2回以内
      effectDuration: 7, // 約7日間
      pricePerArea: 2800, // 円/10a（仮）
      labelUrl: "https://www.syngenta.co.jp/",
      notes: "速効性。害虫の摂食行動を即座に停止。",
    },

    // 競合製品2: バイエル
    {
      id: "bayer-prevathon",
      name: "プレバソン®フロアブル5",
      manufacturer: "バイエル",
      type: "insecticide",
      chemicalClass: "ジアミド系",
      applicableCrops: ["ねぎ", "キャベツ", "はくさい", "レタス"],
      targetPests: ["シロイチモジヨトウ", "ハスモンヨトウ", "オオタバコガ"],
      preDaysLimit: 3, // 収穫3日前まで
      usageLimit: 3, // 3回以内
      effectDuration: 14, // 約14日間
      pricePerArea: 3500, // 円/10a（仮）
      labelUrl: "https://www.bayer.jp/",
      notes: "長期残効性。チョウ目害虫に広範囲に効果。",
    },

    // 競合製品3: 住友化学
    {
      id: "sumitomo-belt",
      name: "ベルト®フロアブル",
      manufacturer: "住友化学",
      type: "insecticide",
      chemicalClass: "ジアミド系",
      applicableCrops: ["ねぎ", "キャベツ", "はくさい", "だいこん"],
      targetPests: ["シロイチモジヨトウ", "ハスモンヨトウ", "コナガ"],
      preDaysLimit: 3, // 収穫3日前まで
      usageLimit: 2, // 2回以内
      effectDuration: 10, // 約10日間
      pricePerArea: 2900, // 円/10a（仮）
      labelUrl: "https://www.sc-engei.co.jp/",
      notes: "浸透移行性。新葉への効果持続。",
    },

    // 競合製品4: 日本曹達
    {
      id: "nippon-soda-dantotz",
      name: "ダントツ®水溶剤",
      manufacturer: "日本曹達",
      type: "insecticide",
      chemicalClass: "ネオニコチノイド系",
      applicableCrops: ["ねぎ", "キャベツ", "トマト", "きゅうり"],
      targetPests: ["シロイチモジヨトウ", "アブラムシ類", "アザミウマ類"],
      preDaysLimit: 3, // 収穫3日前まで
      usageLimit: 3, // 3回以内
      effectDuration: 7, // 約7日間
      pricePerArea: 2200, // 円/10a（仮）
      labelUrl: "https://www.nippon-soda.co.jp/",
      notes: "速効性・浸透移行性。吸汁性害虫にも効果。",
    },
  ],
};

/**
 * 水稲のいもち病防除剤の比較データ
 */
export const RICE_IMOCHI_COMPARISON: PesticideComparisonGroup = {
  id: "rice-imochi-001",
  title: "水稲のいもち病防除剤",
  description: "水稲栽培におけるいもち病の防除に使用される殺菌剤の比較",
  crop: "水稲",
  targetPest: "いもち病",
  basfRecommendation: "basf-topjin-m",
  pesticides: [
    // BASF製品1
    {
      id: "basf-topjin-m",
      name: "トップジンM®ゾル",
      manufacturer: "BASF",
      type: "fungicide",
      chemicalClass: "その他",
      applicableCrops: ["稲（水稲）"],
      targetPests: ["いもち病", "紋枯病", "稲こうじ病"],
      preDaysLimit: 14, // 収穫14日前まで
      usageLimit: 3, // 3回以内
      effectDuration: 10, // 約10日間
      pricePerArea: 1800, // 円/10a（仮）
      labelUrl: "https://crop-protection.basf.co.jp/product-information",
      notes: "予防・治療効果。浸透移行性。",
    },

    // BASF製品2
    {
      id: "basf-oracle",
      name: "オラクル®フロアブル",
      manufacturer: "BASF",
      type: "fungicide",
      chemicalClass: "ストロビルリン系",
      applicableCrops: ["稲（水稲）"],
      targetPests: ["いもち病", "紋枯病", "稲こうじ病", "もみ枯細菌病"],
      preDaysLimit: 21, // 収穫21日前まで
      usageLimit: 2, // 2回以内
      effectDuration: 14, // 約14日間
      pricePerArea: 2200, // 円/10a（仮）
      labelUrl: "https://crop-protection.basf.co.jp/product-information",
      notes: "予防効果主体。広範囲の病害に有効。",
    },

    // 競合製品1: シンジェンタ
    {
      id: "syngenta-blastcide",
      name: "ブラシン®フロアブル",
      manufacturer: "シンジェンタ",
      type: "fungicide",
      chemicalClass: "ストロビルリン系",
      applicableCrops: ["稲（水稲）"],
      targetPests: ["いもち病", "紋枯病", "ごま葉枯病"],
      preDaysLimit: 14, // 収穫14日前まで
      usageLimit: 2, // 2回以内
      effectDuration: 10, // 約10日間
      pricePerArea: 2000, // 円/10a（仮）
      labelUrl: "https://www.syngenta.co.jp/",
      notes: "予防効果。浸透移行性。",
    },

    // 競合製品2: バイエル
    {
      id: "bayer-monarc",
      name: "モナーク®フロアブル",
      manufacturer: "バイエル",
      type: "fungicide",
      chemicalClass: "トリアゾール系",
      applicableCrops: ["稲（水稲）"],
      targetPests: ["いもち病", "紋枯病", "稲こうじ病"],
      preDaysLimit: 21, // 収穫21日前まで
      usageLimit: 2, // 2回以内
      effectDuration: 14, // 約14日間
      pricePerArea: 2400, // 円/10a（仮）
      labelUrl: "https://www.bayer.jp/",
      notes: "治療・予防効果。長期残効性。",
    },
  ],
};

/**
 * すべての比較グループ
 */
export const PESTICIDE_COMPARISON_GROUPS: PesticideComparisonGroup[] = [
  NEGI_SHIROICHIMOJI_COMPARISON,
  RICE_IMOCHI_COMPARISON,
];

/**
 * 作物と病害虫から比較グループを検索
 */
export function findComparisonGroup(
  crop: string,
  pest: string
): PesticideComparisonGroup | null {
  return (
    PESTICIDE_COMPARISON_GROUPS.find(
      (group) => group.crop === crop && group.targetPest === pest
    ) || null
  );
}

/**
 * BASF製品のみを抽出
 */
export function getBasfProducts(
  group: PesticideComparisonGroup
): PesticideComparison[] {
  return group.pesticides.filter((p) => p.manufacturer === "BASF");
}

/**
 * 競合製品のみを抽出
 */
export function getCompetitorProducts(
  group: PesticideComparisonGroup
): PesticideComparison[] {
  return group.pesticides.filter((p) => p.manufacturer !== "BASF");
}
