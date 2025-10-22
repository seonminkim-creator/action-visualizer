import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type AnalyzeResult = {
  summary: string;
  explicit_points: string[];
  inferred_actions: Array<{ text: string; priority: "high" | "medium" | "low"; assignee: string }>;
  detailed_analysis: string;
};

const SCHEMA = {
  type: "object",
  required: ["summary", "explicit_points", "inferred_actions", "detailed_analysis"],
  properties: {
    summary: { type: "string", maxLength: 140 },
    explicit_points: { type: "array", minItems: 1, maxItems: 7, items: { type: "string", maxLength: 140 } },
    inferred_actions: { 
      type: "array", 
      minItems: 1, 
      maxItems: 7, 
      items: { 
        type: "object",
        required: ["text", "priority", "assignee"],
        properties: {
          text: { type: "string", maxLength: 140 },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          assignee: { type: "string", maxLength: 50 }
        }
      }
    },
    detailed_analysis: { type: "string", maxLength: 500 }
  },
  additionalProperties: false,
} as const;

function cleanText(input: string): string {
  let t = (input || "").replace(/\r/g, "");
  t = t.split(/\n-{2,}\s*(Original Message|元のメッセージ)\s*-{2,}|\nOn .* wrote:|\nFrom:\s|\n差出人:\s/i)[0] || t;
  t = t.replace(/\n--+\n[\s\S]*$/m, "");
  return t.trim().slice(0, 6000);
}

function fallbackData(): AnalyzeResult {
  return {
    summary: "【エラー】API接続に問題があります",
    explicit_points: ["APIキーを確認してください"],
    inferred_actions: [{ text: "環境変数の設定を確認してください", priority: "high", assignee: "その他" }],
    detailed_analysis: "API接続に問題が発生しました。環境変数の設定を確認してください。"
  };
}

export async function POST(req: NextRequest) {
  try {
    const { text, userName } = (await req.json()) as { text?: string; userName?: string };
    if (!text || !text.trim()) {
      return NextResponse.json({ 
        summary: "", 
        explicit_points: [], 
        inferred_actions: [],
        detailed_analysis: ""
      });
    }

    const cleaned = cleanText(text);
    
    // モックモード
    const USE_MOCK = process.env.USE_MOCK === "true";
    if (USE_MOCK) {
      console.log("🔧 モックモードで動作中");
      const words = cleaned.split(/\s+/).slice(0, 20).join(" ");
      return NextResponse.json({
        summary: `【モック】${words.slice(0, 80)}${words.length > 80 ? "..." : ""}の解析結果`,
        explicit_points: [
          "配信結果のサマリー作成（媒体別・キャンペーン別）",
          "主要KPI推移の提示（CTR/CVR/CPAなど）",
          "成果要因の考察と改善提案"
        ],
        inferred_actions: [
          { text: "提出期限と提出先の確認", priority: "high", assignee: userName || "その他" },
          { text: "過去レポートフォーマットの参照", priority: "medium", assignee: userName || "その他" },
          { text: "社内レビュー用の時間確保", priority: "high", assignee: userName || "その他" },
          { text: "顧客向けに内容を調整", priority: "medium", assignee: userName || "その他" }
        ],
        detailed_analysis: "広告運用実績レポートの作成依頼です。配信結果、KPI推移、改善提案を含む10枚以内の資料を正午までに提出する必要があります。社内レビュー後、BASFジャパン様向け定例会で使用されます。"
      });
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    const aiProvider = process.env.AI_PROVIDER || "gemini";

    console.log("=== DEBUG ===");
    console.log("API Key exists:", !!apiKey);
    console.log("API Key prefix:", apiKey?.substring(0, 10));
    console.log("AI Provider:", aiProvider);
    console.log("USE_MOCK:", process.env.USE_MOCK);
    console.log("=============");

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found, returning fallback data");
      return NextResponse.json(fallbackData());
    }

    const SYSTEM_PROMPT = `あなたは営業やビジネス文書の支援に特化した「アクション可視化アシスタント」です。
与えられた任意の文章（顧客メール、議事メモ、上長指示、TODOの羅列など）を読み取り、今やるべきことを簡潔に可視化します。

【ユーザー情報】
ユーザー名: ${userName || "不明"}

【目的】
* 文章から「依頼内容（明示の依頼/条件）」と「対応タスク（推論）」を分けて抽出
* 各タスクの担当者を推論
* 文章全体の詳細解説を提供
* 余計な説明を避け、要約1行＋箇条書きだけを返す

【出力仕様（厳守）】
必ず以下のJSON形式で返してください：
{
  "summary": "文章の要約（140文字以内、1行）",
  "explicit_points": ["依頼内容1", "依頼内容2", ...],
  "inferred_actions": [
    { "text": "対応タスク1", "priority": "high", "assignee": "担当者名" },
    { "text": "対応タスク2", "priority": "medium", "assignee": "担当者名" },
    ...
  ],
  "detailed_analysis": "文章全体の詳細解説（500文字以内）"
}

【ルール】
* explicit_points: 1〜7件、短文・命令形
* inferred_actions: 本当に「今すぐ着手すべき」タスクのみ抽出（最大3〜5件）
* 提出理由や背景情報（「〜のため」「〜に向けて」）は、タスクに含めない
* 「後で確認すればよい」程度のことは含めない
* 断定的な約束や納期の確約はしない
* 期日や資料名などが本文にある場合は、括弧で補足
* 重複は統合、短く・明瞭に
* 日英混在対応（日本語優先）

【担当者（assignee）の判定基準】
* ユーザー名が文中に明示的に登場する、または暗黙的にユーザー宛の依頼 → ユーザー名を使用
* 他の人物名が明示されている → その人物名
* 複数人への依頼や不明確 → "その他"
* チーム全体への依頼 → "チーム全体"

【優先度の判定基準】
* high（高）- 今日〜明日中に着手すべき:
  - 24時間以内の期限
  - 「至急」「緊急」「今日中」「明日まで」の表現
  - 他のタスクをブロックするもの
  - 承認や意思決定が必要で、遅延が大きな影響を与える
  - 顧客への即座の返答が必要
  
* medium（中）- 今週中に着手すべき:
  - 2日〜1週間程度の期限
  - 定期的な報告・レポート作成
  - 情報収集や準備作業
  - 重要だが緊急ではないタスク
  - 他の人の作業を待つ必要があるもの
  
* low（低）- 時間があるときに対応:
  - 1週間以上先の期限
  - 「できれば」「可能であれば」「余裕があれば」の表現
  - 補足的な確認事項
  - 期限が明示されていない
  - 情報共有・通知のみで行動不要

【詳細解説（detailed_analysis）】
* 文章全体の背景、目的、重要なポイントを500文字以内で説明
* 依頼の文脈、関係者、期限、成果物などを含める
* 箇条書きではなく、文章形式で記述

説明文は書かず、JSONのみを返してください。`;

    console.log("🤖 Gemini APIで解析中...");

    // リトライ機能付きでGemini API呼び出し
    let resp;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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
                      text: `${SYSTEM_PROMPT}\n\n【入力テキスト】\n${cleaned}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 800,
              },
            }),
          }
        );

        if (resp.ok) {
          break;
        }

        if (resp.status === 503) {
          lastError = await resp.text();
          if (attempt < 3) {
            console.log(`⏳ リトライ ${attempt}/3 (503エラー、2秒後に再試行)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }

        lastError = await resp.text();
        break;
      } catch (e) {
        lastError = String(e);
        if (attempt < 3) {
          console.log(`⏳ リトライ ${attempt}/3 (ネットワークエラー、2秒後に再試行)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!resp || !resp.ok) {
      console.error("Gemini API error:", resp?.status, lastError);
      return NextResponse.json(fallbackData());
    }

    const data = await resp.json();
    const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    try {
      // マークダウンのコードブロックを削除
      let cleanedJson = textOut.trim();
      if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson.replace(/^```json\s*\n?/, "").replace(/\n?```\s*$/, "");
      } else if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      
      const parsed = JSON.parse(cleanedJson);
      
      // 結果の検証
      if (
        parsed &&
        typeof parsed.summary === "string" &&
        Array.isArray(parsed.explicit_points) &&
        Array.isArray(parsed.inferred_actions)
      ) {
        console.log("✅ Gemini解析成功");
        return NextResponse.json(parsed);
      } else {
        console.error("Invalid response structure from Gemini");
        return NextResponse.json(fallbackData());
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Raw response:", textOut);
      return NextResponse.json(fallbackData());
    }
  } catch (e) {
    console.error("API route error:", e);
    return NextResponse.json(fallbackData());
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST /api/analyze with { text }" });
}