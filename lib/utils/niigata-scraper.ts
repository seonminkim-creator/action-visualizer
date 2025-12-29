/**
 * 新潟県病害虫防除所の予察情報スクレイパー
 *
 * https://www.pref.niigata.lg.jp/sec/bojo/yosatu07.html から
 * 最新のPDF情報を取得
 */

export interface NiigataPestForecast {
  category: '予報' | '警報' | '注意報' | '特殊報' | '速報';
  title: string;
  pdfUrl: string;
  publishedDate?: string;
}

export interface NiigataPestForecastData {
  forecasts: NiigataPestForecast[];
  scrapedAt: string;
}

/**
 * 新潟県の予察情報ページから最新情報を取得
 */
export async function scrapeNiigataPestForecasts(): Promise<NiigataPestForecastData> {
  const url = 'https://www.pref.niigata.lg.jp/sec/bojo/yosatu07.html';

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Niigata page: ${response.status}`);
    }

    const html = await response.text();

    // HTMLから予察情報を抽出
    const forecasts = parseNiigataPestPage(html);

    return {
      forecasts,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('新潟県予察情報スクレイピングエラー:', error);
    return {
      forecasts: [],
      scrapedAt: new Date().toISOString(),
    };
  }
}

/**
 * HTMLから予察情報を抽出
 */
function parseNiigataPestPage(html: string): NiigataPestForecast[] {
  const forecasts: NiigataPestForecast[] = [];

  // カテゴリごとのパターンを検索
  const categories: Array<'予報' | '警報' | '注意報' | '特殊報' | '速報'> = [
    '予報',
    '警報',
    '注意報',
    '特殊報',
    '速報'
  ];

  categories.forEach(category => {
    // カテゴリ見出しを探す
    const categoryPattern = new RegExp(`${category}[^<]*</h[23]>([\\s\\S]*?)(?=<h[23]|$)`, 'i');
    const categoryMatch = html.match(categoryPattern);

    if (categoryMatch) {
      const sectionHtml = categoryMatch[1];

      // PDFリンクを抽出（aタグでhrefが.pdfで終わるもの）
      const pdfPattern = /<a[^>]*href=["']([^"']*\.pdf)["'][^>]*>([^<]*)</gi;
      let match;

      while ((match = pdfPattern.exec(sectionHtml)) !== null) {
        let pdfUrl = match[1];
        const title = match[2].trim();

        // 相対URLを絶対URLに変換
        if (!pdfUrl.startsWith('http')) {
          if (pdfUrl.startsWith('/')) {
            pdfUrl = `https://www.pref.niigata.lg.jp${pdfUrl}`;
          } else {
            pdfUrl = `https://www.pref.niigata.lg.jp/sec/bojo/${pdfUrl}`;
          }
        }

        // 日付を抽出（R6.12.25などの形式）
        const dateMatch = title.match(/R?(\d+)\.(\d+)\.(\d+)/);
        let publishedDate: string | undefined;
        if (dateMatch) {
          const year = parseInt(dateMatch[1]) + 2018; // 令和→西暦変換
          const month = dateMatch[2].padStart(2, '0');
          const day = dateMatch[3].padStart(2, '0');
          publishedDate = `${year}-${month}-${day}`;
        }

        forecasts.push({
          category,
          title,
          pdfUrl,
          publishedDate,
        });
      }
    }
  });

  return forecasts;
}

/**
 * カテゴリ別に最新の予察情報を取得
 */
export function getLatestForecastByCategory(
  forecasts: NiigataPestForecast[],
  category: '予報' | '警報' | '注意報' | '特殊報' | '速報'
): NiigataPestForecast | null {
  const categoryForecasts = forecasts.filter(f => f.category === category);

  if (categoryForecasts.length === 0) {
    return null;
  }

  // 日付順でソート（新しい順）
  categoryForecasts.sort((a, b) => {
    if (!a.publishedDate) return 1;
    if (!b.publishedDate) return -1;
    return b.publishedDate.localeCompare(a.publishedDate);
  });

  return categoryForecasts[0];
}

/**
 * トピック（病害虫名）に関連する予察情報を検索
 */
export function searchForecastsByTopic(
  forecasts: NiigataPestForecast[],
  topic: string
): NiigataPestForecast[] {
  return forecasts.filter(f =>
    f.title.includes(topic) || topic.split(/\s+/).some(keyword => f.title.includes(keyword))
  );
}
