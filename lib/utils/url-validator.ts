/**
 * URL検証ユーティリティ
 *
 * Geminiが生成したURLが実際にアクセス可能かを検証
 */

export interface UrlValidationResult {
  url: string;
  isValid: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * 単一URLの有効性を検証
 */
export async function validateUrl(url: string, timeout: number = 5000): Promise<UrlValidationResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD', // HEADリクエストで軽量化
      signal: controller.signal,
      redirect: 'follow', // リダイレクトを自動追従
    });

    clearTimeout(timeoutId);

    return {
      url,
      isValid: response.ok, // 200-299のステータスコード
      statusCode: response.status,
    };
  } catch (error) {
    return {
      url,
      isValid: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 複数URLを並列検証
 */
export async function validateUrls(urls: string[]): Promise<UrlValidationResult[]> {
  // 並列実行で高速化
  const results = await Promise.all(
    urls.map(url => validateUrl(url))
  );

  return results;
}

/**
 * URLリストから有効なもののみをフィルタ
 */
export function filterValidUrls(results: UrlValidationResult[]): string[] {
  return results
    .filter(result => result.isValid)
    .map(result => result.url);
}

/**
 * URLの有効性を一括検証してログ出力
 */
export async function verifyAndLogUrls(
  urls: string[],
  label: string = "URL"
): Promise<string[]> {
  console.log(`🔍 ${label}を検証中... (${urls.length}件)`);

  const results = await validateUrls(urls);
  const validUrls = filterValidUrls(results);

  // 検証結果をログ出力
  results.forEach(result => {
    if (result.isValid) {
      console.log(`✅ ${result.url} - OK (${result.statusCode})`);
    } else {
      console.log(`❌ ${result.url} - NG (${result.error || result.statusCode})`);
    }
  });

  console.log(`✅ ${label}検証完了: ${validUrls.length}/${urls.length}件が有効`);

  return validUrls;
}
