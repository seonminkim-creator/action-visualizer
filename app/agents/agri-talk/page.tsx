"use client";
import React, { useState, useEffect } from "react";
import { Loader2, Sprout, Search, List, Check, RotateCcw } from "lucide-react";
import BackToHome from "../../components/BackToHome";
import ReactMarkdown from "react-markdown";

type TopicCategory = "weather" | "market" | "subsidy" | "safety" | "events";

type AgriTalkInput = {
  region: string;
  crop?: string;
  categories?: TopicCategory[];
};

// --- Components ---
const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 12, paddingBottom: 8,
    borderBottom: "1px solid var(--card-border)",
  }}>
    {icon}
    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
  </div>
);

export default function AgriTalkAssistant() {
  // State
  const [region, setRegion] = useState<string>("");
  const [crop, setCrop] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<TopicCategory[]>([
    "weather", "market", "subsidy", "safety", "events"
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  
  // Layout
  const [isMobile, setIsMobile] = useState(true);
  const [activeTab, setActiveTab] = useState<"search" | "result">("search");

  // Constants
  const categories: { id: TopicCategory; label: string; icon: string }[] = [
    { id: "weather", label: "天気・病害虫", icon: "🌤️" },
    { id: "market", label: "市況・価格", icon: "📊" },
    { id: "subsidy", label: "補助金・政策", icon: "💰" },
    { id: "safety", label: "獣害・安全", icon: "🦌" },
    { id: "events", label: "イベント・話題", icon: "📅" },
  ];

  // Effects
  useEffect(() => {
    document.title = "話題提案くん | 営業AIポータル";
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (result && isMobile) setActiveTab("result");
  }, [result, isMobile]);

  // Logic
  function toggleCategory(category: TopicCategory) {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  async function searchTopics(): Promise<void> {
    if (!region.trim()) { setError("訪問地域を入力してください"); return; }
    if (selectedCategories.length === 0) { setError("話題カテゴリを選択してください"); return; }

    setLoading(true); setError(null); setResult(null);

    try {
      const res = await fetch("/api/agri-talk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: region.trim(),
          crop: crop.trim() || undefined,
          categories: selectedCategories,
        } as AgriTalkInput),
      });

      if (!res.ok) throw new Error("情報の取得に失敗しました");
      const data = await res.json();
      if (!data.content || data.content.trim() === "") throw new Error("データが空でした");
      setResult(data.content);
    } catch {
      setError("エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  // --- Render ---

  const Sidebar = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
       <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, border: "1px solid var(--card-border)" }}>
           <SectionHeader icon={<Search size={16} color="#43e97b" />} title="検索条件" />
           <div style={{ marginBottom: 16 }}>
               <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>訪問地域 <span style={{ color: "#dc2626" }}>*</span></label>
               <input type="text" value={region} onChange={e => setRegion(e.target.value)} placeholder="例: 浜松市、静岡県西部" style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--background)", fontSize: 13, boxSizing: "border-box" }} />
           </div>
           
           <div style={{ marginBottom: 16 }}>
               <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>主要作物</label>
               <input type="text" value={crop} onChange={e => setCrop(e.target.value)} placeholder="例: みかん、お茶" style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--background)", fontSize: 13, boxSizing: "border-box" }} />
           </div>

           <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>カテゴリ</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                 {categories.map(cat => (
                     <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        style={{
                            padding: "6px 10px", borderRadius: 8, border: selectedCategories.includes(cat.id) ? "1px solid #43e97b" : "1px solid var(--card-border)",
                            background: selectedCategories.includes(cat.id) ? "rgba(67, 233, 123, 0.1)" : "var(--background)",
                            color: "var(--foreground)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                        }}
                     >
                        <span>{cat.icon}</span> {cat.label}
                     </button>
                 ))}
              </div>
           </div>

           <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
               <button
                  onClick={searchTopics}
                  disabled={loading || !region.trim()}
                  style={{
                      flex: 1, padding: "10px", borderRadius: 8,
                      background: loading || !region.trim() ? "var(--text-tertiary)" : "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                      color: "white", border: "none", cursor: loading || !region.trim() ? "not-allowed" : "pointer",
                      fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13
                  }}
               >
                   {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} 検索
               </button>
               <button
                  onClick={() => { setRegion(""); setCrop(""); setResult(null); setError(null); }}
                  style={{
                      padding: "10px", borderRadius: 8, background: "transparent",
                      border: "1px solid var(--card-border)", color: "var(--text-secondary)",
                      cursor: "pointer"
                  }}
               >
                   <RotateCcw size={16} />
               </button>
           </div>
           
           {error && <div style={{ marginTop: 16, padding: 12, background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: 12 }}>{error}</div>}
       </div>
    </div>
  );

  const ResultPanel = () => {
     if (!result) return (
        <div style={{ flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", minHeight: 300 }}>
            <div style={{ textAlign: "center" }}>
                <Sprout size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <p>ここに旬な話題が表示されます</p>
            </div>
        </div>
     );

     return (
        <div style={{ flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 24, overflowY: "auto", border: "1px solid var(--card-border)" }}>
           <style>{`
             .markdown-content { font-size: 14px; line-height: 1.8; color: var(--foreground); }
             .markdown-content h2 { font-size: 18px; font-weight: 600; color: var(--foreground); margin: 20px 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid var(--card-border); }
             .markdown-content h3 { font-size: 15px; font-weight: 600; color: var(--foreground); margin: 12px 0 6px 0; }
             .markdown-content ul { padding-left: 20px; margin: 12px 0; }
             .markdown-content li { margin-bottom: 8px; }
             .markdown-content strong { color: #059669; }
           `}</style>
           <div className="markdown-content">
              <ReactMarkdown>{result}</ReactMarkdown>
           </div>
        </div>
     );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: isMobile ? 0 : 16 }}>
       {!isMobile ? (
          <div style={{ maxWidth: 1200, margin: "0 auto", height: "calc(100vh - 32px)", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <BackToHome />
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <Sprout size={20} />
                  </div>
                   <div>
                       <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>話題提案くん</h1>
                       <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>農家さんとの会話のきっかけを提供</p>
                   </div>
              </div>
              
              <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                  <div style={{ width: 320, overflowY: "auto" }}>
                      <Sidebar />
                  </div>
                  <ResultPanel />
              </div>
          </div>
       ) : (
          <div style={{ paddingBottom: 80 }}>
              <div style={{ padding: "12px 16px", background: "var(--card-bg)", borderBottom: "1px solid var(--card-border)", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <BackToHome />
                  <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>話題提案くん</h1>
              </div>

              <div style={{ padding: 16 }}>
                  {activeTab === "search" && <Sidebar />}
                  {activeTab === "result" && <ResultPanel />}
              </div>

               <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--card-bg)", borderTop: "1px solid var(--card-border)", display: "flex", justifyContent: "space-around", padding: "12px 0", zIndex: 50, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
                    {[
                        { id: "search", icon: Search, label: "検索" },
                        { id: "result", icon: List, label: "結果" },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: activeTab === tab.id ? "#43e97b" : "var(--text-tertiary)", fontSize: 10, fontWeight: 600, cursor: "pointer", width: "50%" }}>
                            <tab.icon size={20} /> {tab.label}
                        </button>
                    ))}
               </div>
          </div>
       )}
    </div>
  );
}
