/**
 * 都道府県別の病害虫防除情報URLマッピング
 *
 * 各県の公式な病害虫発生予察情報ページへのリンクを管理
 */

export interface PrefectureUrlMapping {
  prefecture: string;
  baseUrl: string; // 県の病害虫防除所トップページ
  forecastUrl?: string; // 予察情報一覧ページ
  description?: string;
  scraper?: 'niigata' | 'generic'; // スクレイピング方式
}

/**
 * 都道府県別URLマッピング（MVP版：新潟県のみ実装）
 */
export const PREFECTURE_URL_MAPPINGS: PrefectureUrlMapping[] = [
  {
    prefecture: '新潟県',
    baseUrl: 'https://www.pref.niigata.lg.jp/sec/bojo/',
    forecastUrl: 'https://www.pref.niigata.lg.jp/sec/bojo/yosatu07.html',
    description: '新潟県病害虫防除所 - 発生予察情報',
    scraper: 'niigata',
  },
  // 他の都道府県は今後追加予定
  // {
  //   prefecture: '東京都',
  //   baseUrl: 'https://www.sangyo-rodo.metro.tokyo.lg.jp/nourin/nougyou/byougaichuu/',
  //   forecastUrl: 'https://www.sangyo-rodo.metro.tokyo.lg.jp/nourin/nougyou/byougaichuu/index.html',
  //   description: '東京都病害虫防除所',
  // },
];

/**
 * 都道府県名からURLマッピングを取得
 */
export function getPrefectureUrlMapping(prefecture: string): PrefectureUrlMapping | null {
  return PREFECTURE_URL_MAPPINGS.find(m => m.prefecture === prefecture) || null;
}

/**
 * 新潟県用の詳細マッピング（カテゴリ別）
 *
 * スクレイピング結果をキャッシュして使用する場合のデフォルト値
 */
export const NIIGATA_DEFAULT_URLS = {
  予報: 'https://www.pref.niigata.lg.jp/sec/bojo/yosatu07.html',
  警報: 'https://www.pref.niigata.lg.jp/sec/bojo/yosatu07.html',
  注意報: 'https://www.pref.niigata.lg.jp/sec/bojo/yosatu07.html',
  特殊報: 'https://www.pref.niigata.lg.jp/sec/bojo/yosatu07.html',
  速報: 'https://www.pref.niigata.lg.jp/sec/bojo/yosatu07.html',
};

/**
 * カテゴリから適切な予察情報URLを取得
 */
export function getForecastUrlByCategory(
  prefecture: string,
  category: string
): string {
  if (prefecture === '新潟県') {
    // 新潟県の場合はすべて同じページに掲載されている
    return NIIGATA_DEFAULT_URLS.予報;
  }

  // 他の県は今後実装
  const mapping = getPrefectureUrlMapping(prefecture);
  return mapping?.forecastUrl || '';
}
