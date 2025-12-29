"use client";
import React, { useState, useEffect } from "react";
import { Loader2, Mail, Copy, Check, RotateCcw, Settings, Brain, Trash2, PenTool, MessageSquare, ChevronRight, User } from "lucide-react";
import BackToHome from "../../components/BackToHome";

type TaskType = "reply" | "compose";

// --- Components ---

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 12, paddingBottom: 8,
    borderBottom: "1px solid var(--card-border)"
  }}>
    {icon}
    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
  </div>
);

export default function EmailComposer() {
  // --- State ---
  const [taskType, setTaskType] = useState<TaskType>("reply");
  const [inputText, setInputText] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Style Learning
  const [styleProfile, setStyleProfile] = useState<string | null>(null);
  const [sampleEmails, setSampleEmails] = useState<string[]>(["", "", ""]);
  const [learningLoading, setLearningLoading] = useState<boolean>(false);
  const [learningError, setLearningError] = useState<string | null>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);

  // User Settings
  const [userName, setUserName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");

  // Layout
  const [isMobile, setIsMobile] = useState(true);
  const [activeTab, setActiveTab] = useState<"input" | "result" | "settings">("input");

  // --- Effects ---
  useEffect(() => {
    document.title = "メール返信叩きくん | 営業AIポータル";
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (result && isMobile) setActiveTab("result");
  }, [result, isMobile]);

  useEffect(() => {
    const savedProfile = localStorage.getItem("emailStyleProfile");
    if (savedProfile) setStyleProfile(savedProfile);

    const globalUserName = localStorage.getItem("globalUserName");
    const globalCompanyName = localStorage.getItem("globalCompanyName");
    const localUserName = localStorage.getItem("emailUserName");
    const localCompanyName = localStorage.getItem("emailCompanyName");

    setUserName(globalUserName || localUserName || "");
    setCompanyName(globalCompanyName || localCompanyName || "");
  }, []);

  // --- Logic ---
  async function generateEmail(): Promise<void> {
    if (!inputText.trim()) {
      setError("メール内容または依頼内容を入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/email-composer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          inputText: inputText.trim(),
          additionalInfo: additionalInfo.trim(),
          styleProfile: styleProfile || undefined,
          userName: userName.trim() || undefined,
          companyName: companyName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "メール生成に失敗しました");
      }

      const data = await res.json();
      if (!data.email) throw new Error("生成結果が空です");
      setResult(data.email);
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function learnWritingStyle(): Promise<void> {
    const validEmails = sampleEmails.filter(email => email.trim() !== "");
    if (validEmails.length === 0) {
      setLearningError("少なくとも1つのサンプルメールを入力してください");
      return;
    }
    setLearningLoading(true);
    setLearningError(null);

    try {
      const res = await fetch("/api/analyze-writing-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleEmails: validEmails }),
      });

      if (!res.ok) throw new Error("文体分析に失敗しました");
      const data = await res.json();
      if (!data.styleProfile) throw new Error("分析結果が空です");

      localStorage.setItem("emailStyleProfile", data.styleProfile);
      setStyleProfile(data.styleProfile);
      alert("✅ 文体の学習が完了しました！");
      setShowStyleModal(false);
    } catch (err: any) {
      setLearningError(err.message || "エラーが発生しました");
    } finally {
      setLearningLoading(false);
    }
  }

  function clearStyleProfile(): void {
    if (confirm("学習した文体をリセットしますか？")) {
      localStorage.removeItem("emailStyleProfile");
      setStyleProfile(null);
    }
  }

  function saveUserSettings(): void {
    localStorage.setItem("globalUserName", userName.trim());
    localStorage.setItem("globalCompanyName", companyName.trim());
    localStorage.setItem("emailUserName", userName.trim());
    localStorage.setItem("emailCompanyName", companyName.trim());
    alert("設定を保存しました");
  }

  async function copyToClipboard(): Promise<void> {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const taskTypeLabels = { reply: "返信作成", compose: "新規作成" };
  const taskTypePlaceholders = {
    reply: "受信したメール内容を貼り付けてください...",
    compose: "作成したいメールの要件を入力してください（例：新商品の案内、価格改定のお知らせ）",
  };

  // --- Render ---

  // Sidebar Component (PC) / Settings Tab (Mobile)
  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {isMobile && <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>設定</h2>}
      
      {/* Mode Selection (Only in Sidebar for PC, in Main for Mobile maybe? No, let's keep Mode separate) */}
      {!isMobile && (
        <div>
           <SectionHeader icon={<Settings size={16} color="#667eea" />} title="モード選択" />
           <div style={{ display: "flex", background: "var(--background)", padding: 4, borderRadius: 8 }}>
             {(["reply", "compose"] as TaskType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTaskType(type)}
                  style={{
                    flex: 1, padding: "8px", borderRadius: 6,
                    background: taskType === type ? "var(--foreground)" : "transparent",
                    color: taskType === type ? "var(--background)" : "var(--text-secondary)",
                    border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600
                  }}
                >
                  {taskTypeLabels[type]}
                </button>
             ))}
           </div>
        </div>
      )}

      {/* User info */}
      <div>
        <SectionHeader icon={<User size={16} color="#f59e0b" />} title="ユーザー情報" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>会社名</label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="例: 株式会社〇〇" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>氏名</label>
            <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="例: 山田 太郎" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box", fontSize: 13 }} />
          </div>
          <button onClick={saveUserSettings} style={{ padding: "8px", borderRadius: 6, background: "var(--card-border)", color: "var(--foreground)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>保存</button>
        </div>
      </div>

      {/* Style Learning */}
      <div>
        <SectionHeader icon={<Brain size={16} color="#10b981" />} title="文体学習" />
        {styleProfile ? (
            <div style={{ padding: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#166534", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    <Check size={14} /> 学習済み
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowStyleModal(true)} style={{ flex: 1, padding: "6px", fontSize: 11, background: "white", border: "1px solid #86efac", borderRadius: 4, cursor: "pointer", color: "#166534" }}>再学習</button>
                    <button onClick={clearStyleProfile} style={{ padding: "6px", fontSize: 11, background: "white", border: "1px solid #fecaca", borderRadius: 4, cursor: "pointer", color: "#dc2626" }}><Trash2 size={12} /></button>
                </div>
            </div>
        ) : (
            <div style={{ padding: 12, background: "var(--background)", borderRadius: 8, border: "1px solid var(--card-border)", textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px" }}>あなたのメール文体をAIに学習させます</p>
                <button onClick={() => setShowStyleModal(true)} style={{ width: "100%", padding: "8px", background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>学習を開始</button>
            </div>
        )}
      </div>
    </div>
  );

  // Main Input Component
  const MainContent = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
      {/* Mobile Mode Switcher */}
      {isMobile && (
         <div style={{ display: "flex", background: "var(--card-bg)", padding: 4, borderRadius: 8, border: "1px solid var(--card-border)" }}>
           {(["reply", "compose"] as TaskType[]).map((type) => (
              <button
                key={type}
                onClick={() => setTaskType(type)}
                style={{
                  flex: 1, padding: "8px", borderRadius: 6,
                  background: taskType === type ? "var(--foreground)" : "transparent",
                  color: taskType === type ? "var(--background)" : "var(--text-secondary)",
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600
                }}
              >
                {taskTypeLabels[type]}
              </button>
           ))}
         </div>
      )}

      {/* Input Area */}
      <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>
            {taskType === "reply" ? "受信メール" : "作成要件"}
        </h3>
        <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={taskTypePlaceholders[taskType]}
            style={{
                width: "100%", flex: 1, minHeight: 200, padding: 12, borderRadius: 8,
                border: "1px solid var(--card-border)", background: "var(--background)",
                color: "var(--foreground)", fontSize: 14, resize: "none", boxSizing: "border-box"
            }}
        />

        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "16px 0 8px" }}>追加指示 (オプション)</h3>
        <textarea
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
            placeholder="例: 親しみやすいトーンで、来週の火曜日を提案して"
            style={{
                width: "100%", height: 80, padding: 12, borderRadius: 8,
                border: "1px solid var(--card-border)", background: "var(--background)",
                color: "var(--foreground)", fontSize: 14, resize: "none", boxSizing: "border-box"
            }}
        />

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button
                onClick={generateEmail}
                disabled={loading || !inputText.trim()}
                style={{
                    flex: 1, padding: "12px", borderRadius: 8,
                    background: loading || !inputText.trim() ? "var(--text-tertiary)" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white", border: "none", cursor: loading || !inputText.trim() ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                メール生成
            </button>
            <button
                onClick={() => { setInputText(""); setAdditionalInfo(""); setResult(null); }}
                style={{
                    padding: "12px 20px", borderRadius: 8, background: "transparent",
                    border: "1px solid var(--card-border)", color: "var(--text-secondary)",
                    cursor: "pointer", fontSize: 14, fontWeight: 600
                }}
            >
                クリア
            </button>
        </div>
        {error && <div style={{ marginTop:16, padding:12, background:"#fee2e2", color:"#dc2626", borderRadius:8, fontSize:13 }}>{error}</div>}
      </div>
    </div>
  );

  // Result Component
  const ResultPanel = () => {
      if (!result) return (
          <div style={{ flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
              <div style={{ textAlign: "center" }}>
                  <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                  <p>ここに生成されたメールが表示されます</p>
              </div>
          </div>
      );
      return (
        <div style={{ flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column" }}>
            <SectionHeader icon={<Check size={16} color="#10b981" />} title="生成結果" />
            <div style={{ flex: 1, background: "var(--background)", padding: 16, borderRadius: 8, border: "1px solid var(--card-border)", overflowY: "auto", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8 }}>
                {result}
            </div>
            <button
                onClick={copyToClipboard}
                style={{
                    marginTop: 16, width: "100%", padding: "12px", borderRadius: 8,
                    background: copied ? "#10b981" : "var(--foreground)",
                    color: "white", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
            >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "コピー完了" : "コピーする"}
            </button>
        </div>
      );
  };

  // Learning Modal
  const LearningModal = () => (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--modal-overlay)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowStyleModal(false)}>
          <div style={{ width: "100%", maxWidth: 600, background: "var(--card-bg)", borderRadius: 16, padding: 24, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
             <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>文体学習</h3>
             <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                あなたが普段書いているメールを1〜3件貼り付けてください。AIが文体やトーンを学習します。
             </p>
             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {sampleEmails.map((txt, i) => (
                    <div key={i}>
                        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "block" }}>サンプル {i+1}</label>
                        <textarea
                            value={txt}
                            onChange={e => {
                                const n = [...sampleEmails];
                                n[i] = e.target.value;
                                setSampleEmails(n);
                            }}
                            placeholder={i === 0 ? "（必須）お世話になっております..." : "（任意）"}
                            style={{ width: "100%", height: 100, padding: 10, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
                        />
                    </div>
                ))}
             </div>
             {learningError && <div style={{ marginTop: 16, color: "#dc2626", fontSize: 13 }}>{learningError}</div>}
             <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button onClick={() => setShowStyleModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "transparent", color: "var(--foreground)", cursor: "pointer", fontWeight: 600 }}>キャンセル</button>
                <button onClick={learnWritingStyle} disabled={learningLoading} style={{ flex: 2, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {learningLoading && <Loader2 className="animate-spin" size={16} />} 学習する
                </button>
             </div>
          </div>
      </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: isMobile ? 0 : 16 }}>
        {showStyleModal && <LearningModal />}

        {!isMobile ? (
            <div style={{ maxWidth: 1200, margin: "0 auto", height: "calc(100vh - 32px)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <BackToHome />
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                        <Mail size={20} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>メール返信叩きくん</h1>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>ビジネスメールをAIが代筆</p>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                    <div style={{ width: 260, background: "var(--card-bg)", borderRadius: 12, padding: 16, overflowY: "auto" }}>
                        <SidebarContent />
                    </div>
                    <MainContent />
                    <div style={{ width: 400, display: "flex", flexDirection: "column" }}>
                        <ResultPanel />
                    </div>
                </div>
            </div>
        ) : (
            <div style={{ paddingBottom: 80 }}>
                <div style={{ padding: "12px 16px", background: "var(--card-bg)", borderBottom: "1px solid var(--card-border)", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
                    <BackToHome />
                    <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>メール返信叩きくん</h1>
                </div>

                <div style={{ padding: 16 }}>
                     {activeTab === "input" && <MainContent />}
                     {activeTab === "result" && <ResultPanel />}
                     {activeTab === "settings" && <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16 }}><SidebarContent /></div>}
                </div>

                <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--card-bg)", borderTop: "1px solid var(--card-border)", display: "flex", justifyContent: "space-around", padding: "12px 0", zIndex: 50, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
                    {[
                        { id: "input", icon: PenTool, label: "入力" },
                        { id: "result", icon: MessageSquare, label: "結果" },
                        { id: "settings", icon: Settings, label: "設定" },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: activeTab === tab.id ? "#00f2fe" : "var(--text-tertiary)", fontSize: 10, fontWeight: 600, cursor: "pointer", width: "33%" }}>
                            <tab.icon size={20} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}
