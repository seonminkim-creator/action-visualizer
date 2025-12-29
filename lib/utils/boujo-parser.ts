// 防除暦アラート Parseモジュール

import { BoujoItem } from "@/lib/types/boujo";
import {
  extractCategory,
  extractCrop,
  extractTopic,
  determineSeverity,
  extractDate,
  extractIssueNumber,
} from "@/lib/knowledge/boujo-dictionary";
import crypto from "crypto";

/**
 * HTMLリンク情報
 */
export type LinkInfo = {
  url: string;
  title: string;
  type: "html" | "pdf";
};

/**
 * タイトルとURLからBoujoItemを生成
 */
export function parseItem(link: LinkInfo, snippet: string = ""): BoujoItem | null {
  const { title, url, type } = link;

  // カテゴリ抽出（予報/注意報/警報/速報）
  const category = extractCategory(title);
  if (!category) {
    // カテゴリが見つからない場合はスキップ
    return null;
  }

  // 作物抽出
  const crop = extractCrop(title);
  if (!crop) {
    // 作物が見つからない場合はスキップ
    return null;
  }

  // トピック抽出
  const topic = extractTopic(title, snippet, crop);
  if (!topic) {
    // トピックが見つからない場合は、タイトルから推測
    // 例: 「速報第9号（ねぎのシロイチモジヨトウの発生状況）」→「シロイチモジヨトウ」
    const topicMatch = title.match(/[（(](.+?)[）)]/);
    if (!topicMatch) {
      return null;
    }
  }

  // 緊急度判定
  const severity = determineSeverity(category, snippet);

  // 日付抽出
  const date_iso = extractDate(title, snippet) || new Date().toISOString().split("T")[0];

  // ID生成（URLのハッシュ）
  const id = crypto.createHash("md5").update(url).digest("hex");

  // 現在時刻
  const created_at = new Date().toISOString();

  return {
    id,
    date_iso,
    region: "新潟県",
    crop,
    topic: topic || "",
    category,
    severity,
    title,
    source_url: url,
    doc_type: type,
    snippet,
    created_at,
  };
}

/**
 * 複数のリンクをパース
 */
export function parseItems(links: LinkInfo[], snippets: Map<string, string> = new Map()): BoujoItem[] {
  const items: BoujoItem[] = [];
  const seenIds = new Set<string>();

  for (const link of links) {
    const snippet = snippets.get(link.url) || "";
    const item = parseItem(link, snippet);

    if (item && !seenIds.has(item.id)) {
      items.push(item);
      seenIds.add(item.id);
    }
  }

  return items;
}

/**
 * URLハッシュで重複排除
 */
export function deduplicateItems(items: BoujoItem[]): BoujoItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * 日付・緊急度・号数でソート（新しい順・緊急度高い順）
 */
export function sortItems(items: BoujoItem[]): BoujoItem[] {
  return items.sort((a, b) => {
    // 緊急度比較（high > medium > low）
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;

    // 日付比較（新しい順）
    const dateDiff = new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime();
    if (dateDiff !== 0) return dateDiff;

    // 号数比較（新しい号数が大きい）
    const issueA = extractIssueNumber(a.title) || 0;
    const issueB = extractIssueNumber(b.title) || 0;
    return issueB - issueA;
  });
}
