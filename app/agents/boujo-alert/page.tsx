"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Shield, MapPin, Sprout, AlertTriangle, ExternalLink } from "lucide-react";
import BackToHome from "../../components/BackToHome";
import { BoujoCard, Crop, Severity } from "@/lib/types/boujo";
import { TEST_BOUJO_ITEMS } from "@/lib/data/boujo-test-data";

// 日本の都道府県リスト
const REGIONS = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

const CROPS: Crop[] = ["水稲", "大豆", "秋冬ねぎ"];

export default function BoujoInfoPage() {
  const [region, setRegion] = useState<string>("");
  const [crop, setCrop] = useState<Crop | "">("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<BoujoCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<BoujoCard | null>(null);

  // ページタイトルを設定
  useEffect(() => {
    document.title = "防除情報確認くん | 営業AIポータル";
  }, []);

  // 初期値をlocalStorageから読み込み
  useEffect(() => {
    const savedRegion = localStorage.getItem("boujoRegion");
    if (savedRegion) {
      setRegion(savedRegion);
    } else {
      setRegion("新潟県");
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
    // region が設定されたら自動検索
    if (region) {
      const autoSearch = async () => {
        setLoading(true);
        setError(null);
        setCards([]);

        try {
          let filteredItems = TEST_BOUJO_ITEMS;
          if (crop) {
            filteredItems = filteredItems.filter(item => item.crop === crop);
          }

          const generatedCards: BoujoCard[] = [];

          for (const item of filteredItems.slice(0, 3)) {
            const response = await fetch("/api/boujo/recommend", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ item }),
            });

            if (response.ok) {
              const data = await response.json();
              generatedCards.push(data.card);
            }
          }

          setCards(generatedCards);

          if (generatedCards.length === 0) {
            setError("該当する防除情報が見つかりませんでした");
          }

        } catch (err) {
          console.error("防除情報取得エラー:", err);
          setError(
            err instanceof Error
              ? err.message
              : "予期しないエラーが発生しました。しばらくしてから再度お試しください。"
          );
        } finally {
          setLoading(false);
        }
      };

      autoSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]); // regionが変更されたら再実行

  async function searchBoujoInfo(): Promise<void> {
    if (!region.trim()) {
      setError("地域を選択してください");
      return;
    }

    setLoading(true);
    setError(null);
    setCards([]);

    try {
      let filteredItems = TEST_BOUJO_ITEMS;
      if (crop) {
        filteredItems = filteredItems.filter(item => item.crop === crop);
      }

      const generatedCards: BoujoCard[] = [];

      for (const item of filteredItems.slice(0, 3)) {
        const response = await fetch("/api/boujo/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item }),
        });

        if (response.ok) {
          const data = await response.json();
          generatedCards.push(data.card);
        }
      }

      setCards(generatedCards);

      if (generatedCards.length === 0) {
        setError("該当する防除情報が見つかりませんでした");
      }

    } catch (err) {
      console.error("防除情報取得エラー:", err);
      setError(
        err instanceof Error
          ? err.message
          : "予期しないエラーが発生しました。しばらくしてから再度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  }

  function SeverityBadge({ severity }: { severity: Severity }) {
    const config = {
      high: { color: "bg-red-500", text: "緊急" },
      medium: { color: "bg-orange-500", text: "注意" },
      low: { color: "bg-gray-500", text: "確認" },
    };

    const { color, text } = config[severity];

    return (
      <span className={`${color} text-white px-2 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1`}>
        {text}
      </span>
    );
  }

  function ProductCard({ recommendation }: { recommendation: any }) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          {recommendation.image_url && (
            <img
              src={recommendation.image_url}
              alt={recommendation.name}
              className="w-20 h-30 object-cover rounded border border-gray-300"
            />
          )}

          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">{recommendation.name}</h4>
            <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-200 mb-2">
              {recommendation.reason}
            </p>
            <a
              href={recommendation.label_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
            >
              <ExternalLink size={12} />
              製品ラベルを確認
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <BackToHome />

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>
            <Shield size={48} style={{ margin: "0 auto", color: "var(--primary)" }} />
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "var(--foreground)", marginBottom: "8px" }}>
            防除情報確認くん
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            地域の病害虫予察情報と推奨製品を確認
          </p>
        </div>

        <div style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginBottom: "8px" }}>
              <MapPin size={16} style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }} />
              地域（都道府県または詳細地域）
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="例: 新潟県、北海道札幌、沖縄県石垣市"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                fontSize: "14px",
                background: "var(--background)",
                color: "var(--foreground)"
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginBottom: "8px" }}>
              <Sprout size={16} style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }} />
              作物（任意）
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value as Crop | "")}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                fontSize: "14px",
                background: "var(--background)",
                color: "var(--foreground)"
              }}
            >
              <option value="">すべての作物</option>
              {CROPS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={searchBoujoInfo}
            disabled={loading || !region}
            style={{
              width: "100%",
              padding: "12px",
              background: loading || !region ? "#ccc" : "#4facfe",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading || !region ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                防除情報を取得中...
              </>
            ) : (
              <>
                <Shield size={16} />
                防除情報を確認
              </>
            )}
          </button>
        </div>

        {error && (
          <div style={{
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            color: "#c33"
          }}>
            <strong>エラー:</strong> {error}
          </div>
        )}

        {cards.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--foreground)", marginBottom: "16px" }}>
              {region}の防除情報（{cards.length}件）
            </h2>

            <div style={{ display: "grid", gap: "16px" }}>
              {cards.map((card, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--card-border)",
                    borderRadius: "12px",
                    padding: "20px",
                    cursor: "pointer"
                  }}
                  onClick={() => setSelectedCard(card)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <SeverityBadge severity={card.severity} />
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)" }}>
                        {card.crop}
                      </span>
                      <span style={{ color: "var(--muted-foreground)" }}>|</span>
                      <span style={{ fontSize: "14px", color: "var(--foreground)" }}>
                        {card.topic}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                      {card.published_at}
                    </span>
                  </div>

                  <p style={{ fontSize: "14px", color: "var(--foreground)", marginBottom: "16px", lineHeight: "1.6" }}>
                    {card.summary}
                  </p>

                  {card.recommendations.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted-foreground)", marginBottom: "8px" }}>
                        推奨製品（{card.recommendations.length}件）
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {card.recommendations.slice(0, 3).map((rec, j) => (
                          <div
                            key={j}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "var(--background)",
                              border: "1px solid var(--card-border)",
                              borderRadius: "6px",
                              padding: "8px 12px"
                            }}
                          >
                            {rec.image_url && (
                              <img src={rec.image_url} alt={rec.name} style={{ width: "24px", height: "36px", objectFit: "cover", borderRadius: "4px" }} />
                            )}
                            <span style={{ fontSize: "12px", color: "var(--foreground)", fontWeight: "500" }}>
                              {rec.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                    {card.evidence.forecast_url && (
                      <a
                        href={card.evidence.forecast_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover-underline"
                        style={{ color: "#4facfe", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={12} />
                        県の根拠
                      </a>
                    )}
                    {!card.evidence.forecast_url && (
                      <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                        根拠URL検証中...
                      </span>
                    )}
                    <button
                      style={{ color: "#4facfe", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      詳細を見る →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedCard && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
            onClick={() => setSelectedCard(null)}
          >
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                maxWidth: "800px",
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                position: "sticky",
                top: 0,
                background: "white",
                borderBottom: "1px solid #e5e7eb",
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <SeverityBadge severity={selectedCard.severity} />
                    <span style={{ fontSize: "16px", fontWeight: "600" }}>{selectedCard.crop}</span>
                    <span style={{ color: "var(--muted-foreground)" }}>|</span>
                    <span style={{ fontSize: "16px" }}>{selectedCard.topic}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {selectedCard.published_at} 発表
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  style={{ fontSize: "24px", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: "24px" }}>
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--foreground)", marginBottom: "8px" }}>
                    概要
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--foreground)", lineHeight: "1.8" }}>
                    {selectedCard.summary}
                  </p>
                </div>

                {selectedCard.detailedForecast && selectedCard.detailedForecast.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--foreground)", marginBottom: "12px" }}>
                      詳細予察情報
                    </h3>
                    <div style={{ display: "grid", gap: "16px" }}>
                      {selectedCard.detailedForecast.map((forecast, i) => (
                        <div
                          key={i}
                          style={{
                            background: "var(--background)",
                            border: "1px solid var(--card-border)",
                            borderRadius: "8px",
                            padding: "16px"
                          }}
                        >
                          <div style={{ marginBottom: "12px" }}>
                            <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginBottom: "4px" }}>
                              {forecast.crop} - {forecast.pest}
                            </h4>
                          </div>

                          <div style={{ display: "grid", gap: "8px", fontSize: "13px" }}>
                            <div style={{ display: "flex", gap: "12px" }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>発生量</span>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginTop: "2px" }}>
                                  {forecast.occurrenceLevel}
                                </div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>平年比</span>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginTop: "2px" }}>
                                  {forecast.comparisonToAverage}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "12px" }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>発生程度</span>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginTop: "2px" }}>
                                  {forecast.occurrenceDegree}
                                </div>
                              </div>
                              {forecast.percentageRange && (
                                <div style={{ flex: 1 }}>
                                  <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>発病葉率/寄生葉率</span>
                                  <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginTop: "2px" }}>
                                    {forecast.percentageRange}
                                  </div>
                                </div>
                              )}
                            </div>

                            {forecast.rationale && forecast.rationale.length > 0 && (
                              <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--card-border)" }}>
                                <span style={{ color: "var(--muted-foreground)", fontSize: "12px", marginBottom: "6px", display: "block" }}>
                                  予報の根拠
                                </span>
                                <div style={{ display: "grid", gap: "6px" }}>
                                  {forecast.rationale.map((item, j) => (
                                    <div key={j} style={{ display: "flex", gap: "8px", fontSize: "13px", lineHeight: "1.6" }}>
                                      <span style={{ fontWeight: "600", color: "var(--foreground)", minWidth: "20px" }}>
                                        {item.point}
                                      </span>
                                      {item.indicator && (
                                        <span style={{
                                          minWidth: "20px",
                                          textAlign: "center",
                                          fontWeight: "600",
                                          color: item.indicator === "○" ? "#22c55e" :
                                                 item.indicator === "+" ? "#ef4444" :
                                                 item.indicator === "±" ? "#f59e0b" :
                                                 item.indicator === "-" ? "#6366f1" :
                                                 "var(--foreground)"
                                        }}>
                                          {item.indicator}
                                        </span>
                                      )}
                                      <span style={{ flex: 1, color: "var(--foreground)" }}>
                                        {item.description}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCard.recommendations.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--foreground)", marginBottom: "12px" }}>
                      推奨製品
                    </h3>
                    <div style={{ display: "grid", gap: "12px" }}>
                      {selectedCard.recommendations.map((rec, i) => (
                        <ProductCard key={i} recommendation={rec} />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--foreground)", marginBottom: "8px" }}>
                    根拠
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedCard.evidence.forecast_url ? (
                      <a
                        href={selectedCard.evidence.forecast_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#4facfe", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                      >
                        <ExternalLink size={14} />
                        県ページ
                      </a>
                    ) : (
                      <span style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
                        県の根拠URL: 検証中（有効なURLが見つかりませんでした）
                      </span>
                    )}
                    {selectedCard.evidence.product_label_urls.length > 0 && (
                      <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "8px" }}>
                        製品ラベル（{selectedCard.evidence.product_label_urls.length}件）：
                        {selectedCard.recommendations.map((rec, i) => rec.label_url && (
                          <a
                            key={i}
                            href={rec.label_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#4facfe", textDecoration: "none", marginLeft: "8px" }}
                          >
                            {rec.name}
                          </a>
                        ))}
                      </div>
                    )}
                    {selectedCard.evidence.product_label_urls.length === 0 && (
                      <span style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
                        製品ラベルURL: 検証中（有効なURLが見つかりませんでした）
                      </span>
                    )}
                  </div>
                </div>

                <div style={{
                  background: "var(--background)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  padding: "16px",
                  fontSize: "12px",
                  color: "var(--muted-foreground)"
                }}>
                  <p style={{ fontWeight: "600", marginBottom: "4px" }}>⚠️ 重要な注意事項</p>
                  <ul style={{ listStyle: "disc", listStylePosition: "inside", lineHeight: "1.6" }}>
                    <li>製品ラベル外の使用は禁止されています</li>
                    <li>地域の指導機関の助言に従ってください</li>
                    <li>最終的な判断は使用者が行ってください</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
