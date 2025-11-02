// 農業知識ベース（Phase 2: カタログ提供後に拡充予定）

/**
 * 農業用語辞書
 * 日報生成時にAIが参照する用語集
 */
export const agricultureTerms = {
  // 育苗関連
  育苗: "種から苗を育てること。温度・湿度管理が重要",
  定植: "育てた苗を本圃（畑や水田）に植え付けること",
  発芽: "種が芽を出すこと。温度・水分・酸素が必要",
  徒長: "苗が過度に伸びて弱々しくなる現象。光不足が原因",

  // 栽培管理
  施肥: "肥料を与えること。作物の生育に必要な養分を供給",
  追肥: "作物の生育途中に追加で肥料を与えること",
  潅水: "水やりのこと。作物の水分要求に応じて管理",
  整枝: "作物の枝や茎を整理すること。収量・品質向上が目的",
  摘心: "主茎や側枝の先端を摘み取ること。分枝を促進",

  // 病害虫
  病害: "病原菌による作物の病気",
  虫害: "害虫による作物への被害",
  防除: "病害虫の発生を予防・駆除すること",

  // 作物種類
  果菜類: "トマト、キュウリ、ナスなど実を食べる野菜",
  葉菜類: "レタス、キャベツ、ホウレンソウなど葉を食べる野菜",
  根菜類: "ニンジン、ダイコンなど根を食べる野菜",

  // 栽培方式
  露地栽培: "屋外の畑で栽培する方式",
  施設栽培: "ハウスなどの施設内で栽培する方式",
  水耕栽培: "土を使わず、水と養液で栽培する方式",

  // その他
  本圃: "定植後に作物を育てる本格的な畑",
  育苗培土: "育苗に使用する専用の土",
  養液: "水耕栽培で使用する肥料を溶かした水",
  ハウス: "ビニールハウスやガラス温室などの栽培施設",
};

/**
 * 製品カタログ
 * BASFの農業資材製品情報
 */
export const productCatalog = {
  パワーガイザー液剤: {
    fullName: "パワーガイザー®液剤",
    manufacturer: "BASF",
    category: "除草剤",
    registrationNumber: "第20023号",
    activeIngredient: "イマザモックスアンモニウム塩 0.85%",
    classification: "除草剤分類 2",
    toxicity: "普通物（毒劇物に該当しないものを指していう通称）",
    targetCrops: [
      "小豆（あずき）",
      "いんげんまめ",
      "大豆（だいず）",
      "えだまめ",
      "さやいんげん",
      "おうぎ",
      "甘草"
    ],
    targetWeeds: ["一年生雑草", "一年生広葉雑草"],
    features: [
      "豆類専用の土壌・茎葉処理除草剤",
      "イネ科・広葉雑草に幅広く効果",
      "雑草発生始期から2葉期にかけて高い効果",
      "畦間処理も可能（作物に飛散させないよう注意）"
    ],
    usageTiming: "出芽直前～出芽揃期（雑草発生始期～発生揃期）",
    applicationRate: "200～300ml/10a",
    waterVolume: "100ℓ/10a",
    applicationMethod: "雑草茎葉散布又は全面土壌散布、畦間雑草茎葉散布",
    maxApplications: "2回以内（畦間処理は1回以内）",
    precautions: [
      "展着剤は加用しない",
      "有機リン系殺虫剤またはイネ科雑草処理除草剤との10日以内の近接散布を避ける",
      "砂土では使用しない",
      "ドリフト軽減ノズルを使用（畦間散布時）",
      "周辺作物への飛散に注意（特に水稲、小麦、とうもろこし、そば、ばれいしょ等）"
    ],
    benefits: [
      "雑草よ、お前たちの負けだ - 強力な除草効果",
      "豆類栽培の雑草管理を効率化",
      "作物への影響を最小限に抑えた選択性除草剤"
    ]
  },
  // 今後、他の製品も追加予定
};

/**
 * 良い日報の例（Few-shot学習用）
 * 実際の優良日報を模範として追加
 */
export const reportExamples = [
  {
    title: "○○農園 大豆栽培における除草剤提案",
    visitInfo: {
      destination: "○○農園",
      participants: ["代表 田中太郎様", "営業担当 山田"]
    },
    targetProducts: ["パワーガイザー®液剤"],
    visitSummary: {
      purpose: "大豆栽培における雑草防除の課題解決と、パワーガイザー液剤の導入提案",
      result: "現状の除草作業が手作業で労力がかかっている点を確認。パワーガイザー液剤による省力化に強い関心を示していただいた。10a圃場での試験導入を検討いただける見込み",
      proposal: "パワーガイザー液剤300ml/10aを出芽揃期（雑草発生始期）に散布する方法を提案。展着剤不要で作業が簡便な点、畦間処理も可能な点を強調した",
      challenges: "散布タイミングの見極めが重要。雑草が大きくなりすぎると効果が低下するため、発生始期～2葉期の適期散布を徹底する必要がある。また、周辺に水稲圃場があるため、ドリフト対策が必須",
      nextSteps: "来週、10a圃場での試験区設定を実施。散布適期（6月中旬予定）に立ち会い、散布方法の指導を行う。効果確認は散布後2～3週間で実施予定"
    }
  },
  {
    title: "△△農場 いんげんまめ栽培の技術指導",
    visitInfo: {
      destination: "△△農場",
      participants: ["場長 鈴木花子様", "栽培担当 佐藤様", "営業担当 山田"]
    },
    targetProducts: ["パワーガイザー®液剤"],
    visitSummary: {
      purpose: "いんげんまめ栽培における雑草管理の技術指導と、パワーガイザー液剤の効果確認",
      result: "前回提案したパワーガイザー液剤の散布後、一年生広葉雑草が1週間程度で変色し始め、2週間後にはほぼ枯死を確認。作物への薬害も見られず、効果に満足いただいた",
      proposal: "次作でも継続使用を提案。畦間散布を活用することで、より省力的な雑草管理が可能になることを説明。ドリフト軽減ノズルの活用を推奨した",
      challenges: "散布時期が遅れると効果が低下する懸念。圃場の見回りスケジュールを確認し、適期散布のアラート設定を提案した",
      nextSteps: "次作（8月播種予定）での継続使用を内定。播種前に改めて訪問し、散布計画を確認する。年間2haでの導入を目標に進める"
    }
  }
];

/**
 * 農業知識をプロンプトに注入する関数
 * Phase 2で /app/api/daily-report/route.ts から呼び出す予定
 */
export function getAgricultureKnowledge(): string {
  const termsText = Object.entries(agricultureTerms)
    .map(([term, definition]) => `- ${term}: ${definition}`)
    .join("\n");

  return `
【農業用語の知識】
${termsText}

※ 日報作成時に上記の用語が出てきた場合は、正確に使用してください。
`;
}

/**
 * 製品情報をプロンプトに注入する関数
 */
export function getProductKnowledge(productNames?: string[]): string {
  if (!productNames || productNames.length === 0) {
    // 製品指定がない場合は全製品の概要を返す
    const allProducts = Object.entries(productCatalog).map(([key, product]) => {
      return `- ${product.fullName}（${product.category}）: ${product.targetCrops.slice(0, 3).join("、")}等に使用`;
    }).join("\n");

    return `
【取扱製品情報】
${allProducts}

※ 日報に製品名が出てきた場合は、正式名称（®マーク含む）を使用してください。
`;
  }

  // 指定製品の詳細情報を返す
  const productDetails = productNames.map(name => {
    // 製品名のマッチング（部分一致も許容）
    const matchedKey = Object.keys(productCatalog).find(key =>
      key.includes(name) || name.includes(key) ||
      productCatalog[key as keyof typeof productCatalog].fullName.includes(name)
    );

    if (!matchedKey) {
      return `- ${name}: 製品情報が見つかりません`;
    }

    const product = productCatalog[matchedKey as keyof typeof productCatalog];
    return `
【${product.fullName}】
- 製造元: ${product.manufacturer}
- 分類: ${product.category}
- 対象作物: ${product.targetCrops.join("、")}
- 特長: ${product.features.join(" / ")}
- 使用時期: ${product.usageTiming}
- 使用量: ${product.applicationRate}
- 注意事項: ${product.precautions.slice(0, 3).join(" / ")}
`;
  }).join("\n");

  return productDetails;
}

/**
 * Few-shot例をプロンプトに注入する関数
 */
export function getReportExamples(): string {
  if (reportExamples.length === 0) {
    return "";
  }

  const examples = reportExamples.map((example, index) => {
    return `
【例${index + 1}】
タイトル: ${example.title}
訪問先: ${example.visitInfo.destination}
参加者: ${example.visitInfo.participants.join(", ")}
商談対象製品: ${example.targetProducts.join(", ")}

① 目的: ${example.visitSummary.purpose}
② 結果: ${example.visitSummary.result}
③ 提案: ${example.visitSummary.proposal}
④ 課題: ${example.visitSummary.challenges}
⑤ 次のステップ: ${example.visitSummary.nextSteps}
`;
  }).join("\n---\n");

  return `
【良い日報の例】
以下は優良な日報の例です。このような構造と詳細レベルを参考にしてください：

${examples}

※ 上記の例を参考に、具体的で詳細な日報を作成してください。
`;
}
