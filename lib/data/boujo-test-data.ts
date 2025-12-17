// 防除暦アラート テストデータ

import { BoujoItem } from "@/lib/types/boujo";

/**
 * 実際のPDF病害虫予察情報に基づくBoujoItemサンプル
 * ソース: 令和7年度 新潟県病害虫発生予察情報
 */
export const TEST_BOUJO_ITEMS: BoujoItem[] = [
  // ケース1: 水稲 × 斑点米カメムシ類 × 注意報 × high（実データ: 注意報第2号）
  {
    id: "r7-advisory-002",
    date_iso: "2025-07-10",
    region: "新潟県",
    crop: "水稲",
    topic: "斑点米カメムシ類",
    category: "advisory",
    severity: "high",
    title: "令和7年度病害虫発生予察情報・注意報第2号（斑点米カメムシ類の多発生に注意）",
    source_url: "https://www.pref.niigata.lg.jp/sec/seikatonaebyo/",
    doc_type: "pdf",
    snippet: "アカスジカスミカメの7月上旬の畦畔すくい取り調査における確認地点率は平年比高く、虫数も平年比多い（71.6%、34.7頭）。その他の斑点米カメムシ類の確認地点率はやや高い～高く、虫数は平年並～平年比多い。向こう1か月の気温は高いと予想されており、斑点米カメムシ類の増殖や水田侵入後の加害活動が活発になると推測される。水田周辺の雑草管理、特に出穂したメヒシバの重点的除草が必要。",
    created_at: "2025-07-10T09:00:00Z",
    info_sources: ["県"],
  },

  // ケース2: 水稲 × 葉いもち × 速報 × medium（実データ: 速報第6号）
  {
    id: "r7-bulletin-006",
    date_iso: "2025-07-03",
    region: "新潟県",
    crop: "水稲",
    topic: "葉いもち",
    category: "bulletin",
    severity: "medium",
    title: "令和7年度 新潟県病害虫発生予察速報第6号（葉いもちの発生状況）",
    source_url: "https://www.pref.niigata.lg.jp/sec/seikatonaebyo/",
    doc_type: "pdf",
    snippet: "7月2日、柏崎市の平坦地域の一般ほ場（品種：新之助）で葉いもちの本田発生を確認した。病斑はn-1～n-2葉にあり、長さ10～15mm程度の慢性型（ybg及びypg）や長さ3～5mm程度の進展型（pg）であった。発病株率は約70%であった。このほ場周辺のほ場3筆（品種：新之助）においても発生を確認した。長岡市（旧寺泊町）の一般ほ場（品種：新之助）でも発生が確認されている。葉いもちの早期発見に努め、発生状況に応じて適切に防除対応する。特に新之助などのほ場抵抗性が弱い品種には注意する。",
    created_at: "2025-07-03T09:00:00Z",
    info_sources: ["県"],
  },

  // ケース3: 秋冬ねぎ × シロイチモジヨトウ × 速報 × high（実データ: 速報第9号）
  {
    id: "r7-bulletin-009",
    date_iso: "2025-09-08",
    region: "新潟県",
    crop: "秋冬ねぎ",
    topic: "シロイチモジヨトウ",
    category: "bulletin",
    severity: "high",
    title: "令和7年度 新潟県病害虫発生予察速報第9号（ねぎのシロイチモジヨトウの発生状況）",
    source_url: "https://www.pref.niigata.lg.jp/sec/seikatonaebyo/",
    doc_type: "pdf",
    snippet: "防除所が実施した秋冬ねぎの巡回調査では、6月後半調査以降被害株が確認され、8月後半まで被害株率は平年比やや多い～多いで推移している。フェロモントラップによる誘殺数は、胎内市菅田では8月中旬から急増し、平年を大きく上回っている。気象庁発表の向こう1か月予報では、気温は高いと予報されており、増殖や食害が助長されると考えられる。ほ場をこまめに見回り、卵塊や若齢幼虫の早期発見と除去に努める。幼虫の齢期が進むと薬剤感受性が低下するため、若齢幼虫期に薬剤散布を実施。",
    created_at: "2025-09-08T09:00:00Z",
    info_sources: ["県"],
  },

  // ケース4: 水稲 × 斑点米カメムシ類 × 速報 × high（実データ: 速報第7号）
  {
    id: "r7-bulletin-007",
    date_iso: "2025-07-31",
    region: "新潟県",
    crop: "水稲",
    topic: "斑点米カメムシ類",
    category: "bulletin",
    severity: "medium",
    title: "令和7年度 新潟県病害虫発生予察速報第7号（斑点米カメムシ類の発生状況について）",
    source_url: "https://www.pref.niigata.lg.jp/sec/seikatonaebyo/",
    doc_type: "pdf",
    snippet: "7月下旬の水田畦畔すくい取り調査結果：アカスジカスミカメの確認地点率は平年並、すくい取り虫数は平年比やや多い（34.7%、9.5頭）。アカヒゲホソミドリカスミカメの確認地点率は平年比やや低い、すくい取り虫数は平年比やや少ない（32.0%、2.4頭）。オオトゲシラホシカメムシの確認地点率は平年比高い、すくい取り虫数は平年並（13.3%、0.2頭）。ホソハリカメムシの確認地点率は平年比やや高い、すくい取り虫数は平年並（6.7%、0.1頭）。7月10日発表の注意報第2号（斑点米カメムシ類の多発生に注意）を参照する。",
    created_at: "2025-07-31T09:00:00Z",
    info_sources: ["県"],
  },

  // ケース5: 水稲 × 斑点米カメムシ類 × 予報 × medium（実データ: 予報第4号）
  {
    id: "r7-forecast-004",
    date_iso: "2025-07-01",
    region: "新潟県",
    crop: "水稲",
    topic: "斑点米カメムシ類",
    category: "forecast",
    severity: "medium",
    title: "令和7年度新潟県病害虫発生予察情報・予報第4号（7月の発生予想）",
    source_url: "https://www.pref.niigata.lg.jp/sec/seikatonaebyo/",
    doc_type: "pdf",
    snippet: "斑点米カメムシ類の発生量は並～やや多い。6月下旬の畦畔すくい取り調査では、アカスジカスミカメの確認虫数は平年比やや多い、確認地点率は平年比高い。アカヒゲホソミドリカスミカメの確認虫数は平年並、確認地点率も平年並。オオトゲシラホシカメムシの確認虫数は平年並、確認地点率も平年並。向こう1か月の気温は高いと予想されている。水田周辺の畦畔や水田内の雑草管理を徹底し、斑点米カメムシ類の密度低減、水田内への侵入防止に努める。今後の水稲の出穂期予報に留意し、品種ごとの適期防除に努める。",
    created_at: "2025-07-01T09:00:00Z",
    info_sources: ["県"],
  },

  // ケース6: 水稲 × 斑点米カメムシ類 × 予報 × high（実データ: 予報第5号）
  {
    id: "r7-forecast-005",
    date_iso: "2025-07-15",
    region: "新潟県",
    crop: "水稲",
    topic: "斑点米カメムシ類",
    category: "forecast",
    severity: "high",
    title: "令和7年度新潟県病害虫発生予察情報・予報第5号（7月後半の発生予想）",
    source_url: "https://www.pref.niigata.lg.jp/sec/seikatonaebyo/",
    doc_type: "pdf",
    snippet: "斑点米カメムシ類の発生量は多い。アカスジカスミカメの7月上旬の畦畔すくい取り調査における虫数は平年比多く、確認地点率も平年比高い。アカヒゲホソミドリカスミカメの確認地点率は平年比やや高い。向こう1か月の気温は高いと予想されている。7月10日発表の注意報第2号（斑点米カメムシ類の多発生に注意）を参照する。",
    created_at: "2025-07-15T09:00:00Z",
    info_sources: ["県"],
  },
];

/**
 * テスト用: 最新のアイテムを取得
 */
export function getLatestTestItems(count: number = 3): BoujoItem[] {
  return TEST_BOUJO_ITEMS.slice(0, count);
}

/**
 * テスト用: 作物でフィルタ
 */
export function getTestItemsByCrop(crop: string): BoujoItem[] {
  return TEST_BOUJO_ITEMS.filter(item => item.crop === crop);
}

/**
 * テスト用: 緊急度でフィルタ
 */
export function getTestItemsBySeverity(severity: string): BoujoItem[] {
  return TEST_BOUJO_ITEMS.filter(item => item.severity === severity);
}

/**
 * 同じ作物・トピックの組み合わせで、最新の情報のみを抽出
 */
export function getLatestUniqueItems(items: BoujoItem[]): BoujoItem[] {
  // 作物 + トピック のキーでグループ化
  const grouped = new Map<string, BoujoItem[]>();

  items.forEach(item => {
    const key = `${item.crop}-${item.topic}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  });

  // 各グループで最新の情報のみを抽出
  const latestItems: BoujoItem[] = [];

  grouped.forEach((groupItems) => {
    // date_iso で降順ソート（最新が最初）
    const sorted = groupItems.sort((a, b) => {
      return new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime();
    });

    // 最新のアイテムを追加
    latestItems.push(sorted[0]);
  });

  // 最終的に date_iso で降順ソート（最新が最初）
  return latestItems.sort((a, b) => {
    return new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime();
  });
}
