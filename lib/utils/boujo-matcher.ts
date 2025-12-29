// 防除暦アラート Rule Matchモジュール

import { BoujoItem, ProductInfo } from "@/lib/types/boujo";
import { searchProducts, inferProductType } from "@/lib/data/products";

/**
 * 病害虫名を正規化（網羅的な変種対応）
 *
 * 対応パターン:
 * 1. 接尾辞の除去: 「〜類」
 * 2. 部位接頭辞の除去: 「葉〜」「穂〜」「茎〜」「根〜」「株〜」「果〜」「幹〜」
 * 3. 病名パターン: 「〜病」の有無を正規化
 * 4. 虫名パターン: カタカナ長音記号の統一
 */
function normalizePestName(name: string): string {
  let normalized = name;

  // 1. 「〜類」を除去
  normalized = normalized.replace(/類$/, '');

  // 2. 部位接頭辞を除去（葉いもち → いもち）
  normalized = normalized.replace(/^(葉|穂|茎|根|株|果|幹)/, '');

  // 3. 「病」の有無を統一（いもち → いもち病 で統一）
  // ただし、既に「病」がついている場合はそのまま
  if (!normalized.endsWith('病') && !normalized.match(/(虫|ガ|ウンカ|ヨトウ|アザミウマ|カメムシ|バエ|ゾウムシ|コガ|ダニ|アブラムシ)$/)) {
    // 虫名でない場合は病害とみなし「病」を追加（オプション）
    // ただし、すでに病名が明確な場合のみ
    const diseaseKeywords = ['いもち', 'もち', '枯', '腐', '斑', '紋', 'べと', 'さび', '疫', '萎', 'こうじ'];
    if (diseaseKeywords.some(kw => normalized.includes(kw))) {
      normalized = normalized + '病';
    }
  }

  // 4. カタカナ長音記号の統一（ヨトウー → ヨトウ）
  normalized = normalized.replace(/ー/g, '');

  // 5. 小文字・大文字の統一（不要だが念のため）
  // 日本語は関係ないのでスキップ

  return normalized;
}

/**
 * 課題（BoujoItem）から製品候補を抽出
 */
export function matchProducts(item: BoujoItem): ProductInfo[] {
  const { crop, topic } = item;

  // トピックから製品タイプを推論
  const productType = inferProductType(topic);

  // 製品検索
  const candidates = searchProducts({
    crop,
    topic,
    type: productType || undefined,
  });

  // 完全一致のみを返す（適用作物・対象が一致）
  const matched = candidates.filter(product => {
    // 作物が完全一致
    const cropMatches = product.applicable_crops.some(c =>
      c === crop || c.includes(crop) || crop.includes(c)
    );
    if (!cropMatches) return false;

    // トピックが対象病害虫または対象雑草に含まれる
    if (product.target_pests) {
      const pestMatches = product.target_pests.some(pest => {
        // 完全一致
        if (pest === topic) return true;

        // 部分一致（両方向）
        if (pest.includes(topic) || topic.includes(pest)) return true;

        // 【正規化マッチング】複数の正規化パターンでマッチング
        const normalizedTopic = normalizePestName(topic);
        const normalizedPest = normalizePestName(pest);

        // 正規化後の名前でマッチング
        if (normalizedTopic === normalizedPest) return true;
        if (normalizedPest.includes(normalizedTopic) || normalizedTopic.includes(normalizedPest)) return true;

        return false;
      });
      if (pestMatches) return true;
    }

    if (product.target_weeds) {
      // 雑草の場合は、トピックに「雑草」「畦畔」「畦間」が含まれていればマッチ
      const weedKeywords = ["雑草", "畦畔", "畦間", "畔"];
      const topicHasWeedKeyword = weedKeywords.some(kw => topic.includes(kw));
      if (topicHasWeedKeyword) return true;
    }

    return false;
  });

  // スコアリング（より具体的な製品を優先）
  return matched.sort((a, b) => {
    // 適用作物が完全一致する製品を優先
    const aCropExact = a.applicable_crops.includes(crop as any) ? 1 : 0;
    const bCropExact = b.applicable_crops.includes(crop as any) ? 1 : 0;
    if (aCropExact !== bCropExact) return bCropExact - aCropExact;

    // 対象病害虫・雑草の数が少ない方が特化型と判断
    const aTargetCount = (a.target_pests?.length || 0) + (a.target_weeds?.length || 0);
    const bTargetCount = (b.target_pests?.length || 0) + (b.target_weeds?.length || 0);
    return aTargetCount - bTargetCount;
  });
}

/**
 * 製品候補をClaudeInput形式に変換
 */
export function formatProductCandidates(products: ProductInfo[]) {
  return products.map(p => ({
    id: p.id,
    name: p.name,
    label_url: p.label_url,
    label_excerpt: p.label_excerpt,
  }));
}

/**
 * 二本根拠チェック（県URL + ラベルURL）
 */
export function hasTwoEvidence(
  forecastUrl: string,
  productUrls: string[]
): boolean {
  return !!forecastUrl && productUrls.length > 0;
}
