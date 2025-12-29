/**
 * WAGRI API クライアント
 *
 * お試しアカウント制限:
 * - API実行回数: 100回/月
 * - データ量上限: 25MB/月
 * - 利用期間: 約1年間
 */

interface WagriTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface WagriYosatsuItem {
  // 病害虫発生予察情報のデータ構造
  // 実際のレスポンス構造に応じて調整が必要
  prefecture: string;
  crop: string;
  pest: string;
  category: string;
  published_date: string;
  url?: string;
  content?: string;
}

/**
 * WAGRIアクセストークンを取得
 */
export async function getWagriToken(): Promise<string | null> {
  const clientId = process.env.WAGRI_CLIENT_ID;
  const clientSecret = process.env.WAGRI_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("❌ WAGRI認証情報が設定されていません");
    return null;
  }

  try {
    const response = await fetch("https://api.wagri.net/Token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      console.error(`❌ WAGRIトークン取得失敗: ${response.status}`);
      return null;
    }

    const data: WagriTokenResponse = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("❌ WAGRIトークン取得エラー:", error);
    return null;
  }
}

/**
 * 病害虫発生予察情報を取得
 */
export async function getYosatsuInfo(params: {
  prefecture?: string;
  crop?: string;
  pest?: string;
}): Promise<WagriYosatsuItem[]> {
  const token = await getWagriToken();
  if (!token) {
    return [];
  }

  try {
    // 予察情報API（病害虫一覧取得）のエンドポイント
    const url = new URL("https://api.wagri.net/API/Individual/fam/yosatsuinfo/getyosatsudamage");

    // クエリパラメータを追加（APIの仕様に応じて調整）
    if (params.prefecture) {
      url.searchParams.set("prefecture", params.prefecture);
    }
    if (params.crop) {
      url.searchParams.set("crop", params.crop);
    }
    if (params.pest) {
      url.searchParams.set("pest", params.pest);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Authorization": token,
        // 予察APIユーザートークン（取得後に設定）
        // "X-YosatsuAPI-Token": process.env.WAGRI_YOSATSU_TOKEN || "",
      },
    });

    if (!response.ok) {
      console.error(`❌ WAGRI予察情報取得失敗: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ WAGRI予察情報取得成功: ${data.length}件`);

    return data;
  } catch (error) {
    console.error("❌ WAGRI予察情報取得エラー:", error);
    return [];
  }
}

/**
 * 新潟県の発生予察情報を検索
 */
export async function searchNiigataPestInfo(params: {
  crop: string;
  pest: string;
}): Promise<string | null> {
  const yosatsuData = await getYosatsuInfo({
    prefecture: "新潟県",
    crop: params.crop,
    pest: params.pest,
  });

  if (yosatsuData.length > 0) {
    // 最新の情報のURLを返す
    return yosatsuData[0].url || null;
  }

  return null;
}
