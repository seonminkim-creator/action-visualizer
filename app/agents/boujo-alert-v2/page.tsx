"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, Search, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { BoujoCard, Crop, Category } from "@/lib/types/boujo";
import { TEST_BOUJO_ITEMS, getLatestUniqueItems } from "@/lib/data/boujo-test-data";
import { findComparisonGroup } from "@/lib/data/pesticide-comparisons";
import { PesticideComparisonGroup } from "@/lib/types/pesticide-comparison";

type TabType = "forecast" | "survey";

// カテゴリの日本語表示マップ
const CATEGORY_LABELS: Record<Category, string> = {
  forecast: "予報",
  advisory: "注意報",
  warning: "警報",
  bulletin: "速報",
};

// 緊急度の日本語表示マップ
const SEVERITY_LABELS = {
  low: "普通",
  medium: "普通",
  high: "高い",
};

// BASFブランドカラー
const BASF_GREEN = "#68BC00";
const BASF_GREEN_LIGHT = "#E8F5D9";
const BASF_RED = "#EF5350";

// 緊急度の色マップ
const SEVERITY_COLORS = {
  low: BASF_GREEN,
  medium: BASF_GREEN,
  high: BASF_RED,
};

// 発生量の表示色を取得
function getOccurrenceLevelColor(level: string | undefined): { background: string; color: string } {
  if (!level) return { background: "#F5F5F5", color: "#666" };

  const normalized = level.toLowerCase();

  // 「多い」「やや多い」→ 赤
  if (normalized.includes("多い") || normalized.includes("多")) {
    return { background: "#FFEBEE", color: "#C62828" };
  }

  // 「並」→ 黄色
  if (normalized.includes("並")) {
    return { background: "#FFF9E6", color: "#F57C00" };
  }

  // 「少ない」「やや少ない」→ 緑
  if (normalized.includes("少ない") || normalized.includes("少")) {
    return { background: "#E8F5E9", color: "#2E7D32" };
  }

  // デフォルト
  return { background: "#F5F5F5", color: "#666" };
}

// 発生程度の表示色を取得
function getOccurrenceDegreeColor(degree: string | undefined): { background: string; color: string } {
  if (!degree) return { background: "#F5F5F5", color: "#666" };

  const normalized = degree.toLowerCase();

  // 「多発生」→ 赤
  if (normalized.includes("多発生") || normalized.includes("多発")) {
    return { background: "#FFEBEE", color: "#C62828" };
  }

  // 「中発生」→ 黄色
  if (normalized.includes("中発生") || normalized.includes("中発")) {
    return { background: "#FFF9E6", color: "#F57C00" };
  }

  // 「少発生」→ 緑
  if (normalized.includes("少発生") || normalized.includes("少発")) {
    return { background: "#E8F5E9", color: "#2E7D32" };
  }

  // デフォルト
  return { background: "#F5F5F5", color: "#666" };
}


export default function BoujoAlertV2Page() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("forecast");
  const [region, setRegion] = useState<string>("新潟県");
  const [cards, setCards] = useState<BoujoCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [loadingErrors, setLoadingErrors] = useState<string[]>([]);
  const [selectedCard, setSelectedCard] = useState<BoujoCard | null>(null);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  // 検索フィルタ
  const [searchCrop, setSearchCrop] = useState<Crop | "">("");
  const [searchCategory, setSearchCategory] = useState<Category | "">("");
  const [searchSeverity, setSearchSeverity] = useState<"low" | "medium" | "high" | "">("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // 検索モーダルのステップ
  const [searchStep, setSearchStep] = useState<"summary" | "crop" | "category" | "region">("summary");
  const [searchRegion, setSearchRegion] = useState<string>("");
  const [searchSubRegion, setSearchSubRegion] = useState<string>("");

  // 農薬比較検索モーダル
  const [showComparisonSearch, setShowComparisonSearch] = useState<boolean>(false);
  const [comparisonCrop, setComparisonCrop] = useState<string>("");
  const [comparisonPest, setComparisonPest] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<PesticideComparisonGroup | null>(null);

  // ページタイトルを設定
  useEffect(() => {
    document.title = "病害虫情報 | 営業AIポータル";
  }, []);

  // 初期値をlocalStorageから読み込み
  useEffect(() => {
    const savedRegion = localStorage.getItem("boujoRegion");
    if (savedRegion) {
      setRegion(savedRegion);
    }
  }, []);

  // 地域が変更されたらlocalStorageに保存
  useEffect(() => {
    if (region) {
      localStorage.setItem("boujoRegion", region);
    }
  }, [region]);

  // 初回ロード時に自動で防除情報を取得
  useEffect(() => {
    if (region && activeTab === "forecast") {
      loadForecastData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, activeTab]);

  async function loadForecastData(): Promise<void> {
    setLoading(true);
    setCards([]); // Clear existing cards
    setLoadingErrors([]); // Clear previous errors

    try {
      // 地域でフィルタ
      const filteredByRegion = TEST_BOUJO_ITEMS.filter(item => item.region === region);

      // 同じ作物・トピックの組み合わせで最新のみを抽出
      const filteredItems = getLatestUniqueItems(filteredByRegion);

      console.log(`📊 アイテム数: 全${filteredByRegion.length}件 → 最新のみ${filteredItems.length}件`);

      const generatedCards: BoujoCard[] = [];
      const errors: string[] = [];

      // Set initial progress
      setLoadingProgress({ current: 0, total: filteredItems.length });

      for (let i = 0; i < filteredItems.length; i++) {
        const item = filteredItems[i];
        console.log(`Loading card ${i + 1}/${filteredItems.length}: ${item.crop} - ${item.topic}`);

        try {
          const response = await fetch("/api/boujo/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item }),
          });

          if (response.ok) {
            const data = await response.json();
            generatedCards.push(data.card);
            // Update cards immediately to show progress
            setCards([...generatedCards]);
            // Update progress
            setLoadingProgress({ current: i + 1, total: filteredItems.length });
          } else {
            const errorMsg = `${item.crop} - ${item.topic}: ${response.status} エラー`;
            console.error(`Failed to fetch card for item ${item.id}:`, response.status, response.statusText);
            errors.push(errorMsg);
            setLoadingErrors([...errors]);
            // Update progress even on failure
            setLoadingProgress({ current: i + 1, total: filteredItems.length });
          }
        } catch (itemErr) {
          const errorMsg = `${item.crop} - ${item.topic}: 通信エラー`;
          console.error(`Error fetching card for item ${item.id}:`, itemErr);
          errors.push(errorMsg);
          setLoadingErrors([...errors]);
          // Update progress even on error
          setLoadingProgress({ current: i + 1, total: filteredItems.length });
          // Continue to next item even if one fails
        }
      }
    } catch (err) {
      console.error("防除情報取得エラー:", err);
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }

  // 検索実行
  function handleSearch() {
    const filtered = cards.filter((card) => {
      // 作物フィルタ
      if (searchCrop && card.crop !== searchCrop) return false;
      // カテゴリフィルタ
      if (searchCategory && card.category !== searchCategory) return false;
      // 緊急度フィルタ
      if (searchSeverity && card.severity !== searchSeverity) return false;
      // キーワードフィルタ
      if (searchKeyword && !card.topic.includes(searchKeyword) && !card.summary.includes(searchKeyword)) return false;
      return true;
    });
    setCards(filtered);
    setShowSearchModal(false);
  }

  // 検索リセット
  function handleResetSearch() {
    setSearchCrop("");
    setSearchCategory("");
    setSearchSeverity("");
    setSearchKeyword("");
    loadForecastData(); // 全データを再読み込み
    setShowSearchModal(false);
  }

  // 農薬比較検索を実行
  function handleComparisonSearch() {
    if (!comparisonCrop || !comparisonPest) {
      alert("作物名と病害虫名を入力してください");
      return;
    }

    const result = findComparisonGroup(comparisonCrop, comparisonPest);
    setComparisonResult(result);
  }

  // 農薬比較検索をリセット
  function handleResetComparisonSearch() {
    setComparisonCrop("");
    setComparisonPest("");
    setComparisonResult(null);
  }

  // カテゴリバッジコンポーネント
  function CategoryBadge({ category, severity }: { category: Category; severity: string }) {
    const bgColor = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS];
    const label = CATEGORY_LABELS[category];

    return (
      <div
        style={{
          background: bgColor,
          color: "white",
          padding: "8px 16px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "600",
          display: "inline-block",
        }}
      >
        {label}
      </div>
    );
  }

  // 地域バッジコンポーネント（レスポンシブ）
  function RegionBadge({ region }: { region: string }) {
    // 文字数に応じてサイズとフォントサイズを調整
    const charCount = region.length;
    const isShort = charCount <= 2;
    const minWidth = isShort ? 80 : Math.max(80, charCount * 18 + 24);
    const fontSize = isShort ? 20 : Math.max(13, 28 - charCount * 2);
    const paddingX = isShort ? 0 : 12;

    return (
      <div
        style={{
          minWidth: `${minWidth}px`,
          height: "80px",
          borderRadius: isShort ? "50%" : "12px",
          background: BASF_GREEN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: `${fontSize}px`,
          fontWeight: "700",
          flexShrink: 0,
          padding: `0 ${paddingX}px`,
          whiteSpace: "nowrap",
        }}
      >
        {region}
      </div>
    );
  }

  // 発生予察情報カード
  function ForecastCard({ card }: { card: BoujoCard }) {
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #E0E0E0",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "16px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          cursor: "pointer",
        }}
        onClick={() => setSelectedCard(card)}
      >
        {/* ヘッダー部分 */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <RegionBadge region={card.region} />

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>
                {card.topic || "その他"}
              </span>
              <span style={{ fontSize: "14px", color: "#666" }}>
                {new Date(card.published_at).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
              <CategoryBadge category={card.category} severity={card.severity} />
            </div>
          </div>
        </div>

        {/* 詳細情報 */}
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "12px", fontSize: "14px" }}>
          <div style={{
            background: "#F5F5F5",
            border: "1px solid " + BASF_GREEN,
            borderRadius: "4px",
            padding: "8px 12px",
            textAlign: "center",
            color: BASF_GREEN,
            fontWeight: "600",
          }}>
            地域
          </div>
          <div style={{ padding: "8px 0" }}>{card.region}</div>

          <div style={{
            background: "#F5F5F5",
            border: "1px solid " + BASF_GREEN,
            borderRadius: "4px",
            padding: "8px 12px",
            textAlign: "center",
            color: BASF_GREEN,
            fontWeight: "600",
          }}>
            品目
          </div>
          <div style={{ padding: "8px 0" }}>{card.crop || "指定なし"}</div>

          <div style={{
            background: "#F5F5F5",
            border: "1px solid " + BASF_GREEN,
            borderRadius: "4px",
            padding: "8px 12px",
            textAlign: "center",
            color: BASF_GREEN,
            fontWeight: "600",
          }}>
            病害虫
          </div>
          <div style={{ padding: "8px 0" }}>{card.topic || "指定なし"}</div>
        </div>

        {/* もっと見るボタン */}
        <div style={{
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid #E0E0E0",
          textAlign: "center",
        }}>
          <span style={{ color: BASF_GREEN, fontWeight: "600", fontSize: "14px" }}>
            もっと見る
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>
      {/* ヘッダー */}
      <div style={{
        background: "white",
        borderBottom: "1px solid #E0E0E0",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeft size={24} color={BASF_GREEN} />
        </button>

        <h1 style={{
          flex: 1,
          fontSize: "20px",
          fontWeight: "600",
          color: BASF_GREEN,
          margin: 0,
          textAlign: "center",
        }}>
          病害虫情報
        </h1>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowComparisonSearch(true)}
            style={{
              background: BASF_GREEN,
              border: "none",
              padding: "8px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "white",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "6px",
            }}
          >
            ⚖️ 農薬比較
          </button>

          <button
            onClick={() => setShowSearchModal(true)}
            style={{
              background: "none",
              border: "none",
              padding: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: BASF_GREEN,
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            <Search size={20} />
            新規検索
          </button>
        </div>
      </div>

      {/* タブは削除（発生予察情報のみ） */}

      {/* コンテンツ */}
      <div style={{ padding: "16px" }}>
        <div style={{
          fontSize: "14px",
          color: "#666",
          marginBottom: "16px",
        }}>
          検索条件: {cards.length}件
        </div>

        {/* Display cards as they load */}
        {cards.map((card, index) => (
          <ForecastCard key={index} card={card} />
        ))}

        {/* Loading progress indicator */}
        {loading && loadingProgress && (
          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            margin: "16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}>
            <div style={{ color: BASF_GREEN, fontWeight: "600", fontSize: "16px", marginBottom: "12px" }}>
              情報を取得中...
            </div>
            <div style={{ color: "#666", fontSize: "14px" }}>
              {loadingProgress.current} / {loadingProgress.total} 件完了
            </div>
            {/* Progress bar */}
            <div style={{
              width: "100%",
              height: "8px",
              background: "#E0E0E0",
              borderRadius: "4px",
              marginTop: "12px",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${(loadingProgress.current / loadingProgress.total) * 100}%`,
                height: "100%",
                background: BASF_GREEN,
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        )}

        {/* Error messages */}
        {loadingErrors.length > 0 && !loading && (
          <div style={{
            background: "#FFF3E0",
            borderRadius: "8px",
            padding: "16px",
            margin: "16px",
            border: "1px solid #FFB74D",
          }}>
            <div style={{ color: "#E65100", fontWeight: "600", marginBottom: "8px" }}>
              一部の情報の取得に失敗しました ({loadingErrors.length}件)
            </div>
            <div style={{ fontSize: "14px", color: "#666" }}>
              {loadingErrors.map((error, idx) => (
                <div key={idx} style={{ marginTop: "4px" }}>• {error}</div>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {!loading && cards.length === 0 && loadingErrors.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            該当する防除情報が見つかりませんでした
          </div>
        )}
      </div>

      {/* 検索モーダル */}
      {showSearchModal && (
        <SearchModal
          step={searchStep}
          searchCrop={searchCrop}
          searchCategory={searchCategory}
          searchRegion={searchRegion}
          searchSubRegion={searchSubRegion}
          onStepChange={setSearchStep}
          onCropChange={setSearchCrop}
          onCategoryChange={setSearchCategory}
          onRegionChange={setSearchRegion}
          onSubRegionChange={setSearchSubRegion}
          onSearch={handleSearch}
          onReset={handleResetSearch}
          onClose={() => {
            setShowSearchModal(false);
            setSearchStep("summary");
          }}
        />
      )}

      {/* 詳細モーダル */}
      {selectedCard && (
        <DetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      {/* 農薬比較検索モーダル */}
      {showComparisonSearch && (
        <ComparisonSearchModal
          crop={comparisonCrop}
          pest={comparisonPest}
          result={comparisonResult}
          onCropChange={setComparisonCrop}
          onPestChange={setComparisonPest}
          onSearch={handleComparisonSearch}
          onReset={handleResetComparisonSearch}
          onClose={() => {
            setShowComparisonSearch(false);
            setComparisonResult(null);
          }}
        />
      )}
    </div>
  );
}

// 詳細モーダルコンポーネント
function DetailModal({ card, onClose }: { card: BoujoCard; onClose: () => void }) {
  type DetailTabType = "overview" | "forecast" | "products" | "comparison";
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabType>("overview");

  // 比較データを取得
  const comparisonGroup = findComparisonGroup(card.crop || "", card.topic || "");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FAFAFA",
          width: "100%",
          maxWidth: "800px",
          minHeight: "100vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #E0E0E0",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: "8px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} color={BASF_GREEN} />
          </button>

          <h2 style={{
            flex: 1,
            fontSize: "18px",
            fontWeight: "600",
            color: BASF_GREEN,
            margin: 0,
          }}>
            病害虫情報詳細
          </h2>
        </div>

        {/* タブナビゲーション */}
        <div style={{
          background: "white",
          borderBottom: "2px solid #E0E0E0",
          display: "flex",
          position: "sticky",
          top: "57px",
          zIndex: 9,
        }}>
          {[
            { id: "overview" as DetailTabType, label: "概要", icon: "📄" },
            { id: "forecast" as DetailTabType, label: "詳細予察", icon: "📊" },
            { id: "products" as DetailTabType, label: "製品推奨", icon: "🌿" },
            { id: "comparison" as DetailTabType, label: "製品比較", icon: "⚖️", badge: comparisonGroup ? `${comparisonGroup.pesticides.length}件` : null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id)}
              disabled={tab.id === "comparison" && !comparisonGroup}
              style={{
                flex: 1,
                background: activeDetailTab === tab.id ? BASF_GREEN_LIGHT : "white",
                border: "none",
                borderBottom: activeDetailTab === tab.id ? `3px solid ${BASF_GREEN}` : "3px solid transparent",
                padding: "12px 8px",
                cursor: tab.id === "comparison" && !comparisonGroup ? "not-allowed" : "pointer",
                opacity: tab.id === "comparison" && !comparisonGroup ? 0.5 : 1,
                fontSize: "13px",
                fontWeight: activeDetailTab === tab.id ? "700" : "600",
                color: activeDetailTab === tab.id ? BASF_GREEN : "#666",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  background: BASF_GREEN,
                  color: "white",
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontWeight: "600",
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* カード情報 */}
        <div style={{ padding: "16px" }}>
          <div style={{
            background: "white",
            border: "1px solid #E0E0E0",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "16px",
          }}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
              <RegionBadge region={card.region} />

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>
                    {card.topic || "その他"}
                  </span>
                  <span style={{ fontSize: "14px", color: "#666" }}>
                    {new Date(card.published_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                  <CategoryBadge category={card.category} severity={card.severity} />
                </div>
              </div>
            </div>

            {/* 情報の公開日と元情報を確認 */}
            {card.evidence.forecast_url && (
              <a
                href={card.evidence.forecast_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  background: BASF_GREEN_LIGHT,
                  border: "1px solid " + BASF_GREEN,
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "16px",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
                      発表日: {new Date(card.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: BASF_GREEN }}>
                      元情報を確認
                    </div>
                  </div>
                  <ChevronLeft size={20} style={{ transform: "rotate(180deg)", color: BASF_GREEN }} />
                </div>
              </a>
            )}

            {/* 詳細情報 */}
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "12px", fontSize: "14px" }}>
              <div style={{
                background: "#F5F5F5",
                border: "1px solid " + BASF_GREEN,
                borderRadius: "4px",
                padding: "8px 12px",
                textAlign: "center",
                color: BASF_GREEN,
                fontWeight: "600",
              }}>
                地域
              </div>
              <div style={{ padding: "8px 0" }}>{card.region}</div>

              <div style={{
                background: "#F5F5F5",
                border: "1px solid " + BASF_GREEN,
                borderRadius: "4px",
                padding: "8px 12px",
                textAlign: "center",
                color: BASF_GREEN,
                fontWeight: "600",
              }}>
                品目
              </div>
              <div style={{ padding: "8px 0" }}>{card.crop || "指定なし"}</div>

              <div style={{
                background: "#F5F5F5",
                border: "1px solid " + BASF_GREEN,
                borderRadius: "4px",
                padding: "8px 12px",
                textAlign: "center",
                color: BASF_GREEN,
                fontWeight: "600",
              }}>
                病害虫
              </div>
              <div style={{ padding: "8px 0" }}>{card.topic || "指定なし"}</div>
            </div>
          </div>

          {/* 概要タブ */}
          {activeDetailTab === "overview" && (
            <div style={{
              background: "white",
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "12px" }}>
                概要
              </h3>
              <p style={{ fontSize: "14px", color: "#666", lineHeight: "1.8", margin: 0 }}>
                {card.summary}
              </p>
            </div>
          )}

          {/* 詳細予察タブ */}
          {activeDetailTab === "forecast" && card.detailedForecast && card.detailedForecast.length > 0 && (
            <div style={{
              background: "white",
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "16px" }}>
                📊 詳細予察情報
              </h3>

              {card.detailedForecast.map((forecast, i) => (
                <div key={i} style={{
                  marginBottom: i < card.detailedForecast!.length - 1 ? "24px" : "0",
                  paddingBottom: i < card.detailedForecast!.length - 1 ? "24px" : "0",
                  borderBottom: i < card.detailedForecast!.length - 1 ? "1px solid #E0E0E0" : "none",
                }}>
                  <h4 style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color: BASF_GREEN,
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span>🌾 {forecast.crop}</span>
                    <span style={{ color: "#666", fontSize: "14px" }}>×</span>
                    <span>🐛 {forecast.pest}</span>
                  </h4>

                  {/* 予察情報テーブル */}
                  <div style={{ overflowX: "auto", marginBottom: "12px" }}>
                    <table style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                      background: "#FAFAFA",
                      borderRadius: "8px",
                      overflow: "hidden"
                    }}>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
                          <td style={{
                            padding: "12px",
                            fontWeight: "600",
                            background: "#F5F5F5",
                            color: BASF_GREEN,
                            width: "120px"
                          }}>
                            発生量
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              ...getOccurrenceLevelColor(forecast.occurrenceLevel),
                              padding: "4px 12px",
                              borderRadius: "4px",
                              fontWeight: "600"
                            }}>
                              {forecast.occurrenceLevel || "-"}
                            </span>
                            <span style={{ marginLeft: "8px", color: "#666" }}>
                              （{forecast.comparisonToAverage || "-"}）
                            </span>
                          </td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
                          <td style={{
                            padding: "12px",
                            fontWeight: "600",
                            background: "#F5F5F5",
                            color: BASF_GREEN
                          }}>
                            発生程度
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              ...getOccurrenceDegreeColor(forecast.occurrenceDegree),
                              padding: "4px 12px",
                              borderRadius: "4px",
                              fontWeight: "600"
                            }}>
                              {forecast.occurrenceDegree || "-"}
                            </span>
                          </td>
                        </tr>
                        {forecast.percentageRange && (
                          <tr>
                            <td style={{
                              padding: "12px",
                              fontWeight: "600",
                              background: "#F5F5F5",
                              color: BASF_GREEN
                            }}>
                              発病葉率
                            </td>
                            <td style={{ padding: "12px", fontWeight: "600", color: "#333" }}>
                              {forecast.percentageRange}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 予報の根拠 */}
                  <div style={{
                    background: "#FFF9E6",
                    border: "1px solid #FFE082",
                    borderRadius: "8px",
                    padding: "12px"
                  }}>
                    <h5 style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#F57C00",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      ⚠️ 警戒ポイント
                    </h5>
                    <div style={{ display: "grid", gap: "6px" }}>
                      {forecast.rationale.map((item, j) => (
                        <div key={j} style={{
                          display: "flex",
                          gap: "8px",
                          fontSize: "12px",
                          lineHeight: "1.6"
                        }}>
                          <span style={{ fontWeight: "600", color: "#333", minWidth: "24px" }}>
                            {item.point}
                          </span>
                          {item.indicator && (
                            <span style={{
                              minWidth: "24px",
                              textAlign: "center",
                              fontWeight: "700",
                              fontSize: "14px",
                              color: item.indicator === "○" ? "#22c55e" :
                                     item.indicator === "+" ? "#ef4444" :
                                     item.indicator === "±" ? "#f59e0b" :
                                     item.indicator === "-" ? "#6366f1" :
                                     "#333"
                            }}>
                              {item.indicator}
                            </span>
                          )}
                          <span style={{ flex: 1, color: "#333" }}>
                            {item.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 製品推奨タブ */}
          {activeDetailTab === "products" && (
            <>
              {card.recommendations && card.recommendations.length > 0 ? (
                <div style={{
                  background: "white",
                  border: "1px solid #E0E0E0",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px",
                }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "12px" }}>
                    推奨製品
                  </h3>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {card.recommendations.map((rec, i) => (
                      <div key={i} style={{
                        background: "#FAFAFA",
                        border: "1px solid #E0E0E0",
                        borderRadius: "8px",
                        padding: "16px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                          {rec.image_url && (
                            <img src={rec.image_url} alt={rec.name} style={{ width: "40px", height: "60px", objectFit: "cover", borderRadius: "4px" }} />
                          )}
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                            {rec.name}
                          </span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.6", margin: 0 }}>
                          {rec.reason}
                        </p>
                        {rec.label_url && (
                          <a
                            href={rec.label_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              marginTop: "8px",
                              color: BASF_GREEN,
                              fontSize: "12px",
                              textDecoration: "none",
                              fontWeight: "600",
                            }}
                          >
                            製品詳細を見る →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: "white",
                  border: "1px solid #E0E0E0",
                  borderRadius: "12px",
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#999",
                }}>
                  推奨製品情報はありません
                </div>
              )}
            </>
          )}

          {/* 製品比較タブ */}
          {activeDetailTab === "comparison" && comparisonGroup && (
            <ProductComparisonTable comparisonGroup={comparisonGroup} />
          )}
        </div>
      </div>
    </div>
  );
}

// CategoryBadgeをファイル外でも使えるように
function CategoryBadge({ category, severity }: { category: Category; severity: string }) {
  const SEVERITY_COLORS = {
    low: BASF_GREEN,
    medium: BASF_GREEN,
    high: "#EF5350",
  };

  const CATEGORY_LABELS: Record<Category, string> = {
    forecast: "予報",
    advisory: "注意報",
    warning: "警報",
    bulletin: "速報",
  };

  const bgColor = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS];
  const label = CATEGORY_LABELS[category];

  return (
    <div
      style={{
        background: bgColor,
        color: "white",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "600",
        display: "inline-block",
      }}
    >
      {label}
    </div>
  );
}

// RegionBadgeをファイル外でも使えるように（レスポンシブ）
function RegionBadge({ region }: { region: string }) {
  // 文字数に応じてサイズとフォントサイズを調整
  const charCount = region.length;
  const isShort = charCount <= 2;
  const minWidth = isShort ? 80 : Math.max(80, charCount * 18 + 24);
  const fontSize = isShort ? 20 : Math.max(13, 28 - charCount * 2);
  const paddingX = isShort ? 0 : 12;

  return (
    <div
      style={{
        minWidth: `${minWidth}px`,
        height: "80px",
        borderRadius: isShort ? "50%" : "12px",
        background: BASF_GREEN,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: `${fontSize}px`,
        fontWeight: "700",
        flexShrink: 0,
        padding: `0 ${paddingX}px`,
        whiteSpace: "nowrap",
      }}
    >
      {region}
    </div>
  );
}

// 製品比較テーブルコンポーネント
function ProductComparisonTable({ comparisonGroup }: { comparisonGroup: PesticideComparisonGroup }) {
  const basfProducts = comparisonGroup.pesticides.filter(p => p.manufacturer === "BASF");
  const competitorProducts = comparisonGroup.pesticides.filter(p => p.manufacturer !== "BASF");

  return (
    <div style={{
      background: "white",
      border: "1px solid #E0E0E0",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
    }}>
      <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
        ⚖️ 農薬比較表
      </h3>
      <p style={{ fontSize: "12px", color: "#666", marginBottom: "16px" }}>
        {comparisonGroup.description}
      </p>

      {/* 比較表 */}
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "12px",
        }}>
          <thead>
            <tr style={{ background: "#F5F5F5", borderBottom: "2px solid #E0E0E0" }}>
              <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: "700", color: "#333", minWidth: "140px" }}>製品名</th>
              <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: "700", color: "#333", width: "80px" }}>メーカー</th>
              <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: "700", color: "#333", width: "80px" }}>収穫前</th>
              <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: "700", color: "#333", width: "70px" }}>使用回数</th>
              <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: "700", color: "#333", width: "70px" }}>持続期間</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontWeight: "700", color: "#333", width: "90px" }}>価格/10a</th>
            </tr>
          </thead>
          <tbody>
            {/* BASF製品 */}
            {basfProducts.map((product, idx) => (
              <tr key={product.id} style={{
                background: BASF_GREEN_LIGHT,
                borderBottom: "1px solid #E0E0E0",
                borderLeft: `4px solid ${BASF_GREEN}`,
              }}>
                <td style={{ padding: "12px 8px", fontWeight: "600", color: "#333" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      background: BASF_GREEN,
                      color: "white",
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontWeight: "700",
                    }}>BASF</span>
                    <span>{product.name}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center", color: BASF_GREEN, fontWeight: "600" }}>{product.manufacturer}</td>
                <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600", color: product.preDaysLimit === 1 ? BASF_GREEN : "#333" }}>
                  {product.preDaysLimit}日前
                  {product.preDaysLimit === 1 && <span style={{ color: BASF_GREEN, marginLeft: "4px" }}>⭐</span>}
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>{product.usageLimit}回</td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>{product.effectDuration}日</td>
                <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: "600" }}>¥{product.pricePerArea?.toLocaleString()}</td>
              </tr>
            ))}

            {/* 競合製品 */}
            {competitorProducts.map((product, idx) => (
              <tr key={product.id} style={{
                background: "white",
                borderBottom: "1px solid #E0E0E0",
              }}>
                <td style={{ padding: "12px 8px", color: "#666" }}>{product.name}</td>
                <td style={{ padding: "12px 8px", textAlign: "center", color: "#666", fontSize: "11px" }}>{product.manufacturer}</td>
                <td style={{ padding: "12px 8px", textAlign: "center", color: "#666" }}>{product.preDaysLimit}日前</td>
                <td style={{ padding: "12px 8px", textAlign: "center", color: "#666" }}>{product.usageLimit}回</td>
                <td style={{ padding: "12px 8px", textAlign: "center", color: "#666" }}>{product.effectDuration}日</td>
                <td style={{ padding: "12px 8px", textAlign: "right", color: "#666" }}>¥{product.pricePerArea?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BASF製品の特徴 */}
      {basfProducts.length > 0 && (
        <div style={{
          marginTop: "16px",
          background: BASF_GREEN_LIGHT,
          border: `2px solid ${BASF_GREEN}`,
          borderRadius: "8px",
          padding: "12px 16px",
        }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: BASF_GREEN, marginBottom: "8px" }}>
            ✓ BASF製品の特徴
          </div>
          <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.8" }}>
            {basfProducts[0].notes}
          </div>
        </div>
      )}
    </div>
  );
}

// 薬剤比較セクション
function PesticideComparisonSection({ card }: { card: BoujoCard }) {
  const comparisonGroup = findComparisonGroup(card.crop, card.topic);

  if (!comparisonGroup) {
    // 比較データがない場合は従来の推奨製品リストを表示
    if (!card.recommendations || card.recommendations.length === 0) {
      return null;
    }

    return (
      <div style={{
        background: "white",
        border: "1px solid #E0E0E0",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "16px",
      }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "12px" }}>
          推奨製品
        </h3>
        <div style={{ display: "grid", gap: "12px" }}>
          {card.recommendations.map((rec, i) => (
            <div key={i} style={{
              background: "#FAFAFA",
              border: "1px solid #E0E0E0",
              borderRadius: "8px",
              padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                {rec.image_url && (
                  <img src={rec.image_url} alt={rec.name} style={{ width: "40px", height: "60px", objectFit: "cover", borderRadius: "4px" }} />
                )}
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                  {rec.name}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.6", margin: 0 }}>
                {rec.reason}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 比較データがある場合は比較表を表示
  const basfProducts = comparisonGroup.pesticides.filter(p => p.manufacturer === "BASF");
  const competitorProducts = comparisonGroup.pesticides.filter(p => p.manufacturer !== "BASF");

  return (
    <div style={{
      background: "white",
      border: "1px solid #E0E0E0",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
    }}>
      <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
        薬剤比較（BASF vs 競合）
      </h3>
      <p style={{ fontSize: "12px", color: "#666", marginBottom: "16px" }}>
        {comparisonGroup.description}
      </p>

      {/* BASF製品（強調表示） */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{
          background: BASF_GREEN_LIGHT,
          border: "2px solid #4DB6AC",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "8px",
        }}>
          <h4 style={{ fontSize: "14px", fontWeight: "700", color: BASF_GREEN, marginBottom: "0" }}>
            🌟 BASF製品
          </h4>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F5F5F5", borderBottom: "2px solid #4DB6AC" }}>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "120px" }}>製品名</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "80px" }}>収穫前日数</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "80px" }}>使用回数</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "80px" }}>効果持続</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "90px" }}>価格/10a</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "100px" }}>薬剤系統</th>
              </tr>
            </thead>
            <tbody>
              {basfProducts.map((product, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E0E0E0" }}>
                  <td style={{ padding: "12px 8px", fontWeight: "600", color: BASF_GREEN }}>
                    {product.name}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    {product.preDaysLimit !== null ? `${product.preDaysLimit}日前` : "-"}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    {product.usageLimit !== null ? `${product.usageLimit}回以内` : "-"}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    {product.effectDuration !== null ? `約${product.effectDuration}日` : "-"}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    {product.pricePerArea !== null ? `¥${product.pricePerArea.toLocaleString()}` : "-"}
                  </td>
                  <td style={{ padding: "12px 8px", fontSize: "12px" }}>
                    {product.chemicalClass}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 備考 */}
        {basfProducts.some(p => p.notes) && (
          <div style={{ marginTop: "8px", padding: "8px 12px", background: "#F5F5F5", borderRadius: "4px", fontSize: "12px", color: "#666" }}>
            {basfProducts.filter(p => p.notes).map((product, i) => (
              <div key={i} style={{ marginBottom: i < basfProducts.filter(p => p.notes).length - 1 ? "4px" : "0" }}>
                <strong>{product.name}:</strong> {product.notes}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 競合製品 */}
      {competitorProducts.length > 0 && (
        <div>
          <div style={{
            background: "#FAFAFA",
            border: "1px solid #E0E0E0",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "8px",
          }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#666", marginBottom: "0" }}>
              参考：競合製品
            </h4>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F5F5F5", borderBottom: "2px solid #E0E0E0" }}>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "120px" }}>製品名</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "80px" }}>メーカー</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "80px" }}>収穫前日数</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "80px" }}>使用回数</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "80px" }}>効果持続</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "90px" }}>価格/10a</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600", minWidth: "100px" }}>薬剤系統</th>
                </tr>
              </thead>
              <tbody>
                {competitorProducts.map((product, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E0E0E0" }}>
                    <td style={{ padding: "12px 8px", fontWeight: "600" }}>
                      {product.name}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "12px" }}>
                      {product.manufacturer}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {product.preDaysLimit !== null ? `${product.preDaysLimit}日前` : "-"}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {product.usageLimit !== null ? `${product.usageLimit}回以内` : "-"}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {product.effectDuration !== null ? `約${product.effectDuration}日` : "-"}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {product.pricePerArea !== null ? `¥${product.pricePerArea.toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "12px" }}>
                      {product.chemicalClass}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 備考 */}
          {competitorProducts.some(p => p.notes) && (
            <div style={{ marginTop: "8px", padding: "8px 12px", background: "#F5F5F5", borderRadius: "4px", fontSize: "12px", color: "#666" }}>
              {competitorProducts.filter(p => p.notes).map((product, i) => (
                <div key={i} style={{ marginBottom: i < competitorProducts.filter(p => p.notes).length - 1 ? "4px" : "0" }}>
                  <strong>{product.name}:</strong> {product.notes}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 注意書き */}
      <div style={{
        marginTop: "16px",
        padding: "12px",
        background: "#FFF9E6",
        border: "1px solid #FFE082",
        borderRadius: "8px",
        fontSize: "12px",
        color: "#666",
      }}>
        <p style={{ margin: "0 0 4px 0", fontWeight: "600", color: "#F57C00" }}>📊 データについて</p>
        <p style={{ margin: 0, lineHeight: "1.6" }}>
          価格・効果持続期間は参考値です。実際の使用にあたっては、最新の製品ラベルをご確認ください。
        </p>
      </div>
    </div>
  );
}

// 検索モーダルコンポーネント（マルチステップ）
function SearchModal({
  step,
  searchCrop,
  searchCategory,
  searchRegion,
  searchSubRegion,
  onStepChange,
  onCropChange,
  onCategoryChange,
  onRegionChange,
  onSubRegionChange,
  onSearch,
  onReset,
  onClose,
}: {
  step: "summary" | "crop" | "category" | "region";
  searchCrop: Crop | "";
  searchCategory: Category | "";
  searchRegion: string;
  searchSubRegion: string;
  onStepChange: (step: "summary" | "crop" | "category" | "region") => void;
  onCropChange: (value: Crop | "") => void;
  onCategoryChange: (value: Category | "") => void;
  onRegionChange: (value: string) => void;
  onSubRegionChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  // 作物リスト（拡張版）
  const allCrops = [
    "水稲", "大豆", "秋冬ねぎ",
    "シクラメン", "セルリー", "そば", "とうもろこし", "トルコギキョウ",
    "なす科野菜", "はなっこりー", "バラ", "ブロッコリー", "ミニトマト",
    "園芸作物", "果樹", "花き", "野菜", "麦類"
  ];

  // カテゴリリスト（拡張版）
  const categoryOptions = [
    { value: "", label: "全て" },
    { value: "special", label: "特殊報" },
    { value: "warning", label: "警報" },
    { value: "advisory", label: "注意報" },
    { value: "forecast", label: "定期予報" },
    { value: "bulletin", label: "速報" },
    { value: "technical", label: "技術情報" },
    { value: "other", label: "その他" },
  ];

  // 地域データ（都道府県と地域）
  const regionData = [
    { prefecture: "北海道", subRegions: ["全域", "道南", "道北", "道東", "道央"] },
    { prefecture: "青森県", subRegions: ["全域", "県央", "県北", "県南", "三八", "西北"] },
    { prefecture: "岩手県", subRegions: ["全域", "県央", "県北", "県南"] },
    { prefecture: "宮城県", subRegions: ["全域", "仙台", "県北", "県南"] },
    { prefecture: "秋田県", subRegions: ["全域", "県央", "県北", "県南"] },
    { prefecture: "山形県", subRegions: ["全域", "村山", "最上", "置賜", "庄内"] },
    { prefecture: "福島県", subRegions: ["全域", "県北", "県中", "県南", "会津", "浜通り"] },
    { prefecture: "新潟県", subRegions: ["全域", "下越", "中越", "上越", "佐渡"] },
  ];

  // 検索結果数（仮）
  const resultCount = 178;

  // サマリー画面
  if (step === "summary") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#FAFAFA",
          zIndex: 50,
        }}
      >
        {/* ヘッダー */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #E0E0E0",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: "8px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} color={BASF_GREEN} />
          </button>

          <h2 style={{
            flex: 1,
            fontSize: "18px",
            fontWeight: "600",
            color: BASF_GREEN,
            margin: 0,
            textAlign: "center",
          }}>
            発生予察検索
          </h2>

          <div style={{ width: "40px" }} />
        </div>

        {/* 選択項目 */}
        <div style={{ padding: "16px" }}>
          {/* 都道府県 */}
          <div
            onClick={() => onStepChange("region")}
            style={{
              background: "white",
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "12px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
              都道府県
            </div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#333", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{searchRegion || "選択してください"}</span>
              <ChevronLeft size={20} style={{ transform: "rotate(180deg)", color: BASF_GREEN }} />
            </div>
            {searchSubRegion && (
              <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
                地域: {searchSubRegion}
              </div>
            )}
          </div>

          {/* 情報区分 */}
          <div
            onClick={() => onStepChange("category")}
            style={{
              background: "white",
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "12px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
              情報区分
            </div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#333", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{categoryOptions.find(c => c.value === searchCategory)?.label || "全て"}</span>
              <ChevronLeft size={20} style={{ transform: "rotate(180deg)", color: BASF_GREEN }} />
            </div>
          </div>

          {/* 品目 */}
          <div
            onClick={() => onStepChange("crop")}
            style={{
              background: "white",
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "12px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
              品目
            </div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#333", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{searchCrop || "全て"}</span>
              <ChevronLeft size={20} style={{ transform: "rotate(180deg)", color: BASF_GREEN }} />
            </div>
          </div>

          {/* 検索結果件数 */}
          <div style={{
            background: BASF_GREEN_LIGHT,
            border: "1px solid " + BASF_GREEN,
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
              発生予察件数
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: BASF_GREEN }}>
              {resultCount}件
            </div>
          </div>

          {/* ボタン */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={onReset}
              style={{
                flex: 1,
                background: "white",
                color: "#666",
                border: "1px solid #E0E0E0",
                borderRadius: "8px",
                padding: "16px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              リセット
            </button>
            <button
              onClick={() => {
                onSearch();
                onClose();
              }}
              style={{
                flex: 1,
                background: BASF_GREEN,
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "16px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              この条件で検索
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 品目選択画面
  if (step === "crop") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#FAFAFA",
          zIndex: 50,
        }}
      >
        {/* ヘッダー */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #E0E0E0",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}>
          <button
            onClick={() => onStepChange("summary")}
            style={{
              background: "none",
              border: "none",
              padding: "8px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} color={BASF_GREEN} />
          </button>

          <h2 style={{
            flex: 1,
            fontSize: "18px",
            fontWeight: "600",
            color: BASF_GREEN,
            margin: 0,
            textAlign: "center",
          }}>
            品目を選択
          </h2>

          <div style={{ width: "40px" }} />
        </div>

        {/* 検索バー */}
        <div style={{ padding: "16px", background: "white", borderBottom: "1px solid #E0E0E0" }}>
          <input
            type="text"
            placeholder="品目を検索..."
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #E0E0E0",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />
        </div>

        {/* 品目リスト */}
        <div style={{ padding: "16px", overflowY: "auto", height: "calc(100vh - 140px)" }}>
          {/* 全て */}
          <div
            onClick={() => {
              onCropChange("");
              onStepChange("summary");
            }}
            style={{
              background: searchCrop === "" ? BASF_GREEN_LIGHT : "white",
              border: `1px solid ${searchCrop === "" ? BASF_GREEN : "#E0E0E0"}`,
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: searchCrop === "" ? "600" : "400", color: searchCrop === "" ? BASF_GREEN : "#333" }}>
              全て
            </span>
            {searchCrop === "" && <span style={{ color: BASF_GREEN, fontSize: "20px" }}>✓</span>}
          </div>

          {/* 作物リスト */}
          {allCrops.map((crop, index) => (
            <div
              key={index}
              onClick={() => {
                onCropChange(crop as Crop);
                onStepChange("summary");
              }}
              style={{
                background: searchCrop === crop ? BASF_GREEN_LIGHT : "white",
                border: `1px solid ${searchCrop === crop ? BASF_GREEN : "#E0E0E0"}`,
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: searchCrop === crop ? "600" : "400", color: searchCrop === crop ? BASF_GREEN : "#333" }}>
                {crop}
              </span>
              {searchCrop === crop && <span style={{ color: BASF_GREEN, fontSize: "20px" }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // カテゴリ選択画面
  if (step === "category") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#FAFAFA",
          zIndex: 50,
        }}
      >
        {/* ヘッダー */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #E0E0E0",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}>
          <button
            onClick={() => onStepChange("summary")}
            style={{
              background: "none",
              border: "none",
              padding: "8px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} color={BASF_GREEN} />
          </button>

          <h2 style={{
            flex: 1,
            fontSize: "18px",
            fontWeight: "600",
            color: BASF_GREEN,
            margin: 0,
            textAlign: "center",
          }}>
            情報区分を選択
          </h2>

          <div style={{ width: "40px" }} />
        </div>

        {/* カテゴリリスト */}
        <div style={{ padding: "16px", overflowY: "auto", height: "calc(100vh - 80px)" }}>
          {categoryOptions.map((option, index) => (
            <div
              key={index}
              onClick={() => {
                onCategoryChange(option.value as Category | "");
                onStepChange("summary");
              }}
              style={{
                background: searchCategory === option.value ? BASF_GREEN_LIGHT : "white",
                border: `1px solid ${searchCategory === option.value ? BASF_GREEN : "#E0E0E0"}`,
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: searchCategory === option.value ? "600" : "400", color: searchCategory === option.value ? BASF_GREEN : "#333" }}>
                {option.label}
              </span>
              {searchCategory === option.value && <span style={{ color: BASF_GREEN, fontSize: "20px" }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 地域選択画面
  if (step === "region") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#FAFAFA",
          zIndex: 50,
        }}
      >
        {/* ヘッダー */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #E0E0E0",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}>
          <button
            onClick={() => onStepChange("summary")}
            style={{
              background: "none",
              border: "none",
              padding: "8px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} color={BASF_GREEN} />
          </button>

          <h2 style={{
            flex: 1,
            fontSize: "18px",
            fontWeight: "600",
            color: BASF_GREEN,
            margin: 0,
            textAlign: "center",
          }}>
            都道府県・地域を選択
          </h2>

          <div style={{ width: "40px" }} />
        </div>

        {/* 地域リスト */}
        <div style={{ padding: "16px", overflowY: "auto", height: "calc(100vh - 80px)" }}>
          {regionData.map((region, index) => (
            <div key={index} style={{ marginBottom: "16px" }}>
              {/* 都道府県 */}
              <div
                onClick={() => {
                  onRegionChange(region.prefecture);
                  onSubRegionChange("");
                  onStepChange("summary");
                }}
                style={{
                  background: searchRegion === region.prefecture && !searchSubRegion ? BASF_GREEN_LIGHT : "white",
                  border: `1px solid ${searchRegion === region.prefecture && !searchSubRegion ? BASF_GREEN : "#E0E0E0"}`,
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: "600", color: searchRegion === region.prefecture && !searchSubRegion ? BASF_GREEN : "#333" }}>
                  {region.prefecture}
                </span>
                {searchRegion === region.prefecture && !searchSubRegion && <span style={{ color: BASF_GREEN, fontSize: "20px" }}>✓</span>}
              </div>

              {/* 地域 */}
              <div style={{ paddingLeft: "16px", display: "grid", gap: "8px" }}>
                {region.subRegions.map((subRegion, subIndex) => (
                  <div
                    key={subIndex}
                    onClick={() => {
                      onRegionChange(region.prefecture);
                      onSubRegionChange(subRegion);
                      onStepChange("summary");
                    }}
                    style={{
                      background: searchRegion === region.prefecture && searchSubRegion === subRegion ? BASF_GREEN_LIGHT : "#FAFAFA",
                      border: `1px solid ${searchRegion === region.prefecture && searchSubRegion === subRegion ? BASF_GREEN : "#E0E0E0"}`,
                      borderRadius: "6px",
                      padding: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "14px", color: searchRegion === region.prefecture && searchSubRegion === subRegion ? BASF_GREEN : "#666" }}>
                      {subRegion}
                    </span>
                    {searchRegion === region.prefecture && searchSubRegion === subRegion && <span style={{ color: BASF_GREEN, fontSize: "18px" }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// 農薬比較検索モーダルコンポーネント
function ComparisonSearchModal({
  crop,
  pest,
  result,
  onCropChange,
  onPestChange,
  onSearch,
  onReset,
  onClose,
}: {
  crop: string;
  pest: string;
  result: PesticideComparisonGroup | null;
  onCropChange: (value: string) => void;
  onPestChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FAFAFA",
          width: "100%",
          maxWidth: "800px",
          minHeight: "100vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #E0E0E0",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: "8px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} color={BASF_GREEN} />
          </button>

          <h2 style={{
            flex: 1,
            fontSize: "18px",
            fontWeight: "600",
            color: BASF_GREEN,
            margin: 0,
          }}>
            ⚖️ 農薬比較検索
          </h2>
        </div>

        {/* 検索フォーム */}
        <div style={{ padding: "16px" }}>
          <div style={{
            background: "white",
            border: "1px solid #E0E0E0",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "16px",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "16px" }}>
              作物と病害虫を入力してください
            </h3>

            {/* 作物名入力 */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#666", display: "block", marginBottom: "8px" }}>
                作物名
              </label>
              <input
                type="text"
                value={crop}
                onChange={(e) => onCropChange(e.target.value)}
                placeholder="例: ねぎ、水稲"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #E0E0E0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* 病害虫名入力 */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#666", display: "block", marginBottom: "8px" }}>
                病害虫名
              </label>
              <input
                type="text"
                value={pest}
                onChange={(e) => onPestChange(e.target.value)}
                placeholder="例: シロイチモジヨトウ、いもち病"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #E0E0E0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* ボタン */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={onSearch}
                style={{
                  flex: 1,
                  background: BASF_GREEN,
                  color: "white",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                検索
              </button>
              <button
                onClick={onReset}
                style={{
                  flex: 1,
                  background: "white",
                  color: "#666",
                  border: "1px solid #E0E0E0",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                リセット
              </button>
            </div>
          </div>

          {/* 検索結果 */}
          {result && (
            <ProductComparisonTable comparisonGroup={result} />
          )}

          {/* 検索結果なし */}
          {crop && pest && !result && (
            <div style={{
              background: "white",
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              padding: "40px 20px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                比較データが見つかりませんでした
              </div>
              <div style={{ fontSize: "14px", color: "#666", lineHeight: "1.6" }}>
                「{crop}」の「{pest}」に関する比較データは現在登録されていません。
              </div>
            </div>
          )}

          {/* 利用可能なデータ一覧 */}
          {!crop && !pest && (
            <div style={{
              background: "white",
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              padding: "20px",
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "12px" }}>
                📚 現在利用可能な比較データ
              </h3>
              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ padding: "12px", background: "#F5F5F5", borderRadius: "8px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: BASF_GREEN, marginBottom: "4px" }}>
                    ねぎ × シロイチモジヨトウ
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    5製品を比較（BASF 2製品 + 競合 3製品）
                  </div>
                </div>
                <div style={{ padding: "12px", background: "#F5F5F5", borderRadius: "8px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: BASF_GREEN, marginBottom: "4px" }}>
                    水稲 × いもち病
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    3製品を比較（BASF 2製品 + 競合 1製品）
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
