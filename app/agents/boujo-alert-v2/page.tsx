"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, Search, FileText, Filter, RotateCcw, Shield, ExternalLink, Leaf, AlertTriangle, Info, Check, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { BoujoCard, Crop, Category } from "@/lib/types/boujo";
import { TEST_BOUJO_ITEMS, getLatestUniqueItems } from "@/lib/data/boujo-test-data";
import { findComparisonGroup } from "@/lib/data/pesticide-comparisons";
import { PesticideComparisonGroup } from "@/lib/types/pesticide-comparison";
import BackToHome from "../../components/BackToHome";

// --- Constants & Helpers ---
const BASF_GREEN = "#68BC00";
const BASF_GREEN_LIGHT = "#E8F5D9";
const BASF_RED = "#EF5350";

const SEVERITY_COLORS = {
  low: BASF_GREEN,
  medium: BASF_GREEN,
  high: BASF_RED,
};

const CATEGORY_LABELS: Record<Category, string> = {
  forecast: "予報", advisory: "注意報", warning: "警報", bulletin: "速報",
};

const allCrops = [
    "水稲", "大豆", "秋冬ねぎ", "シクラメン", "セルリー", "そば", "とうもろこし", 
    "トルコギキョウ", "なす科野菜", "はなっこりー", "バラ", "ブロッコリー", 
    "ミニトマト", "園芸作物", "果樹", "花き", "野菜", "麦類"
];

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

function getOccurrenceLevelColor(level: string | undefined): { background: string; color: string } {
  if (!level) return { background: "#F5F5F5", color: "#666" };
  const normalized = level.toLowerCase();
  if (normalized.includes("多い") || normalized.includes("多")) return { background: "#FFEBEE", color: "#C62828" };
  if (normalized.includes("並")) return { background: "#FFF9E6", color: "#F57C00" };
  if (normalized.includes("少ない") || normalized.includes("少")) return { background: "#E8F5E9", color: "#2E7D32" };
  return { background: "#F5F5F5", color: "#666" };
}

function getOccurrenceDegreeColor(degree: string | undefined): { background: string; color: string } {
  if (!degree) return { background: "#F5F5F5", color: "#666" };
  const normalized = degree.toLowerCase();
  if (normalized.includes("多発生") || normalized.includes("多発")) return { background: "#FFEBEE", color: "#C62828" };
  if (normalized.includes("中発生") || normalized.includes("中発")) return { background: "#FFF9E6", color: "#F57C00" };
  if (normalized.includes("少発生") || normalized.includes("少発")) return { background: "#E8F5E9", color: "#2E7D32" };
  return { background: "#F5F5F5", color: "#666" };
}

// --- Components ---

function CategoryBadge({ category, severity }: { category: Category; severity: string }) {
  const label = CATEGORY_LABELS[category] || category;
  const color = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || BASF_GREEN;
  return (
    <span style={{ background: color, color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" }}>
      {label}
    </span>
  );
}

function RegionBadge({ region }: { region: string }) {
    return (
      <div style={{ width: 40, height: 40, borderRadius: 8, background: BASF_GREEN, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
        {region.slice(0, 2)}
      </div>
    );
}

function ProductComparisonTable({ comparisonGroup }: { comparisonGroup: PesticideComparisonGroup }) {
  const basfProducts = comparisonGroup.pesticides.filter(p => p.manufacturer === "BASF");
  const competitorProducts = comparisonGroup.pesticides.filter(p => p.manufacturer !== "BASF");

  return (
    <div style={{ background: "white", borderRadius: 8, overflow: "hidden", border: "1px solid #E0E0E0", fontSize: 13 }}>
      <div style={{ padding: 12, borderBottom: "1px solid #E0E0E0", background: "#F9FAFB" }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>比較表</h4>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>{comparisonGroup.description}</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
          <thead>
            <tr style={{ background: "#F3F4F6", borderBottom: "1px solid #E5E7EB" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>製品名</th>
              <th style={{ padding: "8px", textAlign: "center" }}>メーカー</th>
              <th style={{ padding: "8px", textAlign: "center" }}>収穫前</th>
              <th style={{ padding: "8px", textAlign: "right" }}>価格/10a</th>
            </tr>
          </thead>
          <tbody>
            {basfProducts.map(p => (
                <tr key={p.id} style={{ background: BASF_GREEN_LIGHT, borderBottom: "1px solid #E5E7EB" }}>
                    <td style={{ padding: "8px", fontWeight: 600, color: "#166534" }}>{p.name}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>{p.manufacturer}</td>
                    <td style={{ padding: "8px", textAlign: "center", color: p.preDaysLimit===1?"#166534":"inherit", fontWeight: p.preDaysLimit===1?700:400 }}>{p.preDaysLimit}日前</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>¥{p.pricePerArea?.toLocaleString()}</td>
                </tr>
            ))}
            {competitorProducts.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <td style={{ padding: "8px" }}>{p.name}</td>
                    <td style={{ padding: "8px", textAlign: "center", color: "#666" }}>{p.manufacturer}</td>
                    <td style={{ padding: "8px", textAlign: "center", color: "#666" }}>{p.preDaysLimit}日前</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#666" }}>¥{p.pricePerArea?.toLocaleString()}</td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BoujoAlertV2Page() {
  const router = useRouter();
  
  // State
  const [region, setRegion] = useState<string>("新潟県");
  const [activeTab, setActiveTab] = useState<"list" | "filters" | "compare">("list");
  const [cards, setCards] = useState<BoujoCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<BoujoCard | null>(null);
  
  // Filters
  const [filterCrop, setFilterCrop] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  // Compare
  const [comparisonCrop, setComparisonCrop] = useState<string>("");
  const [comparisonPest, setComparisonPest] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<PesticideComparisonGroup | null>(null);

  // Layout
  const [isMobile, setIsMobile] = useState(true);

  // Effects
  useEffect(() => {
    document.title = "病害虫情報 | 営業AIポータル";
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("boujoRegion");
    if (saved) setRegion(saved);
  }, []);

  useEffect(() => {
    if (region) {
        localStorage.setItem("boujoRegion", region);
        loadForecastData();
    }
  }, [region]);

  async function loadForecastData() {
    setLoading(true);
    try {
        const filteredByRegion = TEST_BOUJO_ITEMS.filter(item => item.region === region);
        const uniqueItems = getLatestUniqueItems(filteredByRegion);
        const generatedCards: BoujoCard[] = [];
        
        // Parallel fetching limits?
        for (const item of uniqueItems) {
             const res = await fetch("/api/boujo/recommend", {
                 method: "POST", headers: {"Content-Type": "application/json"},
                 body: JSON.stringify({ item })
             });
             if (res.ok) {
                 const data = await res.json();
                 generatedCards.push(data.card);
             }
        }
        setCards(generatedCards);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  }

  // Filter Logic
  const filteredCards = cards.filter(c => {
      if (filterCrop && c.crop !== filterCrop) return false;
      if (filterCategory && c.category !== filterCategory) return false;
      return true;
  });

  // Compare Logic
  function handleComparisonSearch() {
      if (!comparisonCrop || !comparisonPest) return;
      setComparisonResult(findComparisonGroup(comparisonCrop, comparisonPest));
  }

  // --- Views ---

  const FilterPanel = () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>地域</label>
              <input 
                  type="text" 
                  value={region} 
                  onChange={e => setRegion(e.target.value)}
                  placeholder="例: 新潟県"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--card-border)", fontSize: 14, boxSizing: "border-box" }}
              />
          </div>
          <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>作物</label>
              <select 
                  value={filterCrop} 
                  onChange={e => setFilterCrop(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--card-border)", fontSize: 14, background: "var(--background)" }}
              >
                  <option value="">全て</option>
                  {allCrops.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          </div>
          <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>カテゴリ</label>
              <select 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--card-border)", fontSize: 14, background: "var(--background)" }}
              >
                  {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
             <button onClick={loadForecastData} style={{ flex: 1, padding: "10px", background: BASF_GREEN, color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                 <RotateCcw size={14} /> 更新
             </button>
             <button onClick={() => { setFilterCrop(""); setFilterCategory(""); }} style={{ padding: "10px", background: "transparent", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-secondary)" }}>
                 リセット
             </button>
          </div>
      </div>
  );

  const ComparePanel = () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: 16, background: "#F0FDF4", borderRadius: 12, border: "1px solid #86EFAC" }}>
              <h3 style={{ fontSize: 14, margin: "0 0 12px", color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
                  <Shield size={16} /> 農薬比較ツール
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input type="text" value={comparisonCrop} onChange={e => setComparisonCrop(e.target.value)} placeholder="作物 (例: 水稲)" style={{ padding: 8, borderRadius: 6, border: "1px solid #BBF7D0", fontSize: 13 }} />
                  <input type="text" value={comparisonPest} onChange={e => setComparisonPest(e.target.value)} placeholder="病害虫 (例: いもち病)" style={{ padding: 8, borderRadius: 6, border: "1px solid #BBF7D0", fontSize: 13 }} />
                  <button onClick={handleComparisonSearch} style={{ padding: "8px", background: "#16A34A", color: "white", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>比較する</button>
              </div>
          </div>
          {comparisonResult ? (
              <ProductComparisonTable comparisonGroup={comparisonResult} />
          ) : (
              <div style={{ textAlign: "center", padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>
                  条件を入力して比較を表示
              </div>
          )}
      </div>
  );

  const CardList = () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>読み込み中...</div>
          ) : filteredCards.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>情報がありません</div>
          ) : (
              filteredCards.map((card, i) => (
                  <div key={i} onClick={() => setSelectedCard(card)} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", gap: 12 }}>
                      <RegionBadge region={card.region} />
                      <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{card.topic}</span>
                              <CategoryBadge category={card.category} severity={card.severity} />
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 8, marginBottom: 8 }}>
                              <span>{new Date(card.published_at).toLocaleDateString()}</span>
                              <span>{card.crop}</span>
                          </div>
                          <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {card.summary}
                          </p>
                      </div>
                  </div>
              ))
          )}
      </div>
  );

  const DetailModal = () => {
      if (!selectedCard) return null;
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setSelectedCard(null)}>
            <div style={{ background: "white", width: "100%", maxWidth: 640, maxHeight: "90vh", borderRadius: 16, overflowY: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", zIndex: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>詳細情報</h3>
                    <button onClick={() => setSelectedCard(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#666" }}>&times;</button>
                </div>
                <div style={{ padding: 20 }}>
                    <h2 style={{ fontSize: 20, margin: "0 0 12px", color: "#111" }}>{selectedCard.topic}</h2>
                    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                         <span style={{ padding: "4px 8px", background: "#F3F4F6", borderRadius: 4, fontSize: 12, color: "#374151" }}>{selectedCard.region}</span>
                         <span style={{ padding: "4px 8px", background: "#F3F4F6", borderRadius: 4, fontSize: 12, color: "#374151" }}>{selectedCard.crop}</span>
                         <span style={{ padding: "4px 8px", background: "#F3F4F6", borderRadius: 4, fontSize: 12, color: "#374151" }}>{new Date(selectedCard.published_at).toLocaleDateString()}</span>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px", color: "#4B5563" }}>概要</h4>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#1F2937" }}>{selectedCard.summary}</p>
                    </div>

                    {selectedCard.detailedForecast && (
                        <div style={{ marginBottom: 24 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px", color: "#4B5563" }}>詳細予察</h4>
                            {selectedCard.detailedForecast.map((f, i) => (
                                <div key={i} style={{ padding: 12, background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB", marginBottom: 8 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.pest}</div>
                                    <div style={{ fontSize: 13, color: "#4B5563" }}>発生量: <span style={{fontWeight:600}}>{f.occurrenceLevel}</span></div>
                                    <div style={{ fontSize: 13, color: "#4B5563" }}>発生程度: <span style={{fontWeight:600}}>{f.occurrenceDegree}</span></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedCard.recommendations && selectedCard.recommendations.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px", color: "#4B5563" }}>推奨製品</h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {selectedCard.recommendations.map((rec, i) => (
                                    <div key={i} style={{ display: "flex", gap: 12, padding: 12, border: "1px solid #E5E7EB", borderRadius: 8 }}>
                                         {rec.image_url && <img src={rec.image_url} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} />}
                                         <div>
                                             <div style={{ fontWeight: 600, fontSize: 14 }}>{rec.name}</div>
                                             <div style={{ fontSize: 13, color: "#666", margin: "4px 0" }}>{rec.reason}</div>
                                             {rec.label_url && <a href={rec.label_url} target="_blank" style={{ fontSize: 12, color: BASF_GREEN, textDecoration: "none", fontWeight: 600 }}>製品ラベルを確認 &rarr;</a>}
                                         </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: isMobile ? 0 : 16 }}>
        {selectedCard && <DetailModal />}
        
        {!isMobile ? (
            <div style={{ maxWidth: 1200, margin: "0 auto", height: "calc(100vh - 32px)", display: "flex", flexDirection: "column" }}>
               <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                   <BackToHome />
                   <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${BASF_GREEN} 0%, #a3e635 100%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <Shield size={20} />
                   </div>
                   <div>
                       <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>病害虫情報</h1>
                       <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>予察情報と推奨製品の確認</p>
                   </div>
               </div>

               <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                   <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 16 }}>
                       <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, border: "1px solid var(--card-border)" }}>
                           <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}><Filter size={16} /> フィルター</h3>
                           <FilterPanel />
                       </div>
                       <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, border: "1px solid var(--card-border)", flex: 1 }}>
                           <ComparePanel />
                       </div>
                   </div>
                   <div style={{ flex: 1, overflowY: "auto" }}>
                       <CardList />
                   </div>
               </div>
            </div>
        ) : (
            <div style={{ paddingBottom: 80 }}>
                <div style={{ padding: "12px 16px", background: "white", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
                    <BackToHome />
                    <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111" }}>病害虫情報</h1>
                </div>
                
                <div style={{ padding: 16 }}>
                    {activeTab === "list" && <CardList />}
                    {activeTab === "filters" && <div style={{ background: "white", padding: 16, borderRadius: 12 }}><FilterPanel /></div>}
                    {activeTab === "compare" && <div style={{ background: "white", padding: 16, borderRadius: 12 }}><ComparePanel /></div>}
                </div>

                <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-around", padding: "12px 0", zIndex: 50, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
                    {[
                        { id: "list", icon: FileText, label: "一覧" },
                        { id: "filters", icon: Filter, label: "検索" },
                        { id: "compare", icon: Shield, label: "比較" },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: activeTab === tab.id ? BASF_GREEN : "#9CA3AF", fontSize: 10, fontWeight: 600, cursor: "pointer", width: "33%" }}>
                            <tab.icon size={20} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}
