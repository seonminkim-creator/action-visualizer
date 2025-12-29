// 新潟県病害虫防除所の実データに基づく知識ベース
// PDFソース: 令和7年度 病害虫発生予察情報・注意報・速報

/**
 * 病害虫別の具体的な防除対策（実データ）
 */
export const BOUJO_PREVENTION_STRATEGIES = {
  // 水稲
  "斑点米カメムシ": {
    crop: "水稲",
    severity_level: "high",
    primary_species: [
      "アカスジカスミカメ",
      "アカヒゲホソミドリカスミカメ",
      "オオトゲシラホシカメムシ",
      "ホソハリカメムシ",
      "クモヘリカメムシ",
    ],
    outbreak_data_2025: {
      source: "注意報第2号（令和7年7月10日）",
      level: "多い",
      key_findings: {
        アカスジカスミカメ: {
          confirmation_rate: "71.6%（平年比高）",
          insect_count: "34.7頭（平年比多）",
        },
        アカヒゲホソミドリカスミカメ: {
          confirmation_rate: "55.4%（平年比やや高）",
          insect_count: "4.1頭（平年並）",
        },
      },
    },
    prevention_measures: [
      {
        category: "水田周辺の雑草管理",
        details: [
          "出穂したイネ科雑草（特にメヒシバ）を重点的に早めに刈り取る",
          "水稲出穂後も、メヒシバ等のイネ科雑草が繁茂しないよう適宜草刈り",
          "アカスジカスミカメ及びアカヒゲホソミドリカスミカメは出穂したイネ科雑草を好む",
        ],
      },
      {
        category: "水田内雑草の管理",
        details: [
          "ノビエやイヌホタルイ等の穂に好んで産卵",
          "イネの出穂前や登熟前半にこれらの雑草が出穂すると早期に幼虫が発生",
          "雑草は早めに除去",
        ],
      },
      {
        category: "水田内の殺虫剤散布",
        details: [
          "液剤や粉剤を使用（粒剤はアカスジカスミカメに対する効果が低い傾向）",
          "粉剤使用時は周囲に飛散しないよう注意",
          "粒剤使用時は好天が続く日に散布、浅水管理、追加入水は田面水がなくなってから",
        ],
      },
      {
        category: "個別防除",
        timing: "出穂期の3日後頃～7日後（1回散布の場合）",
        details: [
          "中晩生品種も含め全品種に対して確実に防除",
        ],
      },
      {
        category: "共同防除",
        details: [
          "出穂期が共同防除予定日より10日以上早い水田は、共同防除の7日前頃に個別防除",
          "薬剤は共同防除で使用する薬剤とは異なる系統にする",
        ],
      },
      {
        category: "クモヘリカメムシ対策",
        details: [
          "中晩生品種で特に発生が多い",
          "発生が多い地域では液剤または粉剤により、全品種に対して2回の防除",
        ],
      },
    ],
    reference_url: "令和7年度病害虫発生予察情報・注意報第2号",
  },

  "葉いもち": {
    crop: "水稲",
    severity_level: "medium",
    outbreak_data_2025: {
      source: "速報第6号（令和7年7月3日）",
      locations: ["柏崎市（平坦地域）", "長岡市（旧寺泊町）"],
      variety: "新之助",
      infection_rate: "約70%",
      lesion_types: ["慢性型（ybg, ypg）10-15mm", "進展型（pg）3-5mm"],
    },
    prevention_measures: [
      {
        category: "早期発見と対応",
        details: [
          "葉いもちの早期発見に努める",
          "発生状況に応じて適切に防除対応",
          "新之助などほ場抵抗性が弱い品種に注意",
        ],
      },
      {
        category: "BLASTAM活用",
        details: [
          "感染好適条件の判定結果を参照",
          "広域的な出現は少ないが、一部地域で断続的に出現",
        ],
      },
      {
        category: "報告基準（コシヒカリBL）",
        thresholds: {
          "6月末まで": "発病を見つけたら",
          "7月前半（第1-3半旬）": "発病株率20%",
          "7月後半（第4半旬以降）": "発病株率30%",
        },
        details: [
          "基準を超える葉いもちの発生を認めた場合は、速やかに病害虫防除所に連絡",
        ],
      },
      {
        category: "病斑サンプリング",
        details: [
          "葉いもちを見つけた場合は病斑を採集",
          "農業総合研究所作物研究センター（栽培科病害担当）に送付",
        ],
      },
    ],
    reference_url: "令和7年度 新潟県病害虫発生予察速報第6号",
  },

  // 秋冬ねぎ
  "シロイチモジヨトウ": {
    crop: "秋冬ねぎ",
    severity_level: "high",
    outbreak_data_2025: {
      source: "速報第9号（令和7年9月8日）",
      damage_rate: "平年比やや多い～多い（6月後半以降）",
      trap_data: {
        聖籠町真野: "平年比やや少ない",
        胎内市菅田: "8月中旬から急増、平年を大きく上回る",
      },
      forecast: "気温高く、増殖や食害が助長される見込み",
    },
    prevention_measures: [
      {
        category: "早期発見と物理的防除",
        details: [
          "ほ場を見回って卵塊や若齢幼虫の早期発見と除去に努める",
          "ほ場周辺の雑草は発生源となるので除去",
        ],
      },
      {
        category: "薬剤散布の適期",
        timing: "若齢幼虫期",
        details: [
          "幼虫の齢期が進むと薬剤感受性が低下",
          "ねぎでは葉の内部に潜り込んで食害するため、薬剤がかかりにくい",
          "ほ場をこまめに見回り、若齢幼虫期に株全体に薬液が十分かかるようていねいに散布",
        ],
      },
      {
        category: "薬剤抵抗性対策",
        details: [
          "作用機構の同じ薬剤の連用を避ける",
          "RACコード（https://www.croplifejapan.org/labo/mechanism.html）を確認",
          "異なる薬剤をローテーションで使用",
        ],
      },
      {
        category: "寄主範囲",
        details: [
          "寄主範囲が広いため、ねぎ以外の野菜類、花き類にも注意",
        ],
      },
    ],
    reference_url: "令和7年度 新潟県病害虫発生予察速報第9号",
  },

  "ネギアザミウマ": {
    crop: "秋冬ねぎ",
    severity_level: "medium",
    outbreak_data_2025: {
      source: "予報第4号（7月の発生予想）",
      level: "やや多い（中発生）",
      damage_degree: "11-20",
    },
    prevention_measures: [
      {
        category: "定期防除",
        details: [
          "密度抑制に努める",
          "作用機構の同じ薬剤の連用は避ける",
          "作用機構の異なる薬剤をローテーションで使用",
        ],
      },
    ],
    reference_url: "令和7年度新潟県病害虫発生予察情報・予報第4号",
  },

  "オオタバコガ": {
    crop: "野菜・花き類",
    severity_level: "medium",
    outbreak_data_2025: {
      source: "速報第10号（令和7年9月26日）",
      trap_data: {
        聖籠町真野: "9月の誘殺数が平年を大きく上回る",
        新潟市西蒲区越前浜: "誘殺数が平年を大きく上回る",
        その他地点: "6地点中5地点で9月の誘殺数が平年より多い傾向",
      },
      forecast: "気温高く、増殖や食害が助長される見込み",
    },
    prevention_measures: [
      {
        category: "早期発見と物理的防除",
        details: [
          "広食性の害虫であり、多くの野菜、花き類などを食害",
          "ほ場を見回って卵塊や若齢幼虫の早期発見と除去に努める",
          "ほ場周辺の雑草に寄生が認められた場合も除去",
        ],
      },
      {
        category: "薬剤散布の適期",
        timing: "若齢幼虫期",
        details: [
          "幼虫の齢期が進むと薬剤の効果が大きく低下",
          "ほ場をこまめに見回り、若齢幼虫期に薬液が十分かかるようていねいに防除",
        ],
      },
      {
        category: "薬剤抵抗性対策",
        details: [
          "作用機構の同じ薬剤の連用を避ける",
          "RACコード（http://www.croplifejapan.org/labo/mechanism.html）を確認",
          "異なる薬剤をローテーションで使用",
        ],
      },
      {
        category: "寄主範囲",
        details: [
          "広食性のため、多くの野菜、花き類に注意を払う",
        ],
      },
    ],
    reference_url: "令和7年度 新潟県病害虫発生予察速報第10号",
  },

  // 西洋なし
  "セイヨウナシ褐色斑点病": {
    crop: "西洋なし",
    severity_level: "high",
    outbreak_data_2025: {
      source: "注意報第1号（令和7年7月2日）",
      level: "平年比多い",
      occurrence_status: [
        "5月から葉等で発生確認",
        "6月下旬には袋かけした果実での発生も確認",
        "地域間差はあるが、6月下旬の発生量は県全体で平年比多い",
        "前年の多発生を踏まえ対策を徹底しているが、発生の目立つ園地が見受けられる",
      ],
      risk_factors: [
        "本格的な梅雨時期をむかえ、雨水・雨滴や高湿度での伝染拡大",
        "降雨前防除の未実施や散布間隔の開きが懸念される",
      ],
    },
    prevention_measures: [
      {
        category: "発生状況の監視",
        details: [
          "今後の気象経過によっては発生拡大が懸念される",
          "病斑の早期発見及び園地の発生状況等の把握に努める",
        ],
      },
      {
        category: "耕種的防除",
        details: [
          "発病葉・果実等は摘み取って園外に持ち出して埋めるなど処分",
        ],
      },
      {
        category: "薬剤防除の徹底",
        timing: "重点防除時期：4月中旬～7月",
        details: [
          "他病害虫を含めて的確な薬剤散布等を実施",
          "散布間隔が空きすぎないように留意",
          "降雨が続くと予想される場合は、降雨前の薬剤散布を実施",
        ],
      },
      {
        category: "散布の工夫",
        details: [
          "事前に新梢管理を行う",
          "薬量を増やす",
          "スピードスプレイヤー走行間隔をつめたり縦横に走行する",
          "防除の死角をつくらないように注意",
          "片がけなどの死角になりやすい場所については補助散布を実施",
        ],
      },
      {
        category: "新梢管理",
        details: [
          "不要な新梢伸長が感染しやすい新葉を増やす",
          "ほうき枝が多発生するような樹への追肥は避ける",
        ],
      },
    ],
    reference_url: "令和7年度病害虫発生予察情報・注意報第1号",
  },
};

/**
 * 発生予報データ（月別）
 */
export const MONTHLY_FORECAST_DATA = {
  "2025-07": {
    source: "予報第4号（令和7年7月1日）",
    forecasts: {
      水稲: {
        葉いもち: {
          amount: "やや少ない",
          degree: "少発生（被害度1-20）",
          timing: "並～やや遅い",
          factors: [
            "6月26日現在、本田での発生は未確認（平年6月27日）",
            "BLASTAM による感染好適条件は広域的な出現はなく、断続的に一部地域で出現",
            "コシヒカリBLの作付けが多く、発病進展には抑制的",
            "向こう1か月の天候は平年と比べ曇りや雨の日が少ない",
          ],
        },
        紋枯病: {
          amount: "並",
          degree: "少発生（被害度1-20）",
          timing: "並",
          factors: [
            "前年の発生量は平年並で、越冬菌核量は平年並と推測",
            "6月26日現在、本田での発生は未確認（平年7月4日）",
            "向こう1か月の気温は高く、降水量は少ない",
          ],
        },
        斑点米カメムシ類: {
          amount: "並～やや多い",
          timing: "並",
          factors: [
            "6月下旬の畦畔すくい取り調査でアカスジカスミカメの確認虫数は平年比やや多い、確認地点率は平年比高い",
            "アカヒゲホソミドリカスミカメの確認虫数は平年並、確認地点率も平年並",
            "向こう1か月の気温は高い",
          ],
          preventive_actions: [
            "水田周辺の畦畔や水田内の雑草管理を徹底",
            "斑点米カメムシ類の密度低減、水田内への侵入防止に努める",
            "今後の水稲の出穂期予報に留意し、品種ごとの適期防除に努める",
          ],
        },
      },
      大豆: {
        "アブラムシ類（褐斑粒）": {
          amount: "並",
          degree: "少発生（25株当たり寄生虫数1-30）",
          factors: [
            "6月下旬のアブラムシ類の発生は未確認、発生量は平年比やや少ない",
            "向こう1か月の降水量は少ない",
          ],
        },
      },
    },
  },
  "2025-07-second-half": {
    source: "予報第5号（令和7年7月15日）",
    forecasts: {
      水稲: {
        穂いもち: {
          amount: "やや少ない",
          degree: "少発生（発病度1-20）",
          timing: "やや早い",
          factors: [
            "7月上旬の葉いもち発生量は平年比やや少ない",
            "水稲の出穂期は平年より早まる見込み",
            "向こう1か月の気温は高く、降水量はほぼ平年並",
          ],
        },
        斑点米カメムシ類: {
          amount: "多い",
          note: "7月10日発表の注意報第2号参照",
          factors: [
            "アカスジカスミカメの7月上旬の畦畔すくい取り調査における虫数は平年比多く、確認地点率も平年比高い",
            "アカヒゲホソミドリカスミカメの確認地点率は平年比やや高い",
            "向こう1か月の気温は高い",
          ],
        },
      },
      大豆: {
        ウコンノメイガ: {
          amount: "少ない",
          timing: "並",
          factors: [
            "前年の発生量は平年比少ない",
            "7月上旬にまれに幼虫を確認したのみ",
            "向こう1か月の気温は高く、降水量はほぼ平年並",
          ],
          preventive_actions: [
            "幼虫の食害に伴う葉巻の発生は7月中旬頃から始まり、7月第6半旬から急増",
            "齢期が進んだ幼虫には防除効果が劣りやすいので防除が遅れないよう注意",
            "防除時期は7月第6半旬（薬剤によって散布適期が異なる）",
          ],
        },
      },
    },
  },
  "2025-08": {
    source: "予報第6号（令和7年8月1日）",
    forecasts: {
      水稲: {
        穂いもち: {
          amount: "やや少ない",
          degree: "少発生（発病度1-20）",
          factors: ["7月下旬の葉いもち発生量は平年比やや少なく、穂いもち伝染源として重要な上位葉の病斑は少ない"],
        },
        斑点米カメムシ類: {
          amount: "多い",
          timing: "並",
          note: "7月10日発表の注意報第2号参照",
        },
      },
      秋冬ねぎ: {
        ネギアザミウマ: {
          amount: "多い",
          degree: "甚発生（被害度31以上）",
          factors: ["7月下旬の発生量は平年比多い", "向こう1か月の気温は高い"],
          preventive_actions: ["高温乾燥条件で密度が急増するので発生状況に注意し、発生が多いほ場では、定期的に防除を行い、密度抑制に努める"],
        },
        シロイチモジヨトウ: {
          amount: "多い",
          degree: "少発生（被害株率1-10%）",
          factors: ["7月下旬の発生量は平年比多い", "フェロモントラップの誘殺数は平年比多い"],
        },
      },
    },
  },
  "2025-09": {
    source: "予報第7号（令和7年9月1日）",
    forecasts: {
      西洋なし: {
        褐色斑点病: {
          amount: "多い",
          degree: "多発生（発病葉率16-30%）",
          factors: ["8月下旬の発生量（葉）は平年比多く、罹病果も散見されている"],
          preventive_actions: [
            "発病果、病落果は放置せず、園外に持ち出し適切に処分する",
            "ホウキ枝などの徒長枝が多いと発生が多くなるので、随時整理する",
            "秋雨期は重点防除時期にあたるため、散布間隔に留意し降雨前散布を徹底する",
          ],
        },
      },
      秋冬ねぎ: {
        シロイチモジヨトウ: {
          amount: "多い",
          degree: "中発生（被害株率11-20%）",
          factors: ["8月下旬の発生量は平年並であるが、多発生のほ場も見られる", "フェロモントラップ誘殺数は平年比多い"],
        },
      },
    },
  },
  "2025-10": {
    source: "予報第8号（令和7年10月1日）",
    forecasts: {
      秋冬ねぎ: {
        ネギアザミウマ: {
          amount: "やや多い",
          degree: "多発生（被害度21-30）",
          factors: ["9月下旬の発生量は平年比やや少ないが、甚発生のほ場も見られる"],
          note: "薬剤防除は作用機構の同じ薬剤の連用は避け、作用機構の異なる薬剤をローテーション使用して抵抗性の発達を防ぐ",
        },
        シロイチモジヨトウ: {
          amount: "多い",
          degree: "中発生（被害株率11-20%）",
          factors: ["9月下旬の発生量は平年並であるが、多発生のほ場も見られる", "フェロモントラップ誘殺数は平年比多い"],
        },
      },
    },
  },
};

/**
 * 気象条件と病害虫発生の関係
 */
export const WEATHER_PEST_RELATIONSHIP = {
  高温条件: {
    促進される害虫: [
      "斑点米カメムシ類（増殖や水田侵入後の加害活動が活発化）",
      "ネギアザミウマ",
      "シロイチモジヨトウ（増殖や食害が助長）",
      "セジロウンカ",
      "ツマグロヨコバイ",
      "ニカメイチュウ",
    ],
    抑制される病害: ["いもち病（曇りや雨が少ないと発生抑制）"],
  },
  少雨条件: {
    抑制される病害: ["いもち病", "紋枯病", "稲こうじ病", "イネアオムシ"],
    促進される害虫: ["アブラムシ類（大豆）", "ネギアザミウマ"],
  },
  多雨条件: {
    促進される病害: ["いもち病", "べと病（ねぎ）"],
  },
};

/**
 * 作物品種別の注意事項
 */
export const VARIETY_SPECIFIC_NOTES = {
  水稲: {
    新之助: {
      weaknesses: ["いもち病（ほ場抵抗性が弱い）"],
      special_attention: "葉いもちの早期発見に努め、発生状況に応じて適切に防除対応",
    },
    コシヒカリBL: {
      strengths: ["いもち病発病抑制効果が高い"],
      reporting_threshold: {
        "6月末まで": "発病を見つけたら",
        "7月前半（第1-3半旬）": "発病株率20%",
        "7月後半（第4半旬以降）": "発病株率30%",
      },
    },
    中晩生品種: {
      weaknesses: ["クモヘリカメムシ（発生が特に多くなる）"],
      special_attention: "アカスジカスミカメも発生量が多くなりやすいので全品種で適期防除",
    },
  },
};

/**
 * 薬剤選択ガイドライン
 */
export const PESTICIDE_SELECTION_GUIDELINES = {
  斑点米カメムシ類: {
    推奨剤形: ["液剤", "粉剤"],
    非推奨剤形: [
      {
        type: "粒剤",
        reason: "アカスジカスミカメに対する効果が低い傾向",
        conditions: "粒剤を使用する場合は好天が続く日に散布、浅水管理、追加入水は田面水がなくなってから",
      },
    ],
    注意事項: ["粉剤使用時は周囲に飛散しないよう十分注意"],
  },
  シロイチモジヨトウ: {
    resistance_management: {
      guideline: "作用機構の同じ薬剤の連用を避ける",
      reference: "RACコードを確認し、異なる薬剤をローテーションで使用",
      url: "https://www.croplifejapan.org/labo/mechanism.html",
    },
  },
};

/**
 * 雑草管理の重要性
 */
export const WEED_MANAGEMENT_IMPORTANCE = {
  水田周辺: {
    target_weeds: [
      {
        name: "メヒシバ",
        pest_relation: "アカスジカスミカメ及びアカヒゲホソミドリカスミカメが出穂したイネ科雑草を好む",
        action: "出穂したメヒシバは重点的に早めに刈り取る",
        timing: "7月以降は特にメヒシバでの発生が多い",
      },
      {
        name: "イネ科雑草全般",
        pest_relation: "カメムシ類の発生と増殖源",
        action: "水稲出穂後も、メヒシバ等のイネ科雑草が繁茂しないよう適宜草刈り",
      },
    ],
  },
  水田内: {
    target_weeds: [
      {
        name: "ノビエ",
        pest_relation: "アカスジカスミカメが穂に好んで産卵",
        risk: "イネの出穂前や登熟前半に出穂すると早期に幼虫が発生し、斑点米被害が多くなる",
        action: "早めに除去",
      },
      {
        name: "イヌホタルイ",
        pest_relation: "アカスジカスミカメが穂に好んで産卵",
        risk: "発生した幼虫が水稲を加害",
        action: "早めに除去",
      },
    ],
  },
  ねぎ圃場周辺: {
    target_weeds: [
      {
        name: "雑草全般",
        pest_relation: "シロイチモジヨトウの発生源",
        action: "ほ場周辺の雑草を除去",
      },
    ],
  },
};

/**
 * 日付から該当する月次予測情報を取得するヘルパー関数
 */
export function getMonthlyForecastContext(dateIso: string, crop: string): string | null {
  try {
    const date = new Date(dateIso);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0-indexed -> 1-indexed

    // YYYY-MM形式のキー
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;

    // 7月後半は特別処理
    const day = date.getDate();
    const isLateJuly = month === 7 && day >= 15;
    const forecastKey = isLateJuly ? "2025-07-second-half" : monthKey;

    const monthData = MONTHLY_FORECAST_DATA[forecastKey as keyof typeof MONTHLY_FORECAST_DATA];
    if (!monthData) return null;

    const forecasts = monthData.forecasts;
    const cropData = forecasts[crop as keyof typeof forecasts];

    if (!cropData) return null;

    // 文字列に整形
    let context = `出典: ${monthData.source}\n`;
    Object.entries(cropData).forEach(([pest, data]: [string, any]) => {
      context += `\n・${pest}:\n`;
      if (data.amount) context += `  発生量: ${data.amount}\n`;
      if (data.degree) context += `  発生程度: ${data.degree}\n`;
      if (data.note) context += `  備考: ${data.note}\n`;
      if (data.preventive_actions && Array.isArray(data.preventive_actions)) {
        context += `  防除対策:\n`;
        data.preventive_actions.forEach((action: string) => {
          context += `    - ${action}\n`;
        });
      }
    });

    return context;
  } catch (error) {
    console.error("月次予測コンテキスト取得エラー:", error);
    return null;
  }
}

/**
 * 病害虫トピックから防除対策情報を取得するヘルパー関数
 */
export function getPreventionStrategyContext(topic: string): string | null {
  // トピック名の正規化（部分一致）
  let matchedKey: string | null = null;

  // 完全一致を優先
  if (topic in BOUJO_PREVENTION_STRATEGIES) {
    matchedKey = topic;
  } else {
    // 部分一致検索
    for (const key of Object.keys(BOUJO_PREVENTION_STRATEGIES)) {
      if (topic.includes(key) || key.includes(topic)) {
        matchedKey = key;
        break;
      }
    }
  }

  if (!matchedKey) return null;

  const strategy = BOUJO_PREVENTION_STRATEGIES[matchedKey as keyof typeof BOUJO_PREVENTION_STRATEGIES];
  if (!strategy) return null;

  let context = "";

  // 発生データ
  if (strategy.outbreak_data_2025) {
    context += `【発生状況】\n`;
    context += `出典: ${strategy.outbreak_data_2025.source}\n`;
    if ('level' in strategy.outbreak_data_2025) {
      context += `発生レベル: ${strategy.outbreak_data_2025.level}\n`;
    }

    if ('key_findings' in strategy.outbreak_data_2025 && strategy.outbreak_data_2025.key_findings) {
      context += `\n主要種の発生データ:\n`;
      Object.entries(strategy.outbreak_data_2025.key_findings).forEach(([species, data]: [string, any]) => {
        context += `・${species}\n`;
        if (data.confirmation_rate) context += `  確認地点率: ${data.confirmation_rate}\n`;
        if (data.insect_count) context += `  虫数: ${data.insect_count}\n`;
        if (data.trap_count) context += `  誘殺数: ${data.trap_count}\n`;
        if (data.damage_rate) context += `  被害株率: ${data.damage_rate}\n`;
        if (data.infection_rate) context += `  発病葉率: ${data.infection_rate}\n`;
      });
    }
  }

  // 防除対策
  if (strategy.prevention_measures) {
    context += `\n【防除対策】\n`;
    strategy.prevention_measures.forEach((measure: any) => {
      context += `\n■ ${measure.category}\n`;
      if (measure.details) {
        measure.details.forEach((detail: string) => {
          context += `  - ${detail}\n`;
        });
      }
      if (measure.timing) context += `  時期: ${measure.timing}\n`;
      if (measure.method) context += `  方法: ${measure.method}\n`;
      if (measure.注意点) {
        context += `  注意点:\n`;
        measure.注意点.forEach((note: string) => {
          context += `    ※ ${note}\n`;
        });
      }
    });
  }

  // 重要ポイント
  if ('key_points' in strategy && strategy.key_points) {
    context += `\n【重要ポイント】\n`;
    (strategy.key_points as string[]).forEach((point: string) => {
      context += `  ✓ ${point}\n`;
    });
  }

  return context;
}
