/**
 * PDF内容抽出ユーティリティ
 *
 * Gemini File APIを使用してPDFから詳細予察情報を抽出
 */

import { DetailedForecastData } from "@/lib/types/boujo";

/**
 * PDFをダウンロードしてBase64エンコード
 */
async function downloadPdfAsBase64(pdfUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pdfUrl);

    if (!response.ok) {
      console.error(`PDF download failed: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return base64;
  } catch (error) {
    console.error('PDF download error:', error);
    return null;
  }
}

/**
 * Gemini APIを使用してPDFから詳細予察情報を抽出
 */
export async function extractForecastDataFromPdf(
  pdfUrl: string,
  crop: string,
  topic: string
): Promise<DetailedForecastData[]> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY が設定されていません');
    return [];
  }

  try {
    console.log(`📄 PDF内容抽出開始: ${pdfUrl}`);

    // PDFをBase64でダウンロード
    const pdfBase64 = await downloadPdfAsBase64(pdfUrl);
    if (!pdfBase64) {
      console.error('PDF download failed');
      return [];
    }

    console.log(`✅ PDF downloaded, size: ${pdfBase64.length} bytes (base64)`);

    // Gemini APIでPDFを解析
    const prompt = `このPDFは新潟県の病害虫発生予察情報です。以下の情報を抽出してJSON形式で出力してください。

対象作物: ${crop}
対象病害虫: ${topic}

【重要】必ず「予報の根拠」セクションから①②③などの項目を抽出してください。

抽出する情報:
1. 作物名（例: 夏秋きゅうり、秋冬だいこん、秋冬ねぎ）
2. 病害虫名（例: べと病、うどんこ病、シロイチモジヨトウ）
3. 発生量（例: "やや少ない", "少ない", "並", "やや多い", "多い"）
4. 平年比
5. 発生程度（例: "少発生（発病度1-20）", "中発生（発病度21-40）", "多発生（発病度41-60）"）
6. 発病葉率/寄生葉率の範囲（例: "1～25%", "26～50%"）
7. **予報の根拠（必須）**: PDFに記載されている「予報の根拠」「発生要因」セクションから、①、②、③などの項目をすべて抽出してください。各項目には○、±、+、-などの指標が含まれる場合があります。

出力形式:
[
  {
    "crop": "作物名",
    "pest": "病害虫名",
    "occurrenceLevel": "発生量",
    "comparisonToAverage": "平年比",
    "occurrenceDegree": "発生程度",
    "percentageRange": "発病葉率/寄生葉率範囲",
    "rationale": [
      {
        "point": "①",
        "description": "7月上旬の発生状況は平年比やや多い",
        "indicator": "+"
      },
      {
        "point": "②",
        "description": "向こう1か月の気温は高い",
        "indicator": "+"
      }
    ]
  }
]

**必ず rationale 配列に予報の根拠を含めてください。根拠がない場合でも空配列ではなく、PDFから推測できる要因を記載してください。**

特に対象作物「${crop}」と対象病害虫「${topic}」に関連する情報を優先して抽出してください。
関連する情報が複数ある場合は、すべて抽出してください。

JSON配列のみを出力してください（説明文不要）。`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    };

    console.log(`🤖 Gemini API呼び出し中（PDF解析）...`);

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error: ${response.status} ${errorText}`);
      return [];
    }

    const geminiResponse = await response.json();
    console.log(`✅ Gemini APIレスポンス受信（PDF解析）`);

    let responseText = "";
    if (geminiResponse.candidates && geminiResponse.candidates[0]) {
      const candidate = geminiResponse.candidates[0];
      if (candidate.content && candidate.content.parts) {
        responseText = candidate.content.parts.map((part: any) => part.text || "").join("");
      }
    }

    console.log(`📄 Gemini PDF解析結果:`, responseText.substring(0, 500));

    // JSONをパース
    const detailedData = parseDetailedForecastOutput(responseText);
    console.log(`✅ 詳細予察情報抽出完了: ${detailedData.length}件`);

    return detailedData;
  } catch (error) {
    console.error('❌ PDF content extraction error:', error);
    return [];
  }
}

/**
 * Gemini出力をパース（DetailedForecastData[]に変換）
 */
function parseDetailedForecastOutput(text: string): DetailedForecastData[] {
  try {
    // まずそのままJSONパース
    return JSON.parse(text);
  } catch (e) {
    // JSONブロックを抽出してリトライ
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[jsonMatch.length > 1 ? 1 : 0]);
      } catch (e2) {
        console.error('JSONブロック抽出後もパース失敗:', e2);
      }
    }

    console.warn('⚠️ PDF解析結果のJSON解析に失敗、空配列を返します');
    return [];
  }
}
