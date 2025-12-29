/**
 * 完全なフロー（スクレイピング + PDF抽出）のテストスクリプト
 */

import { scrapeNiigataPestForecasts, searchForecastsByTopic } from "../lib/utils/niigata-scraper";
import { extractForecastDataFromPdf } from "../lib/utils/pdf-extractor";

async function testFullFlow() {
  console.log(`🧪 完全なフローテスト開始`);

  try {
    // ステップ1: 新潟県の予察情報をスクレイピング
    console.log(`\n📋 ステップ1: 新潟県予察情報スクレイピング`);
    const forecastData = await scrapeNiigataPestForecasts();
    console.log(`✅ 取得件数: ${forecastData.forecasts.length}件`);

    // ステップ2: トピックで検索
    const topic = "だいこん";
    console.log(`\n🔍 ステップ2: トピック「${topic}」で検索`);
    const relatedForecasts = searchForecastsByTopic(forecastData.forecasts, topic);
    console.log(`✅ 関連予察: ${relatedForecasts.length}件`);

    relatedForecasts.forEach((f, i) => {
      console.log(`  ${i + 1}. [${f.category}] ${f.title}`);
      console.log(`     PDF: ${f.pdfUrl}`);
    });

    // ステップ3: 最初のPDFから詳細情報を抽出
    if (relatedForecasts.length > 0) {
      const firstForecast = relatedForecasts[0];
      console.log(`\n📄 ステップ3: PDF詳細情報抽出`);
      console.log(`  PDF URL: ${firstForecast.pdfUrl}`);

      const detailedData = await extractForecastDataFromPdf(
        firstForecast.pdfUrl,
        "秋冬だいこん",
        "べと病"
      );

      console.log(`\n✅ 抽出データ:`);
      console.log(JSON.stringify(detailedData, null, 2));
    }

  } catch (error) {
    console.error(`❌ エラー:`, error);
  }
}

testFullFlow();
