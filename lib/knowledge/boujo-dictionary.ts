// 防除暦アラート ドメイン辞書

import { Crop, Category, Severity } from "@/lib/types/boujo";

/**
 * 作物別トピック語彙（抽出用キーワード）
 */
export const CROP_TOPIC_KEYWORDS: Record<Crop, string[]> = {
  "水稲": [
    "いもち",
    "いもち病",
    "紋枯",
    "紋枯病",
    "ウンカ",
    "斑点米",
    "カメムシ",
    "稲こうじ",
    "稲こうじ病",
    "もみ枯",
    "もみ枯細菌病",
    "ばか苗",
    "ばか苗病",
    "苗立枯",
    "苗立枯病",
    "白葉枯",
    "白葉枯病",
    "縞葉枯",
    "縞葉枯病",
    "ツマグロヨコバイ",
    "セジロウンカ",
    "トビイロウンカ",
    "イネドロオイムシ",
    "イネミズゾウムシ",
    "雑草",
    "畦畔",
    "畔",
  ],
  "大豆": [
    "カメムシ",
    "紫斑病",
    "紫斑",
    "ハスモン",
    "ハスモンヨトウ",
    "べと病",
    "黒点病",
    "黒根腐病",
    "茎疫病",
    "根腐病",
    "褐斑病",
    "斑点細菌病",
    "マメシンクイガ",
    "ウコンノメイガ",
    "フタスジヒメハムシ",
    "アブラムシ",
    "雑草",
    "畦間",
    "雑草防除",
  ],
  "秋冬ねぎ": [
    "シロイチモジヨトウ",
    "オオタバコガ",
    "アザミウマ",
    "ネギアザミウマ",
    "さび病",
    "疫病",
    "黒斑病",
    "べと病",
    "軟腐病",
    "白絹病",
    "萎凋病",
    "ネギハモグリバエ",
    "ネギコガ",
    "タネバエ",
    "ネダニ",
    "ネギアブラムシ",
  ],
  "西洋なし": [
    "褐色斑点病",
    "セイヨウナシ褐色斑点病",
    "黒星病",
    "黒斑病",
    "赤星病",
    "うどんこ病",
    "シンクイムシ類",
    "ハマキムシ類",
  ],
};

/**
 * カテゴリキーワード（タイトル抽出用）
 */
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  forecast: ["予報", "発生予報", "病害虫発生予報"],
  advisory: ["注意報", "発生注意報"],
  warning: ["警報", "発生警報", "特殊報"],
  bulletin: ["速報", "発生速報", "臨時速報"],
};

/**
 * カテゴリ→緊急度マッピング
 */
export const CATEGORY_TO_SEVERITY: Record<Category, Severity> = {
  forecast: "low",
  advisory: "medium",
  warning: "high",
  bulletin: "medium", // 本文に「多発」「飛来」「初確認」で+1 → high
};

/**
 * 緊急度を上げるキーワード（速報用）
 */
export const SEVERITY_BOOST_KEYWORDS = [
  "多発",
  "大発生",
  "飛来",
  "初確認",
  "急増",
  "警戒",
  "注意",
  "早急",
  "直ちに",
];

/**
 * タイトルからカテゴリを抽出
 */
export function extractCategory(title: string): Category | null {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => title.includes(kw))) {
      return category as Category;
    }
  }
  return null;
}

/**
 * タイトルから作物を抽出
 */
export function extractCrop(title: string): Crop | null {
  for (const crop of ["水稲", "大豆", "秋冬ねぎ", "西洋なし"] as const) {
    // 完全一致または「ねぎ」の場合は「秋冬ねぎ」も含める
    if (title.includes(crop)) {
      return crop;
    }
    if (crop === "秋冬ねぎ" && title.includes("ねぎ")) {
      return crop;
    }
    // 「西洋なし」または「なし」の場合
    if (crop === "西洋なし" && (title.includes("西洋なし") || title.includes("セイヨウナシ"))) {
      return crop;
    }
  }
  return null;
}

/**
 * タイトル・本文からトピックを抽出
 */
export function extractTopic(title: string, snippet: string, crop: Crop | null): string | null {
  if (!crop) return null;

  const keywords = CROP_TOPIC_KEYWORDS[crop];
  const text = title + snippet;

  // 最長一致でトピックを抽出
  let longestMatch: string | null = null;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      if (!longestMatch || keyword.length > longestMatch.length) {
        longestMatch = keyword;
      }
    }
  }

  return longestMatch;
}

/**
 * 緊急度を判定（カテゴリ + 本文キーワード）
 */
export function determineSeverity(category: Category, snippet: string): Severity {
  let severity = CATEGORY_TO_SEVERITY[category];

  // 速報の場合は本文に緊急度を上げるキーワードがあればhighに
  if (category === "bulletin") {
    const hasBoostKeyword = SEVERITY_BOOST_KEYWORDS.some(kw => snippet.includes(kw));
    if (hasBoostKeyword) {
      severity = "high";
    }
  }

  return severity;
}

/**
 * 日付抽出（タイトルや本文から）
 */
export function extractDate(title: string, snippet: string): string | null {
  // YYYY年MM月DD日, YYYY/MM/DD, YYYY-MM-DD 形式を探す
  const patterns = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
  ];

  const text = title + snippet;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  // 見つからない場合は今日の日付を返す
  return new Date().toISOString().split("T")[0];
}

/**
 * 号数抽出（例：「第9号」→9）
 */
export function extractIssueNumber(title: string): number | null {
  const match = title.match(/第(\d+)号/);
  return match ? parseInt(match[1], 10) : null;
}
