import { NextRequest, NextResponse } from "next/server";

// Node.js Runtimeに変更（最大300秒実行可能）
export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Pro: 最大60秒

type MeetingSummary = {
  summary: {
    purpose: string;
    discussions: string[];
    decisions: string[];
  };
  todos: Array<{
    task: string;
    assignee: string;
    deadline?: string;
    priority: "high" | "medium" | "low";
  }>;
  detailedMinutes: string;
};

// 長い文字起こしを要約する関数（第1段階）
async function summarizeTranscript(transcript: string, apiKey: string): Promise<string> {
  // 超長文の場合はさらに積極的に要約
  const isVeryLong = transcript.length > 15000;
  const targetRatio = isVeryLong ? "20%" : "30%";

  const SUMMARIZE_PROMPT = `以下の会議の文字起こしを、重要な内容を保ちながら**極めて簡潔**に要約してください。

【要約のルール】
1. 会議の目的や背景を1-2文で記載
2. 主な議論内容を3-5個の箇条書きで記載（冗長な表現を避ける）
3. 決定事項やTODOは必ず含める
4. 参加者名や担当者名は省略せず記載
5. 数字や日付などの具体的な情報は省略しない
6. **要約後の文字数は元の${targetRatio}程度を目安にする（非常に短く）**

【会議の文字起こし】
${transcript}

上記を要約してください。`;

  console.log(`📝 第1段階: 文字起こしを要約中...（${transcript.length}文字 → 目標${targetRatio}）`);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: SUMMARIZE_PROMPT }] }],
          generationConfig: {
            temperature: 0.2, // より決定的に
            topP: 0.8,
            topK: 20,
            maxOutputTokens: isVeryLong ? 2000 : 3000, // 超長文は出力も制限
          },
        }),
        signal: AbortSignal.timeout(50000), // 50秒タイムアウト（第1段階：要約）
      }
    );

    if (response.ok) {
      const data = await response.json();
      const summarized = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      console.log(`✅ 第1段階完了: ${summarized.length}文字に要約`);
      return summarized;
    }

    throw new Error(`要約失敗: ${response.status}`);
  } catch (error) {
    console.error("要約エラー:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { transcript } = (await req.json()) as { transcript?: string };

    if (!transcript || !transcript.trim()) {
      return NextResponse.json(
        { error: "会議の内容を入力してください" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found");
      return NextResponse.json(
        { error: "API設定が不完全です" },
        { status: 500 }
      );
    }

    // 文字数制限を緩和：30000文字まで直接処理
    const characterThreshold = 30000;
    let processedTranscript = transcript.trim();
    let usedTwoStage = false;

    if (processedTranscript.length > characterThreshold) {
      console.log(`⚠️ 文字数超過: ${processedTranscript.length}文字 > ${characterThreshold}文字`);
      return NextResponse.json(
        {
          error: "会議内容が長すぎます",
          details: `文字数: ${processedTranscript.length}文字。30000文字以下にしてください。`,
          processingTime: `${((Date.now() - startTime) / 1000).toFixed(1)}秒`,
        },
        { status: 400 }
      );
    }

    console.log(`✅ 直接処理: ${processedTranscript.length}文字 ≤ ${characterThreshold}文字`);

    console.log(`📝 第${usedTwoStage ? '2' : '1'}段階: 議事録生成中...`);

    const SYSTEM_PROMPT = `あなたは会議の議事録を作成する専門AIアシスタントです。

【タスク】
会議の内容から以下の情報を抽出してJSON形式で返してください：

1. summary（会議サマリー）
   - purpose: 会議の目的（1-2文）
   - discussions: 主な議論内容（3-5項目の配列）
   - decisions: 決定事項（1-5項目の配列）

2. todos（TODOリスト）
   - task: タスク内容
   - assignee: 担当者名（言及があれば。なければ"未定"）
   - deadline: 期限（言及があれば。なければ省略）
   - priority: 優先度（"high", "medium", "low"のいずれか）

3. detailedMinutes（詳細議事録）
   - 会議の流れを時系列で整理した詳細な議事録（Markdown形式）

【優先度の判定基準】
- high: 今日〜明日中に着手すべき、緊急性の高いタスク
- medium: 今週中に着手すべき、重要なタスク
- low: 時間があるときに対応、期限が明示されていないタスク

【ルール】
- JSON形式で返すこと
- discussions と decisions は箇条書き形式で簡潔に（必ず「・」で始める）
- todos は具体的な行動項目のみ抽出
- detailedMinutes は発言の流れを整理して記述（見出しに「■」を使用）
- 担当者名が不明な場合は"未定"とする

【フォーマット例】
discussions: ["・新製品のローンチ日程について協議", "・マーケティング予算の見直しを検討"]
decisions: ["・ローンチ日を2024年3月15日に決定", "・予算を20%増額することで合意"]
detailedMinutes: "■ 会議概要\n本日の会議では...\n\n■ 議論内容\n・新製品について..."

必ずJSON形式で返してください。`;

    console.log("🤖 Gemini APIで議事録を作成中...");

    let lastError = null;
    const maxRetries = 3; // リトライ回数を削減

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${SYSTEM_PROMPT}\n\n【会議の内容】\n${processedTranscript}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2, // さらに低く設定して高速化
                topP: 0.9,
                topK: 30,
                maxOutputTokens: 8192, // Gemini 2.5 Proの最大出力トークン数
                responseMimeType: "application/json",
                responseSchema: {
                  type: "object",
                  properties: {
                    summary: {
                      type: "object",
                      properties: {
                        purpose: {
                          type: "string"
                        },
                        discussions: {
                          type: "array",
                          items: {
                            type: "string"
                          }
                        },
                        decisions: {
                          type: "array",
                          items: {
                            type: "string"
                          }
                        }
                      },
                      required: ["purpose", "discussions", "decisions"]
                    },
                    todos: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          task: {
                            type: "string"
                          },
                          assignee: {
                            type: "string"
                          },
                          deadline: {
                            type: "string"
                          },
                          priority: {
                            type: "string",
                            enum: ["high", "medium", "low"]
                          }
                        },
                        required: ["task", "assignee", "priority"]
                      }
                    },
                    detailedMinutes: {
                      type: "string"
                    }
                  },
                  required: ["summary", "todos", "detailedMinutes"]
                }
              },
            }),
            signal: AbortSignal.timeout(50000), // 50秒タイムアウト（第2段階：議事録生成）
          }
        );

        if (response.ok) {
          const data = await response.json();
          const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

          try {
            const parsed = JSON.parse(textOut) as MeetingSummary;
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Gemini API成功（試行${attempt}回目、処理時間: ${duration}秒）`);
            return NextResponse.json(parsed);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            lastError = "JSONのパースに失敗しました";
            break;
          }
        }

        if (response.status === 503 && attempt < maxRetries) {
          // 短縮版バックオフ: 1秒 → 2秒
          const backoffSeconds = attempt;
          console.log(`⏳ Gemini APIリトライ ${attempt}/${maxRetries} (503エラー、${backoffSeconds}秒後に再試行)`);
          await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
          continue;
        }

        lastError = `Gemini API error: ${response.status}`;
        console.error(lastError);
        break;
      } catch (e) {
        lastError = String(e);
        console.error(`Gemini API呼び出しエラー（試行${attempt}回目）:`, e);
        if (attempt < maxRetries) {
          const backoffSeconds = attempt; // 短縮版: 1秒 → 2秒
          console.log(`⏳ リトライ ${attempt}/${maxRetries} (${backoffSeconds}秒後に再試行)`);
          await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
        }
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ 議事録生成に失敗しました（${maxRetries}回試行、処理時間: ${totalDuration}秒）:`, lastError);

    let errorMessage = "議事録の生成に失敗しました。";
    let errorDetails = "";

    if (typeof lastError === "string") {
      if (lastError.includes("503")) {
        errorMessage = "AI分析サービスが一時的に混雑しています。";
        errorDetails = `処理に${totalDuration}秒かかりましたが、Gemini APIサーバーが過負荷状態です。1〜2分後に再度お試しください。`;
      } else if (lastError.includes("timeout") || lastError.includes("ETIMEDOUT")) {
        errorMessage = "処理がタイムアウトしました。";
        errorDetails = `処理に${totalDuration}秒かかりました。議事録生成には最大60秒程度かかる場合があります。もう一度お試しください。`;
      } else if (lastError.includes("JSON")) {
        errorMessage = "AIからの応答形式が正しくありませんでした。";
        errorDetails = "議事録の構造化に失敗しました。もう一度お試しください。";
      } else if (lastError.includes("fetch")) {
        errorMessage = "外部APIとの通信エラーが発生しました。";
        errorDetails = "Gemini AIとの通信に失敗しました。ネットワーク接続を確認してください。";
      } else {
        errorDetails = lastError;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails || "しばらく時間をおいてから再度お試しください。",
        processingTime: `${totalDuration}秒`,
      },
      { status: 500 }
    );
  } catch (e) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`API route error (処理時間: ${totalDuration}秒):`, e);

    let errorMessage = "エラーが発生しました";
    let errorDetails = "";

    if (e instanceof Error) {
      if (e.message.includes("timeout") || e.message.includes("ETIMEDOUT")) {
        errorMessage = "処理がタイムアウトしました。";
        errorDetails = `処理に${totalDuration}秒かかりました。議事録生成には最大60秒程度かかる場合があります。もう一度お試しください。`;
      } else {
        errorDetails = e.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails || "予期しないエラーが発生しました。",
        processingTime: `${totalDuration}秒`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: 'POST /api/meeting-summary with { transcript: string }',
  });
}
