// 製品データベース（ラベル一次情報）

import { ProductInfo } from "@/lib/types/boujo";

/**
 * 製品データベース（MVP版）
 *
 * 注意：
 * - ラベル情報は原文を記載（言い換え禁止）
 * - 適用作物・対象・使用時期は必ず記載
 * - 製品URLは公式ページまたは製品ラベルPDFへのリンク
 * - 画像URLはプレースホルダー（実際の製品画像に差し替え可能）
 */
export const PRODUCT_DATABASE: ProductInfo[] = [
  // === 殺菌剤 ===
  {
    id: "fungicide-basf-001",
    name: "トップジンM®ゾル",
    type: "fungicide",
    image_url: "https://via.placeholder.com/200x300/4CAF50/FFFFFF?text=Topjin+M",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：稲（水稲）／対象：いもち病、紋枯病、稲こうじ病／使用時期：収穫14日前まで",
    applicable_crops: ["水稲"],
    target_pests: ["いもち病", "紋枯病", "稲こうじ病"],
    usage_timing: "収穫14日前まで",
    dosage: "1000倍希釈液を散布",
    notes: "総使用回数：3回以内（種子への処理は1回以内、は種後は2回以内）",
  },
  {
    id: "fungicide-basf-002",
    name: "オラクル®フロアブル",
    type: "fungicide",
    image_url: "https://via.placeholder.com/200x300/4CAF50/FFFFFF?text=Oracle",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：稲（水稲）／対象：いもち病、紋枯病、稲こうじ病、もみ枯細菌病／使用時期：収穫21日前まで",
    applicable_crops: ["水稲"],
    target_pests: ["いもち病", "紋枯病", "稲こうじ病", "もみ枯細菌病"],
    usage_timing: "収穫21日前まで",
    dosage: "1000倍希釈液を散布",
    notes: "総使用回数：3回以内",
  },
  {
    id: "fungicide-basf-003",
    name: "カンタスドライフロアブル®",
    type: "fungicide",
    image_url: "https://via.placeholder.com/200x300/4CAF50/FFFFFF?text=Cantus",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：大豆／対象：紫斑病、べと病、黒点病／使用時期：収穫7日前まで",
    applicable_crops: ["大豆"],
    target_pests: ["紫斑病", "べと病", "黒点病"],
    usage_timing: "収穫7日前まで",
    dosage: "1500倍希釈液を散布",
    notes: "総使用回数：3回以内",
  },
  {
    id: "fungicide-basf-004",
    name: "アミスター®20フロアブル",
    type: "fungicide",
    image_url: "https://via.placeholder.com/200x300/4CAF50/FFFFFF?text=Amistar",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：ねぎ／対象：さび病、疫病、黒斑病／使用時期：収穫3日前まで",
    applicable_crops: ["秋冬ねぎ"],
    target_pests: ["さび病", "疫病", "黒斑病"],
    usage_timing: "収穫3日前まで",
    dosage: "2000倍希釈液を散布",
    notes: "総使用回数：3回以内",
  },

  // === 殺虫剤 ===
  {
    id: "insecticide-basf-001",
    name: "フェニックス®顆粒水和剤",
    type: "insecticide",
    image_url: "https://via.placeholder.com/200x300/FF5722/FFFFFF?text=Phoenix",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：稲（水稲）／対象：ウンカ類、ツマグロヨコバイ、カメムシ類／使用時期：収穫14日前まで",
    applicable_crops: ["水稲"],
    target_pests: ["ウンカ類", "ツマグロヨコバイ", "カメムシ類", "斑点米カメムシ"],
    usage_timing: "収穫14日前まで",
    dosage: "2000倍希釈液を散布",
    notes: "総使用回数：3回以内",
  },
  {
    id: "insecticide-basf-002",
    name: "カスケード®乳剤",
    type: "insecticide",
    image_url: "https://via.placeholder.com/200x300/FF5722/FFFFFF?text=Cascade",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：大豆／対象：ハスモンヨトウ、マメシンクイガ、カメムシ類／使用時期：収穫7日前まで",
    applicable_crops: ["大豆"],
    target_pests: ["ハスモンヨトウ", "マメシンクイガ", "カメムシ類"],
    usage_timing: "収穫7日前まで",
    dosage: "2000倍希釈液を散布",
    notes: "総使用回数：3回以内",
  },
  {
    id: "insecticide-basf-003",
    name: "フェニックス®フロアブル",
    type: "insecticide",
    image_url: "https://via.placeholder.com/200x300/FF5722/FFFFFF?text=Phoenix+FL",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：ねぎ／対象：シロイチモジヨトウ、ネギアザミウマ、ネギハモグリバエ／使用時期：収穫3日前まで",
    applicable_crops: ["秋冬ねぎ"],
    target_pests: ["シロイチモジヨトウ", "ネギアザミウマ", "アザミウマ", "ネギハモグリバエ"],
    usage_timing: "収穫3日前まで",
    dosage: "2000倍希釈液を散布",
    notes: "総使用回数：3回以内",
  },
  {
    id: "insecticide-basf-004",
    name: "アファーム®乳剤",
    type: "insecticide",
    image_url: "https://via.placeholder.com/200x300/FF5722/FFFFFF?text=Affirm",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：ねぎ／対象：シロイチモジヨトウ、ネギコガ、ネギハモグリバエ／使用時期：収穫前日まで",
    applicable_crops: ["秋冬ねぎ"],
    target_pests: ["シロイチモジヨトウ", "ネギコガ", "ネギハモグリバエ"],
    usage_timing: "収穫前日まで",
    dosage: "2000倍希釈液を散布",
    notes: "総使用回数：3回以内",
  },

  // === 除草剤 ===
  {
    id: "herbicide-basf-001",
    name: "バスタ®液剤",
    type: "herbicide",
    image_url: "https://via.placeholder.com/200x300/FFC107/000000?text=Basta",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用：水田畦畔・大豆畦間の雑草抑制／対象：一年生雑草、多年生雑草／使用時期：雑草生育期（草丈30cm以下）",
    applicable_crops: ["水稲", "大豆"],
    target_weeds: ["一年生雑草", "多年生雑草", "畦畔雑草", "畦間雑草"],
    usage_timing: "雑草生育期（草丈30cm以下）",
    dosage: "100-200倍希釈液を雑草茎葉散布",
    notes: "作物にかからないように注意。畦畔・畦間専用。収穫物への残留を避けるため使用時期を守る。",
  },
  {
    id: "herbicide-basf-002",
    name: "パワーガイザー®液剤",
    type: "herbicide",
    image_url: "https://via.placeholder.com/200x300/FFC107/000000?text=Power+Geyser",
    label_url: "https://crop-protection.basf.co.jp/product-information",
    label_excerpt: "適用作物：大豆／対象：畦間の一年生広葉雑草／使用時期：大豆出芽揃期～初生葉期（雑草発生始期～2葉期）",
    applicable_crops: ["大豆"],
    target_weeds: ["一年生広葉雑草", "畦間雑草"],
    usage_timing: "大豆出芽揃期～初生葉期（雑草発生始期～2葉期）",
    dosage: "300ml/10a（50-100L/10aの水で希釈）",
    notes: "砂土では使用不可。展着剤は加用しない。一時的な黄化が発生する場合があるが生育には影響しない。",
  },
];

/**
 * 病害虫名を正規化（変種対応）
 */
function normalizePestName(name: string): string {
  let normalized = name;
  normalized = normalized.replace(/類$/, '');
  normalized = normalized.replace(/^(葉|穂|茎|根|株|果|幹)/, '');

  if (!normalized.endsWith('病') && !normalized.match(/(虫|ガ|ウンカ|ヨトウ|アザミウマ|カメムシ|バエ|ゾウムシ|コガ|ダニ|アブラムシ)$/)) {
    const diseaseKeywords = ['いもち', 'もち', '枯', '腐', '斑', '紋', 'べと', 'さび', '疫', '萎', 'こうじ'];
    if (diseaseKeywords.some(kw => normalized.includes(kw))) {
      normalized = normalized + '病';
    }
  }

  normalized = normalized.replace(/ー/g, '');
  return normalized;
}

/**
 * 製品検索（作物・トピック・タイプで絞り込み）
 */
export function searchProducts(params: {
  crop?: string;
  topic?: string;
  type?: "fungicide" | "insecticide" | "herbicide";
}): ProductInfo[] {
  let results = PRODUCT_DATABASE;

  // 作物でフィルタ
  if (params.crop) {
    results = results.filter(p =>
      p.applicable_crops.some(c => c.includes(params.crop!) || params.crop!.includes(c))
    );
  }

  // タイプでフィルタ
  if (params.type) {
    results = results.filter(p => p.type === params.type);
  }

  // トピックでフィルタ（病害虫名または雑草）
  if (params.topic) {
    results = results.filter(p => {
      // 病害虫の場合
      if (p.target_pests) {
        const match = p.target_pests.some(pest => {
          // 直接マッチング
          if (pest.includes(params.topic!) || params.topic!.includes(pest)) return true;

          // 正規化してマッチング（葉いもち → いもち病 等）
          const normalizedTopic = normalizePestName(params.topic!);
          const normalizedPest = normalizePestName(pest);
          if (normalizedPest.includes(normalizedTopic) || normalizedTopic.includes(normalizedPest)) return true;

          return false;
        });
        if (match) return true;
      }
      // 雑草の場合（畦畔・畦間・雑草のキーワードで判定）
      if (p.target_weeds) {
        const weedKeywords = ["雑草", "畦畔", "畦間", "畔"];
        const topicHasWeedKeyword = weedKeywords.some(kw => params.topic!.includes(kw));
        if (topicHasWeedKeyword) return true;
      }
      return false;
    });
  }

  return results;
}

/**
 * 製品タイプを推論（トピックから）
 */
export function inferProductType(topic: string): "fungicide" | "insecticide" | "herbicide" | null {
  // 害虫（虫名に「虫」「ガ」「ウンカ」「ヨトウ」「アザミウマ」などが含まれる）
  // 注意：「斑点米カメムシ」のように「斑」を含む害虫名があるため、虫判定を先に行う
  if (topic.match(/虫|ガ|ウンカ|ヨトウ|アザミウマ|カメムシ|バエ|ゾウムシ|コガ|ダニ|アブラムシ/)) {
    return "insecticide";
  }
  // 病害（病名に「病」「斑」「腐」「枯」「疫」などが含まれる + 主要病害名の接頭辞付き変種）
  // 主要病害名: いもち、もち、紋枯、べと、さび、こうじ、白葉枯、縞葉枯 等
  if (topic.match(/病|斑|腐|枯|疫|べと|さび|うどんこ|萎/) ||
      topic.match(/(葉|穂|茎|根|株|果|幹)(いもち|もち|紋枯|べと|さび|こうじ|白葉枯|縞葉枯)/)) {
    return "fungicide";
  }
  // 雑草
  if (topic.match(/雑草|畦畔|畦間|畔|除草/)) {
    return "herbicide";
  }
  return null;
}
