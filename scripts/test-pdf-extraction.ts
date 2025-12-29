/**
 * PDF抽出機能のテストスクリプト
 */

import { extractForecastDataFromPdf } from "../lib/utils/pdf-extractor";

const TEST_PDF_URL = "https://www.pref.niigata.lg.jp/uploaded/attachment/466601.pdf";

async function testPdfExtraction() {
  console.log(`🧪 PDF抽出テスト開始`);
  console.log(`PDF URL: ${TEST_PDF_URL}`);

  try {
    const result = await extractForecastDataFromPdf(
      TEST_PDF_URL,
      "秋冬だいこん",
      "べと病"
    );

    console.log(`✅ 抽出結果:`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`❌ エラー:`, error);
  }
}

testPdfExtraction();
