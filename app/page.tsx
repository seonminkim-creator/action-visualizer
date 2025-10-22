"use client";
import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
  
  // inferred_actionsの型チェック
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

export default function ActionVisualizer() {
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(true);
  const [showAllTasks, setShowAllTasks] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [history, setHistory] = useState<Array<{ id: string; at: number; input: string; result: AnalyzeResult }>>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("actionviz_history_v1");
      if (raw) setHistory(JSON.parse(raw));
      
      const savedUserName = localStorage.getItem("actionviz_username");
      if (savedUserName) setUserName(savedUserName);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("actionviz_history_v1", JSON.stringify(history.slice(0, 50)));
    } catch {}
  }, [history]);

  useEffect(() => {
    try {
      if (userName) {
        localStorage.setItem("actionviz_username", userName);
      }
    } catch {}
  }, [userName]);

  async function analyze(): Promise<void> {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowAllTasks(false); // 新しい解析時は折りたたむ
    const api = await callAnalyzeAPI(text, userName);
    if (api) {
      setResult(api);
      setHistory((h) => [{ id: crypto.randomUUID(), at: Date.now(), input: text, result: api }, ...h].slice(0, 50));
    } else {
      const mock = mockAnalyze(text, userName);
      setResult(mock);
      setError("APIエラー。プレビュー用の暫定結果を表示しています。");
      setHistory((h) => [{ id: crypto.randomUUID(), at: Date.now(), input: text, result: mock }, ...h].slice(0, 50));
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "#f8fafc" }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (min-width: 768px) {
          .container { padding: 32px; }
        }
        input::placeholder, textarea::placeholder {
          color: #94a3b8;
          opacity: 1;
        }
      `}</style>
      <div style={{ margin: "0 auto", maxWidth: 960 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h1 style={{ 
              fontSize: "clamp(14px, 4vw, 24px)", 
              fontWeight: 600, 
              margin: 0,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "6px 12px",
              borderRadius: 6,
              display: "inline-block"
            }}>
              タスクみえーるくん 👀
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <label style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>名前:</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="例: 田中"
                style={{ 
                  padding: "6px 10px", 
                  borderRadius: 6, 
                  border: "1px solid #d1d5db", 
                  fontSize: 12,
                  width: "100px",
                  maxWidth: "120px",
                  background: "white"
                }}
              />
            </div>
          </div>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
            {loading ? "タスクを整理中です…" : "文章を貼り付けて、今やるべきことを見える化"}
          </p>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <textarea
            placeholder="ここに文章を貼り付け（メール、議事録など）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ 
              minHeight: 150, 
              padding: 12, 
              borderRadius: 8, 
              border: "1px solid #d1d5db", 
              fontSize: 14, 
              width: "100%", 
              boxSizing: "border-box",
              background: "white",
              color: "#1e293b"
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={analyze}
              disabled={loading || !input.trim()}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: loading || !input.trim() ? "#94a3b8" : "#0f172a",
                color: "white",
                border: "none",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14
              }}
            >
              {loading && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
              みえーる化
            </button>
            <button
              onClick={() => setInput("")}
              disabled={loading}
              style={{
                fontSize: 13,
                color: "#475569",
                background: "transparent",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                padding: "6px 10px"
              }}
            >
              クリア
            </button>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              style={{
                marginLeft: "auto",
                fontSize: 13,
                color: "#1e293b",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px 10px",
                whiteSpace: "nowrap"
              }}
            >
              履歴 {historyOpen ? "✕" : "▼"}
            </button>
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("過去の履歴を全て削除しますか？")) {
                    setHistory([]);
                    localStorage.removeItem("actionviz_history_v1");
                  }
                }}
                style={{
                  fontSize: 13,
                  color: "#dc2626",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 10px"
                }}
              >
                削除
              </button>
            )}
          </div>
        </div>

        {typeof error === "string" && error && (
          <div style={{ color: "#dc2626", fontSize: 14, marginTop: 12, padding: 12, background: "#fee", borderRadius: 8 }}>{error}</div>
        )}

        {isAnalyzeResult(result) && !loading && (
          <>
            {/* セクション1: 今すべきこと */}
            <div style={{ background: "white", borderRadius: 8, padding: "16px", marginTop: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: 13, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #e5e7eb", wordBreak: "break-word" }}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>要約：</span>
                <span style={{ color: "#1e293b" }}>{result.summary}</span>
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                <section>
                  <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "#0f172a" }}>📋 依頼内容</h2>
                  <ul style={{ paddingLeft: 20, margin: 0 }}>
                    {result.explicit_points.map((s, i) => (
                      <li key={i} style={{ marginBottom: 8, fontSize: 13, color: "#334155", wordBreak: "break-word" }}>
                        {String(s)}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: 0 }}>🎯 対応タスク</h2>
                    {result.inferred_actions.filter(item => item.priority !== "high").length > 0 && (
                      <button
                        onClick={() => setShowAllTasks(!showAllTasks)}
                        style={{
                          fontSize: 11,
                          color: "#475569",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px 6px",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {showAllTasks ? "中・低 ▲" : `他 ${result.inferred_actions.filter(item => item.priority !== "high").length}件 ▼`}
                      </button>
                    )}
                  </div>
                  <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
                    {result.inferred_actions
                      .sort((a, b) => {
                        const priorityOrder = { high: 0, medium: 1, low: 2 };
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                      })
                      .filter(item => showAllTasks || item.priority === "high")
                      .map((item, i) => {
                        const priorityColors = {
                          high: { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", label: "高" },
                          medium: { bg: "#fef3c7", border: "#fcd34d", text: "#d97706", label: "中" },
                          low: { bg: "#f0f9ff", border: "#93c5fd", text: "#2563eb", label: "低" }
                        };
                        const priority = priorityColors[item.priority];
                        const isMyTask = item.assignee === userName || item.assignee === "あなた";
                        const assigneeColor = isMyTask ? "#10b981" : "#64748b";
                        return (
                          <li key={i} style={{ marginBottom: 10, fontSize: 13, color: "#334155", display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                              <span style={{ 
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                background: priority.bg,
                                border: `1px solid ${priority.border}`,
                                color: priority.text,
                                minWidth: 24,
                                textAlign: "center"
                              }}>
                                {priority.label}
                              </span>
                              <span style={{ 
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 500,
                                background: isMyTask ? "#ecfdf5" : "#f1f5f9",
                                border: `1px solid ${isMyTask ? "#86efac" : "#cbd5e1"}`,
                                color: assigneeColor,
                                maxWidth: "80px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}>
                                {item.assignee}
                              </span>
                            </div>
                            <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>{String(item.text)}</span>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              </div>
            </div>

            {/* セクション2: 詳細解説 */}
            <div style={{ background: "white", borderRadius: 8, padding: "16px", marginTop: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#0f172a" }}>📝 詳細解説</h2>
              <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, margin: 0, wordBreak: "break-word" }}>
                {result.detailed_analysis}
              </p>
            </div>
          </>
        )}

        {historyOpen && history.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 10 }}>📜 過去のみえーる化</h3>
            <ul style={{ display: "grid", gap: 10, listStyle: "none", padding: 0 }}>
              {history.map((h) => (
                <li
                  key={h.id}
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                  onClick={() => {
                    setInput(String(h.input));
                    setResult(h.result);
                  }}
                >
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{new Date(h.at).toLocaleString("ja-JP")}</div>
                  <div style={{ fontSize: 13, color: "#1e293b" }}>
                    {String(h.input).slice(0, 120)}
                    {String(h.input).length > 120 ? "…" : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: 11, color: "#64748b", textAlign: "center" }}>
          タスクみえーるくん - AIが文章からやるべきことを整理します
        </p>
      </div>
    </div>
  );
}