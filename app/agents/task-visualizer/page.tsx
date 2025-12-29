"use client";
import React, { useEffect, useState, useRef } from "react";
import { 
  Loader2, History, Search, X, Check, Trash2, 
  MessageSquare, ChevronRight, ListTodo, FileText, 
  ArrowLeft, BrainCircuit, Play, Lock
} from "lucide-react";
import BackToHome from "../../components/BackToHome";

// --- Types & Logic ---

type AnalyzeResult = {
  summary: string;
  explicit_points: string[];
  inferred_actions: Array<{ text: string; priority: "high" | "medium" | "low"; assignee: string }>;
  detailed_analysis: string;
};

function isAnalyzeResult(x: unknown): x is AnalyzeResult {
  const o = x as any;
  if (!o || typeof o !== "object" || typeof o.summary !== "string") return false;
  if (!Array.isArray(o.explicit_points)) return false;
  if (!Array.isArray(o.inferred_actions)) return false;
  if (typeof o.detailed_analysis !== "string") return false;
  
  return o.inferred_actions.every((item: any) => 
    item && 
    typeof item === "object" && 
    typeof item.text === "string" &&
    typeof item.assignee === "string" &&
    ["high", "medium", "low"].includes(item.priority)
  );
}

async function callAnalyzeAPI(text: string, userName: string): Promise<AnalyzeResult | null> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, userName }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    return isAnalyzeResult(data) ? data : null;
  } catch {
    return null;
  }
}

function mockAnalyze(text: string, userName: string): AnalyzeResult {
  return {
    summary: "要件確認と最小人数の氏名回収が必要",
    explicit_points: ["フルネーム提出の依頼", "人数は必要最小限"],
    inferred_actions: [
      { text: "対象者の選定", priority: "high", assignee: userName || "その他" },
      { text: "氏名（漢字/ローマ字）回収", priority: "high", assignee: userName || "その他" },
      { text: "提出先と期限の確認と返信", priority: "medium", assignee: userName || "その他" }
    ],
    detailed_analysis: "BASFドメインでのアカウント作成に必要な情報収集の依頼です。取得対象者のフルネームを必要最小限の人数分提出する必要があります。"
  };
}

// --- UI Components ---

const SectionHeader = ({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid var(--card-border)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
    </div>
    {count !== undefined && (
      <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--background)", padding: "2px 8px", borderRadius: 10 }}>
        {count}件
      </span>
    )}
  </div>
);

export default function ActionVisualizer() {
  // State
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [history, setHistory] = useState<Array<{ id: string; at: number; input: string; result: AnalyzeResult }>>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"history" | "input" | "preview">("input");
  const [showAllTasks, setShowAllTasks] = useState<boolean>(false);

  // Effects
  useEffect(() => {
    try {
      if (sessionStorage.getItem("taskvisualizer_auth") === "true") setIsAuthenticated(true);
      const raw = localStorage.getItem("actionviz_history_v1");
      if (raw) setHistory(JSON.parse(raw));
      const saved = localStorage.getItem("actionviz_username");
      if (saved) setUserName(saved);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("actionviz_history_v1", JSON.stringify(history.slice(0, 50)));
  }, [history]);

  useEffect(() => {
    if (userName) localStorage.setItem("actionviz_username", userName);
  }, [userName]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (result && isMobile) setActiveTab("preview");
  }, [result, isMobile]);

  // Handlers
  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === "1234") {
      setIsAuthenticated(true);
      sessionStorage.setItem("taskvisualizer_auth", "true");
      setPasswordError("");
    } else {
      setPasswordError("パスワードが正しくありません");
    }
  }

  async function analyze(): Promise<void> {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowAllTasks(false);
    
    // Simulate slight delay for effect if mock, or await real API
    let api = await callAnalyzeAPI(text, userName);
    
    if (!api) {
      api = mockAnalyze(text, userName);
      setError("APIエラー。プレビュー用の暫定結果を表示しています。");
    }

    setResult(api);
    setHistory((h) => [{ id: crypto.randomUUID(), at: Date.now(), input: text, result: api! }, ...h].slice(0, 50));
    setLoading(false);
  }

  function deleteHistoryItem(id: string) {
    setHistory((h) => h.filter(item => item.id !== id));
  }

  const filteredHistory = history.filter(h => 
    !searchQuery || h.input.toLowerCase().includes(searchQuery.toLowerCase()) || h.result.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sub-components
  const Sidebar = () => (
    <div style={{
      width: isMobile ? "100%" : 280,
      flexShrink: 0,
      background: "var(--card-bg)",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      maxHeight: isMobile ? "none" : "calc(100vh - 120px)",
      boxSizing: "border-box"
    }}>
      <SectionHeader 
        icon={<History style={{ width: 16, height: 16, color: "#667eea" }} />} 
        title="履歴" 
        count={filteredHistory.length} 
      />
      
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search style={{
          width: 14, height: 14, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)"
        }} />
        <input
          type="text"
          placeholder="履歴を検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%", padding: "8px 8px 8px 32px", borderRadius: 6,
            border: "1px solid var(--card-border)", background: "var(--background)",
            color: "var(--foreground)", fontSize: 13, boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", padding: 8 }}>履歴がありません</p>
        ) : (
          filteredHistory.map((h) => (
            <div
              key={h.id}
              onClick={() => {
                setInput(h.input);
                setResult(h.result);
                if (isMobile) setActiveTab("preview");
              }}
              style={{
                padding: "10px", borderRadius: 8,
                background: "var(--background)", border: "1px solid var(--card-border)",
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {new Date(h.at).toLocaleString("ja-JP")}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); if(confirm("削除しますか？")) deleteHistoryItem(h.id); }}
                  style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <X size={12} />
                </button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>
                {h.result.summary.slice(0, 20)}...
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {h.input.slice(0, 50)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const MainContent = () => (
    <div style={{
      flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
      maxHeight: isMobile ? "none" : "calc(100vh - 120px)", overflowY: "auto", boxSizing: "border-box"
    }}>
      <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <SectionHeader 
          icon={<FileText style={{ width: 16, height: 16, color: "#667eea" }} />} 
          title="テキスト入力" 
        />
        
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>担当者名:</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="あなた"
            style={{
              padding: "6px 10px", borderRadius: 6, border: "1px solid var(--card-border)",
              fontSize: 12, width: 100, background: "var(--background)", color: "var(--foreground)"
            }}
          />
        </div>

        <textarea
          placeholder="ここにメールや議事録を貼り付けてください..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: "100%", minHeight: 200, padding: 12, borderRadius: 8,
            border: "1px solid var(--card-border)", fontSize: 14,
            background: "var(--background)", color: "var(--foreground)",
            marginBottom: 16, boxSizing: "border-box", resize: "vertical"
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={analyze}
            disabled={loading || !input.trim()}
            style={{
              flex: 1, padding: "12px", borderRadius: 8,
              background: loading || !input.trim() ? "var(--text-tertiary)" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
            タスクを整理する
          </button>
          <button
            onClick={() => setInput("")}
            style={{
              padding: "12px", borderRadius: 8, background: "var(--background)",
              color: "var(--text-secondary)", border: "1px solid var(--card-border)",
              cursor: "pointer", fontWeight: 600, fontSize: 14
            }}
          >
            クリア
          </button>
        </div>
      </div>
      
      {!isMobile && (
        <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>使い方</h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            文章を入力して「タスクを整理する」を押すと、AIが内容を分析し、
            <strong>要約・依頼内容・TODOリスト</strong>を自動生成します。
          </p>
        </div>
      )}
    </div>
  );

  const ResultPanel = () => {
    if (!result) return (
      <div style={{ 
        flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 16,
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)",
        minHeight: 200
      }}>
        <div style={{ textAlign: "center" }}>
          <ListTodo size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <p style={{ fontSize: 13 }}>ここに分析結果が表示されます</p>
        </div>
      </div>
    );

    return (
      <div style={{
        flex: 1,
        minWidth: 0, 
        display: "flex", 
        flexDirection: "column",
        maxHeight: isMobile ? "none" : "calc(100vh - 120px)",
        overflowY: "auto"
      }}>
        {error && (
          <div style={{ padding: 12, background: "#fee2e2", color: "#dc2626", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <SectionHeader 
            icon={<MessageSquare style={{ width: 16, height: 16, color: "#10b981" }} />} 
            title="要約" 
          />
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--foreground)" }}>
            {result.summary}
          </p>
        </div>

        <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <SectionHeader 
            icon={<ListTodo style={{ width: 16, height: 16, color: "#f59e0b" }} />} 
            title="TODOリスト" 
            count={result.inferred_actions.length}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.inferred_actions
              .sort((a, b) => {
                const p = { high: 0, medium: 1, low: 2 };
                return p[a.priority] - p[b.priority];
              })
              .filter(item => showAllTasks || item.priority === "high" || result.inferred_actions.length <= 3)
              .map((item, i) => {
                const priorityColors = {
                  high: { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", label: "高" },
                  medium: { bg: "#fef3c7", border: "#fcd34d", text: "#d97706", label: "中" },
                  low: { bg: "#f0f9ff", border: "#93c5fd", text: "#2563eb", label: "低" }
                };
                const p = priorityColors[item.priority];
                const isMe = item.assignee === userName || item.assignee === "あなた";
                return (
                  <div key={i} style={{ 
                    padding: 8, borderRadius: 8, border: "1px solid var(--card-border)",
                    background: isMe ? "#f0fdf4" : "var(--background)",
                    display: "flex", gap: 8, alignItems: "flex-start"
                  }}>
                    <span style={{ 
                      fontSize: 10, padding: "2px 6px", borderRadius: 4, 
                      background: p.bg, color: p.text, border: `1px solid ${p.border}`,
                      fontWeight: 600, flexShrink: 0
                    }}>{p.label}</span>
                    <span style={{ 
                      fontSize: 10, padding: "2px 6px", borderRadius: 4, 
                      background: "var(--card-bg)", color: "var(--text-secondary)", border: "1px solid var(--card-border)",
                      fontWeight: 500, flexShrink: 0
                    }}>{item.assignee}</span>
                    <span style={{ fontSize: 13, color: "var(--foreground)", flex: 1 }}>{item.text}</span>
                  </div>
                )
              })}
              
            {result.inferred_actions.length > 3 && !showAllTasks && (
               <button 
                 onClick={() => setShowAllTasks(true)}
                 style={{ width: "100%", padding: 8, fontSize: 12, color: "var(--text-secondary)", background: "transparent", border: "1px dashed var(--card-border)", borderRadius: 6, cursor: "pointer" }}
               >
                 すべてのタスクを表示 ({result.inferred_actions.length}件)
               </button>
            )}
          </div>
        </div>

        <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16 }}>
          <SectionHeader 
            icon={<FileText style={{ width: 16, height: 16, color: "#3b82f6" }} />} 
            title="依頼内容詳細" 
          />
          <ul style={{ paddingLeft: 20, margin: 0, marginBottom: 16 }}>
            {result.explicit_points.map((pt, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 4 }}>{pt}</li>
            ))}
          </ul>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, borderTop: "1px solid var(--card-border)", paddingTop: 12 }}>
            {result.detailed_analysis}
          </div>
        </div>
      </div>
    );
  };

  // Auth Screen
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ width: "100%", maxWidth: 400, padding: 20 }}>
          <BackToHome />
          <div style={{ marginTop: 20, background: "var(--card-bg)", padding: 32, borderRadius: 16, boxShadow: "0 4px 20px var(--shadow)", border: "1px solid var(--card-border)" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: 12, 
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", color: "white"
              }}>
                <Lock size={24} />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "var(--foreground)" }}>タスク整理くん</h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>パスワードを入力してください</p>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                style={{
                  width: "100%", padding: "12px", borderRadius: 8,
                  border: "1px solid var(--card-border)", marginBottom: 16,
                  background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box"
                }}
              />
              {passwordError && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 12 }}>{passwordError}</div>}
              <button
                type="submit"
                style={{
                  width: "100%", padding: "12px", borderRadius: 8,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white", border: "none", fontWeight: 600, cursor: "pointer"
                }}
              >
                ロック解除
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Common Header
  const Header = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <BackToHome />
      <div style={{ 
        width: 40, height: 40, borderRadius: 10, 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0
      }}>
        <ListTodo size={20} />
      </div>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>タスク整理くん</h1>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>文章からTODOを自動抽出</p>
      </div>
    </div>
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", paddingBottom: 80 }}>
        <div style={{ 
          padding: "12px 16px", background: "var(--card-bg)", 
          borderBottom: "1px solid var(--card-border)", position: "sticky", top: 0, zIndex: 10,
          display: "flex", alignItems: "center", gap: 12
        }}>
          <BackToHome />
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>タスク整理くん</h1>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: activeTab === "history" ? "block" : "none" }}><Sidebar /></div>
          <div style={{ display: activeTab === "input" ? "block" : "none" }}><MainContent /></div>
          <div style={{ display: activeTab === "preview" ? "block" : "none" }}><ResultPanel /></div>
        </div>

        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "var(--card-bg)", borderTop: "1px solid var(--card-border)",
          display: "flex", justifyContent: "space-around", padding: "12px 0", zIndex: 50,
          paddingBottom: "max(12px, env(safe-area-inset-bottom))"
        }}>
          {[
            { id: "history", icon: History, label: "履歴" },
            { id: "input", icon: Play, label: "入力" }, // Using Play as simple action icon
            { id: "preview", icon: Check, label: "結果" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                color: activeTab === tab.id ? "#667eea" : "var(--text-tertiary)",
                fontSize: 10, fontWeight: 600, cursor: "pointer", width: "33%"
              }}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // PC Layout
  return (
    <div style={{ minHeight: "100vh", padding: 16, background: "var(--background)" }}>
      <Header />
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", minHeight: "calc(100vh - 120px)" }}>
        <Sidebar />
        <MainContent />
        <ResultPanel />
      </div>
    </div>
  );
}