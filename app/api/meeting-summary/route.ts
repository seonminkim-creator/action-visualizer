import { NextRequest, NextResponse } from "next/server";
import { appendLog, generateUserId } from "@/lib/utils/logger";

// Vercel Pro最適化: Node.js Runtime + 長時間実行
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Proプラン: 最大300秒（5分）- 長い議事録生成に対応

type MeetingSummary = {
  title: string; // 会議タイトル（自動生成）
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

  const SUMMARIZE_PROMPT = `以下の会議の文字起こしを、重要な内容を保ちながら極めて簡潔に要約してください。

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: SUMMARIZE_PROMPT }] }],
          generationConfig: {
            temperature: 0.1, // Gemini API最適化: より決定的に高速化
            topP: 0.8,
            topK: 20,
            maxOutputTokens: 8192,
            candidateCount: 1, // Gemini API最適化: 1つの候補のみ生成（高速化）
          },
        }),
        signal: AbortSignal.timeout(120000), // Vercel Pro: 120秒タイムアウト（第1段階：要約）
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
  const userId = generateUserId(req);

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

    // 文字数制限を緩和：35000文字まで直接処理（Vercel Pro最適化）
    const characterThreshold = 35000;
    let processedTranscript = transcript.trim();
    let usedTwoStage = false;

    if (processedTranscript.length > characterThreshold) {
      console.log(`⚠️ 文字数超過: ${processedTranscript.length}文字 > ${characterThreshold}文字`);
      return NextResponse.json(
        {
          error: "会議内容が長すぎます",
          details: `文字数: ${processedTranscript.length.toLocaleString()}文字。${characterThreshold.toLocaleString()}文字以下にしてください。`,
          processingTime: `${((Date.now() - startTime) / 1000).toFixed(1)}秒`,
        },
        { status: 400 }
      );
    }

    console.log(`✅ 直接処理: ${processedTranscript.length}文字 ≤ ${characterThreshold}文字`);

    console.log(`📝 議事録生成中...`);

    const SYSTEM_PROMPT = `あなたは会議の議事録を作成する専門AIアシスタントです。

【概要】
提供される文字起こしには [話者A], [話者B] などの話者ラベルが含まれている場合があります。
発言内容から、誰がどのような意見を述べ、最終的に誰が決定を下し、誰がTODOの担当になったかを正確に特定して整理してください。

【タスク】
会議の内容から以下の情報を抽出してJSON形式で返してください：

0. title（会議タイトル）
   - 会議の内容を端的に表す短いタイトル（15文字以内）
   - 例: "BASF定例会議", "営業代行進捗報告", "新製品企画MTG"

1. summary（会議サマリー）
   - purpose: 会議の目的（1-2文）
   - discussions: 主な議論内容（3-5項目の配列。誰が何を提案したかを含めるのが理想）
   - decisions: 決定事項（1-5項目の配列。決定者や経緯も含める）

2. todos（TODOリスト）
   - task: タスク内容
   - assignee: 担当者名（文字起こし内の名前や [話者A] などのラベルを元に特定）
   - deadline: 期限（言及があれば。なければ省略）
   - priority: 優先度（"high", "medium", "low"のいずれか）

3. detailedMinutes（詳細議事録）
   - 会議の流れを時系列で整理した詳細な議事録（Markdown形式）
   - 発言者を明記し、議論の対立点や合意点も記述してください。

【優先度の判定基準】
- high: 今日〜明日中に着手すべき、緊急性の高いタスク
- medium: 今週中に着手すべき、重要なタスク
- low: 時間があるときに対応、期限が明示されていないタスク

- JSON形式で返すこと
- titleは会議の主題を端的に表現（会社名・プロジェクト名+会議種別が理想）
- discussions と decisions は箇条書き形式で簡潔に（必ず「・」で始める）
- todos は具体的な行動項目のみ抽出
- detailedMinutes はMarkdown形式で記述してください。**見やすさを重視し、見出しには '###' のような記号を使わず、 '■ 1. 議題名' のように記号（■）と番号を使用してください。**
- 各議題（■）の間には必ず1行以上の空行を入れ、視覚的に区切ってください。
- **重要: 議題のタイトル以外（本文中）では太字（**テキスト**）を使用しないでください。強調したい場合は箇条書きを活用してください。**
- 担当者名が不明な場合は"未定"とする

必ずJSON形式で返してください。`;

    // モデル名の指定（より安定した2.0または1.5を優先）
    const modelName = "gemini-2.0-flash"; // または "gemini-1.5-flash"
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    console.log(`🤖 Gemini API (${modelName}) で議事録を作成中...`);

    let lastError = null;
    const maxRetries = 3; 

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          geminiUrl,
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
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              ],
              generationConfig: {
                temperature: 0.1,
                topP: 0.9,
                topK: 20,
                maxOutputTokens: 8192,
                candidateCount: 1,
                responseMimeType: "application/json",
                responseSchema: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string"
                    },
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
                  required: ["title", "summary", "todos", "detailedMinutes"]
                }
              },
            }),
            signal: AbortSignal.timeout(180000), // Vercel Pro: 180秒（3分）タイムアウト
          }
        );

        if (response.ok) {
          const data = await response.json();
          const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

          try {
            const parsed = JSON.parse(textOut) as MeetingSummary;
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Gemini API成功（試行${attempt}回目、処理時間: ${duration}秒）`);

            // ログ保存（成功）
            appendLog({
              id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              userId,
              action: 'meeting-summary',
              status: 'success',
              characterCount: processedTranscript.length,
              processingTime: Date.now() - startTime,
              userAgent: req.headers.get('user-agent') || undefined,
            });

            // 太字（**）を除去する後処理
            const cleanText = (text: string) => text.replace(/\*\*/g, "");
            
            parsed.detailedMinutes = cleanText(parsed.detailedMinutes);
            parsed.summary.purpose = cleanText(parsed.summary.purpose);
            parsed.summary.discussions = parsed.summary.discussions.map(cleanText);
            parsed.summary.decisions = parsed.summary.decisions.map(cleanText);
            parsed.todos = parsed.todos.map(todo => ({
              ...todo,
              task: cleanText(todo.task),
              assignee: cleanText(todo.assignee),
            }));

            return NextResponse.json(parsed);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            console.log("--- RAW OUTPUT START ---");
            console.log(textOut.length > 500 ? `${textOut.substring(0, 250)}...[TRUNCATED]...${textOut.substring(textOut.length - 250)}` : textOut);
            console.log("--- RAW OUTPUT END ---");
            lastError = "JSONのパースに失敗しました";
            if (attempt === maxRetries) break;
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }

        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          // Vercel Pro: エクスポネンシャルバックオフ（余裕のある300秒制限）
          const backoffSeconds = Math.min(Math.pow(2, attempt), 30); // 2, 4, 8, 16, 30秒
          console.log(`⏳ Gemini APIリトライ ${attempt}/${maxRetries} (status=${response.status}、${backoffSeconds}秒後に再試行)`);
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
          // Vercel Pro: エクスポネンシャルバックオフ
          const backoffSeconds = Math.min(Math.pow(2, attempt), 30);
          console.log(`⏳ リトライ ${attempt}/${maxRetries} (${backoffSeconds}秒後に再試行)`);
          await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
        }
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ 議事録生成に失敗しました（${maxRetries}回試行、処理時間: ${totalDuration}秒）:`, lastError);

    // ログ保存（失敗）
    const errorMsg = typeof lastError === "string" ? lastError : (lastError as any)?.message || '不明なエラー';
    appendLog({
      id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      action: 'meeting-summary',
      status: 'error',
      characterCount: processedTranscript.length,
      processingTime: Date.now() - startTime,
      errorMessage: errorMsg,
      userAgent: req.headers.get('user-agent') || undefined,
    });

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
