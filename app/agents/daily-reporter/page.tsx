"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Loader2, Mic, Square, Copy, Check, FileText, Building2,
  ThumbsUp, ThumbsDown, History, X, MessageSquare,
  Plus, Settings, PenTool, ChevronRight
} from "lucide-react";
import BackToHome from "../../components/BackToHome";
import { DailyReport } from "@/lib/types/daily-report";

// --- Components ---

const SectionHeader = ({ icon, title, count, action }: { icon: React.ReactNode; title: string; count?: number; action?: React.ReactNode }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--card-border)"
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
      {count !== undefined && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--background)", padding: "2px 8px", borderRadius: 10 }}>{count}</span>
      )}
    </div>
    {action}
  </div>
);

export default function DailyReporter() {
  // State
  const [transcript, setTranscript] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [products, setProducts] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DailyReport | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [reportHistory, setReportHistory] = useState<Array<{ id: string; date: string; destination: string; products: string[]; report: DailyReport }>>([]);
  const [userName, setUserName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [showUserSettings, setShowUserSettings] = useState<boolean>(false);

  // Layout State
  const [isMobile, setIsMobile] = useState(true);
  const [activeTab, setActiveTab] = useState<"input" | "result" | "history">("input");

  const wakeLockRef = useRef<any>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Constants
  const templates = [
    { label: "新規訪問", text: "【目的】新規製品の紹介とニーズヒアリング\n【状況】\n【反応】\n【次なる一手】" },
    { label: "継続フォロー", text: "【前回課題】\n【進捗】\n【本日の合意事項】\n【次回宿題】" },
    { label: "クレーム対応", text: "【事象】\n【原因】\n【暫定対応】\n【今後の恒久対策】" },
  ];

  // Effects
  useEffect(() => {
    document.title = "営業日報くん | 営業AIポータル";
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadHistory();
    const globalUserName = localStorage.getItem("globalUserName");
    const globalCompanyName = localStorage.getItem("globalCompanyName");
    const localUserName = localStorage.getItem("dailyReportUserName");
    const localCompanyName = localStorage.getItem("dailyReportCompanyName");
    setUserName(globalUserName || localUserName || "");
    setCompanyName(globalCompanyName || localCompanyName || "");
  }, []);

  useEffect(() => {
    if (result && isMobile) setActiveTab("result");
  }, [result, isMobile]);

  useEffect(() => {
    if (result !== null) {
      setResult(null); setError(null); setFeedbackSubmitted(false);
    }
  }, [transcript]);

  // Logic
  function loadHistory() {
    try {
      const stored = localStorage.getItem("dailyReportHistory");
      if (stored) setReportHistory(JSON.parse(stored));
    } catch {}
  }

  function saveToHistory(report: DailyReport) {
    try {
      const newEntry = {
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString(),
        destination: report.visitInfo.destination,
        products: report.targetProducts,
        report,
      };
      const stored = localStorage.getItem("dailyReportHistory");
      const history = stored ? JSON.parse(stored) : [];
      const updatedHistory = [newEntry, ...history].slice(0, 20);
      localStorage.setItem("dailyReportHistory", JSON.stringify(updatedHistory));
      setReportHistory(updatedHistory);
    } catch {}
  }

  function loadFromHistory(historyEntry: any) {
    setResult(historyEntry.report);
    setReportId(historyEntry.id);
    setFeedbackSubmitted(false);
    setDestination(historyEntry.destination || "");
    setProducts(historyEntry.products?.join(", ") || "");
    if (isMobile) setActiveTab("result");
  }

  function saveUserSettings() {
    if (!userName.trim()) { alert("⚠️ 名前を入力してください"); return; }
    localStorage.setItem("globalUserName", userName.trim());
    localStorage.setItem("globalCompanyName", companyName.trim());
    localStorage.setItem("dailyReportUserName", userName.trim());
    localStorage.setItem("dailyReportCompanyName", companyName.trim());
    setShowUserSettings(false);
    alert("✅ ユーザー設定を保存しました");
  }

  async function submitFeedback(rating: "good" | "bad"): Promise<void> {
    if (!reportId) return;
    try {
      await fetch("/api/daily-report-feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, rating }),
      });
      setFeedbackSubmitted(true);
    } catch {}
  }

  async function startRecording(): Promise<void> {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if ('wakeLock' in navigator && !isIOS) {
        try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch {}
      }
      if (isIOS) {
        try {
          const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAABQAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV//////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAAbC9Zfjh/+MYxAALACwAAP/AADwQKVE62Zc8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
          silentAudio.loop = true; silentAudio.volume = 0.01; await silentAudio.play(); silentAudioRef.current = silentAudio;
        } catch {}
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setError(null);
      setRecordingTime(0);
      setRecordingInterval(setInterval(() => setRecordingTime((prev) => prev + 1), 1000));
    } catch {
      setError("マイクへのアクセスが拒否されました");
    }
  }

  function stopRecording(): void {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      if (recordingInterval) clearInterval(recordingInterval);
      if (wakeLockRef.current) wakeLockRef.current.release();
      if (silentAudioRef.current) silentAudioRef.current.pause();
    }
  }

  async function transcribeAudio(audioBlob: Blob): Promise<void> {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTranscript((prev) => (prev ? prev + "\n\n" : "") + data.transcription);
    } catch {
      setError("文字起こしに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  async function copyToClipboard(text: string, sectionName: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {}
  }

  function getFullReportText(): string {
    if (!result) return "";
    let participants = [...result.visitInfo.participants];
    if (userName.trim() && !participants.some(p => p.includes(userName.trim()))) {
      participants.push(companyName.trim() ? `${companyName.trim()} ${userName.trim()}` : userName.trim());
    }
    return `・タイトル\n${result.title}\n\n・訪問先、参加者\n訪問先: ${result.visitInfo.destination}\n参加者: ${participants.join("、")}\n\n・商談対象製品\n${result.targetProducts.join("、")}\n\n・訪問内容要約\n① 目的\n${result.visitSummary.purpose}\n\n② 結果\n${result.visitSummary.result}\n\n③ 提案\n${result.visitSummary.proposal}\n\n④ 課題\n${result.visitSummary.challenges}\n\n⑤ 次のステップ\n${result.visitSummary.nextSteps}`;
  }

  async function generateReport(): Promise<void> {
    if (!transcript.trim()) { setError("商談内容を入力してください"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/daily-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          destination: destination.trim() || undefined,
          products: products.trim() ? products.split(",").map(p => p.trim()) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data || !data.report) throw new Error();
      setResult(data.report);
      setReportId(`report_${Date.now()}`);
      setFeedbackSubmitted(false);
      saveToHistory(data.report);
    } catch {
      setError("日報の生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const insertTemplate = (text: string) => {
    if (transcript.trim() && !confirm("入力内容をリセットしてテンプレートを挿入しますか？")) return;
    setTranscript(text);
  };

  const getQualityStatus = () => {
    const len = transcript.length;
    if (len === 0) return { label: "未入力", color: "var(--text-tertiary)" };
    if (len < 50) return { label: "情報不足", color: "#ef4444" };
    if (len < 200) return { label: "やや不足", color: "#f59e0b" };
    if (len < 1000) return { label: "良好", color: "#10b981" };
    return { label: "非常に詳細", color: "#059669" };
  };
  const quality = getQualityStatus();

  // --- Render ---

  const HistoryList = () => (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
       {reportHistory.length === 0 ? <p style={{fontSize:12, color:"var(--text-secondary)", textAlign:"center"}}>履歴なし</p> : (
           reportHistory.map(h => (
               <div key={h.id} onClick={() => loadFromHistory(h)} style={{ padding: 12, borderRadius: 8, background: "var(--background)", border: "1px solid var(--card-border)", cursor: "pointer" }}>
                   <div style={{fontSize:11, color:"var(--text-secondary)"}}>{new Date(h.date).toLocaleString()}</div>
                   <div style={{fontSize:13, fontWeight:600}}>{h.destination || "訪問先未設定"}</div>
                   <div style={{fontSize:11, color:"var(--text-tertiary)"}}>{h.products.join(", ")}</div>
               </div>
           ))
       )}
    </div>
  );

  const MainInput = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
       <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, border: "1px solid var(--card-border)" }}>
          <SectionHeader icon={<Mic size={16} color="#ef4444" />} title="音声入力" />
          {!isRecording ? (
             <button onClick={startRecording} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 8, background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)", color: "white", border: "none", cursor: loading?"not-allowed":"pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Mic size={16} /> 録音を開始
             </button>
          ) : (
             <div style={{ background: "#fef2f2", borderRadius: 10, padding: 16, border: "1px solid #fecaca", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>{formatTime(recordingTime)}</div>
                <button onClick={stopRecording} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#ef4444", color: "white", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Square size={14} /> 停止
                </button>
             </div>
          )}
       </div>

       <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, border: "1px solid var(--card-border)" }}>
           <SectionHeader icon={<Building2 size={16} color="#3b82f6" />} title="訪問情報" />
           <div style={{ marginBottom: 12 }}>
               <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>訪問先</label>
               <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="例: ○○農園" style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--background)", fontSize: 13, boxSizing: "border-box" }} />
           </div>
           <div>
               <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>商談対象製品</label>
               <input type="text" value={products} onChange={e => setProducts(e.target.value)} placeholder="例: プロソイル (カンマ区切り)" style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--background)", fontSize: 13, boxSizing: "border-box" }} />
           </div>
       </div>

       <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: 16, border: "1px solid var(--card-border)" }}>
           <SectionHeader icon={<MessageSquare size={16} color="#10b981" />} title="商談内容" action={<span style={{fontSize:11, color: quality.color, fontWeight:600}}>{quality.label}</span>} />
           <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
               {templates.map((t, i) => (
                   <button key={i} onClick={() => insertTemplate(t.text)} style={{ padding: "4px 8px", borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--background)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                       <Plus size={10} /> {t.label}
                   </button>
               ))}
               <button onClick={() => setTranscript("")} style={{ marginLeft: "auto", padding: "4px 8px", background: "transparent", border: "none", fontSize: 11, color: "var(--text-tertiary)", cursor: "pointer" }}>クリア</button>
           </div>
           <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="商談内容を入力..." style={{ width: "100%", minHeight: 150, padding: 12, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--background)", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
           <button onClick={generateReport} disabled={loading || !transcript.trim()} style={{ width: "100%", marginTop: 16, padding: "12px", borderRadius: 8, background: loading || !transcript.trim() ? "var(--text-tertiary)" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", cursor: loading || !transcript.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
               {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} 日報を作成
           </button>
       </div>
    </div>
  );

  const ResultView = () => {
    if (!result) return (
       <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
           <FileText style={{ opacity: 0.2, marginBottom: 16, width: 48, height: 48 }} />
           <p style={{fontSize:14}}>ここに日報が表示されます</p>
       </div>
    );
    return (
       <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
           <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 8, border: "1px solid #86efac", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <h3 style={{ margin: 0, fontSize: 14, color: "#166534" }}>{result.title}</h3>
               <button onClick={() => copyToClipboard(getFullReportText(), "all")} style={{ padding: "6px 10px", borderRadius: 6, background: copiedSection === "all" ? "#10b981" : "white", color: copiedSection === "all" ? "white" : "#166534", border: "1px solid #86efac", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                   {copiedSection === "all" ? <Check size={14} /> : <Copy size={14} />} コピー
               </button>
           </div>
           <div>
               <SectionHeader icon={<Building2 size={16} color="#667eea" />} title="詳細" />
               <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                   <strong>訪問先:</strong> {result.visitInfo.destination}<br />
                   <strong>製品:</strong> {result.targetProducts.join(", ")}
               </div>
           </div>
           <div>
               <SectionHeader icon={<MessageSquare size={16} color="#f97316" />} title="要約" />
               <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                   <strong>【目的】</strong> {result.visitSummary.purpose}<br />
                   <strong>【結果】</strong> {result.visitSummary.result}<br />
                   <strong>【提案】</strong> {result.visitSummary.proposal}<br />
                   <strong>【課題】</strong> {result.visitSummary.challenges}<br />
                   <strong>【次】</strong> {result.visitSummary.nextSteps}
               </div>
           </div>
           {!feedbackSubmitted ? (
               <div style={{ padding: 12, background: "var(--background)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <span style={{fontSize:12, color:"var(--text-secondary)"}}>評価:</span>
                   <div style={{display:"flex", gap:8}}>
                       <button onClick={() => submitFeedback("good")} style={{background:"none", border:"none", cursor:"pointer", color:"#10b981"}}><ThumbsUp size={16}/></button>
                       <button onClick={() => submitFeedback("bad")} style={{background:"none", border:"none", cursor:"pointer", color:"#ef4444"}}><ThumbsDown size={16}/></button>
                   </div>
               </div>
           ) : <div style={{textAlign:"center", fontSize:12, color:"#10b981"}}>フィードバック送信済み</div>}
       </div>
    );
  };

  // Main Render
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: isMobile ? 0 : 16 }}>
      {showUserSettings && (
         <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
             <div style={{ background: "var(--card-bg)", padding: 24, borderRadius: 12, width: 300 }}>
                 <h3 style={{ marginTop: 0 }}>ユーザー設定</h3>
                 <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="氏名" style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 6, border: "1px solid var(--card-border)", boxSizing: "border-box" }} />
                 <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="会社名" style={{ width: "100%", padding: 8, marginBottom: 16, borderRadius: 6, border: "1px solid var(--card-border)", boxSizing: "border-box" }} />
                 <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                     <button onClick={() => setShowUserSettings(false)} style={{ padding: "6px 12px" }}>キャンセル</button>
                     <button onClick={saveUserSettings} style={{ padding: "6px 12px", background: "#667eea", color: "white", border: "none", borderRadius: 6 }}>保存</button>
                 </div>
             </div>
         </div>
      )}

      {!isMobile ? (
        <div style={{ maxWidth: 1400, margin: "0 auto", height: "calc(100vh - 32px)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <BackToHome />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FileText size={20} />
                </div>
                <div>
                   <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>営業日報くん</h1>
                   <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>商談から日報を自動生成</p>
                </div>
                <button onClick={() => setShowUserSettings(true)} style={{ marginLeft: "auto", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--card-border)", background: "transparent", cursor: "pointer", fontSize: 12 }}>ユーザー設定</button>
            </div>
            
            <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                <div style={{ width: 280, background: "var(--card-bg)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", border: "1px solid var(--card-border)" }}>
                    <SectionHeader icon={<History size={16} color="#667eea" />} title="履歴" />
                    <HistoryList />
                </div>
                <div style={{ flex: 1, minWidth: 400, overflowY: "auto" }}>
                    <MainInput />
                </div>
                <div style={{ width: 400, background: "var(--card-bg)", borderRadius: 12, padding: 16, overflowY: "auto", border: "1px solid var(--card-border)" }}>
                    <ResultView />
                </div>
            </div>
        </div>
      ) : (
        <div style={{ paddingBottom: 80 }}>
            <div style={{ padding: "12px 16px", background: "var(--card-bg)", borderBottom: "1px solid var(--card-border)", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <BackToHome />
                <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>営業日報くん</h1>
                <Settings size={20} onClick={() => setShowUserSettings(true)} style={{ marginLeft: "auto", color: "var(--text-secondary)" }} />
            </div>

            <div style={{ padding: 16 }}>
                {activeTab === "input" && <MainInput />}
                {activeTab === "result" && <div style={{ background: "var(--card-bg)", padding: 16, borderRadius: 12 }}><ResultView /></div>}
                {activeTab === "history" && <div style={{ background: "var(--card-bg)", padding: 16, borderRadius: 12 }}><HistoryList /></div>}
            </div>

            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--card-bg)", borderTop: "1px solid var(--card-border)", display: "flex", justifyContent: "space-around", padding: "12px 0", zIndex: 50, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
                {[
                    { id: "input", icon: PenTool, label: "入力" },
                    { id: "result", icon: FileText, label: "結果" },
                    { id: "history", icon: History, label: "履歴" },
                ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: activeTab === tab.id ? "#667eea" : "var(--text-tertiary)", fontSize: 10, fontWeight: 600, cursor: "pointer", width: "33%" }}>
                        <tab.icon size={20} /> {tab.label}
                    </button>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
