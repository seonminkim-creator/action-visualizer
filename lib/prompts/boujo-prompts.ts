// 防除暦アラート Claudeプロンプト

/**
 * System プロンプト（固定）
 *
 * 仕様書「付録A」に基づく
 */
export const BOUJO_SYSTEM_PROMPT = `あなたは「農薬ラベル順守アシスタント」です。与えられた入力JSONの情報だけを根拠に、出力を日本語で作成します。推測・創作・一般知識の補完は禁止です。

【重要な制約】
- 入力JSON以外の情報は使用禁止
- 推測・創作不可
- ラベル文言（適用/対象/使用時期/用量）は原文抜粋のみ（言い換え禁止）
- ラベル外使用の示唆は厳禁

【出力形式】
出力はJSON形式で、以下のキーを含めてください：

{
  "status": "OK" | "HOLD",
  "summary": "120字以内の一文要約（行動語を含める）",
  "recommendations": [
    {
      "product_id": "製品ID",
      "reason": "適用作物／対象／使用時期（ラベル原文抜粋）",
      "label_url": "製品ラベルURL"
    }
  ],
  "links": {
    "forecast": "県ページURL",
    "product": ["製品ラベルURL配列"]
  }
}

【二本根拠ルール】
- 県ページURL（forecast）と製品ラベルURL（product）の両方が揃っている場合のみ status="OK"
- いずれかが欠けている場合は status="HOLD" とし、hold_reason に簡潔な理由を記載
- 例：{"status":"HOLD","hold_reason":"二本根拠が揃わないため提案保留","links":{"forecast":"https://...","product":[]}}

【推奨製品の選定】
- 入力JSONの product_candidates から、適用作物・対象・使用時期が完全一致するもののみ選択
- 最大3件まで推奨
- reason には必ずラベル原文抜粋を含める（「適用作物：○○／対象：△△／使用時期：□□」の形式）

【サマリ作成のポイント】
- 120字以内
- 行動語を含める（例：「対応を検討」「早期防除を実施」「注意が必要」）
- 具体的な作物名・病害虫名を含める
- 緊急度に応じた表現を使用（high=「急ぐ」「警戒」、medium=「注意」「検討」、low=「確認」「留意」）

【禁止事項】
- 用量・使用時期・注意事項の言い換えや要約
- ラベルに記載されていない使用方法の提案
- 製品候補にない製品の推奨
- 一般知識による補完`;

/**
 * User プロンプトを生成
 */
export function generateUserPrompt(params: {
  region: string;
  crop: string;
  item: {
    category: string;
    title: string;
    published_at: string;
    source_url: string;
    severity: string;
    snippet: string;
  };
  product_candidates: {
    id: string;
    name: string;
    label_url: string;
    label_excerpt: string;
  }[];
}): string {
  const { region, crop, item, product_candidates } = params;

  return `以下の情報を元に、営業担当者向けのアラートカードを作成してください。

【地域】
${region}

【作物】
${crop}

【予察情報】
- カテゴリ: ${item.category}
- タイトル: ${item.title}
- 発表日: ${item.published_at}
- 緊急度: ${item.severity}
- 県ページURL: ${item.source_url}
- 本文抜粋:
${item.snippet || "（本文なし）"}

【製品候補】
${product_candidates.length > 0
    ? product_candidates.map((p, i) => `${i + 1}. ${p.name}
   - ID: ${p.id}
   - ラベル情報: ${p.label_excerpt}
   - ラベルURL: ${p.label_url}`).join("\n\n")
    : "（該当製品なし）"}

上記の情報を元に、JSON形式で出力してください。
- summary は120字以内で、営業担当者が即座に行動を判断できる内容にしてください
- recommendations は最大3件まで
- 二本根拠（県URL・ラベルURL）が揃わない場合は status="HOLD" としてください`;
}

/**
 * Claude出力をパース（エラーハンドリング付き）
 */
export function parseClaudeOutput(text: string): any {
  try {
    // まずそのままJSONパース
    return JSON.parse(text);
  } catch (e) {
    // JSONブロックを抽出してリトライ
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[jsonMatch.length > 1 ? 1 : 0]);
      } catch (e2) {
        console.error("JSONブロック抽出後もパース失敗:", e2);
      }
    }
    throw new Error("JSON解析に失敗しました");
  }
}
