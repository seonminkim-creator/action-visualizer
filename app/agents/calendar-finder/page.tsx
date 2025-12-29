"use client";
import { useState, useEffect } from "react";
import BackToHome from "../../components/BackToHome";
import { 
  Copy, Calendar, Search, Settings, Check, 
  ChevronRight, Mail, User, Clock, Monitor, 
  RotateCcw, Sliders, LogOut, Loader2, Lock
} from "lucide-react";
import { Period, Mode, DaySlots, Slot } from "../../types/calendar";
import { getMockAvailability, periodLabels } from "../../lib/mockData";

// --- Types ---
type CalendarProvider = "google" | "microsoft";

// --- Helper Components ---
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

export default function CalendarFinder() {
  // --- State ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [mode, setMode] = useState<Mode>("visit");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DaySlots[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [calendarProvider, setCalendarProvider] = useState<CalendarProvider>("google");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticatedProviders, setAuthenticatedProviders] = useState<{ google: boolean, microsoft: boolean }>({ google: false, microsoft: false });
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings
  const [mailSubject, setMailSubject] = useState("打合せ候補日のご提案（{期間}）");
  const [mailBody, setMailBody] = useState(`＜候補日＞\n{候補日}\n\n※上記日程が難しい場合は、ご都合のよろしい候補をお知らせいただけますと幸いです。\n\n＜方法＞\n対面 or オンライン`);
  const [ignoreKeywords, setIgnoreKeywords] = useState("空き,調整可能");
  const [dateFormat, setDateFormat] = useState("yy/mm/dd（曜日）");
  const [maxCandidates, setMaxCandidates] = useState<number | null>(null);
  const [showTodayAfternoon, setShowTodayAfternoon] = useState(false);
  const [workStartHour, setWorkStartHour] = useState(9);
  const [workEndHour, setWorkEndHour] = useState(18);
  const [enableSplitSlots, setEnableSplitSlots] = useState(false);

  // Mobile/PC Layout
  const [isMobile, setIsMobile] = useState(true);
  const [activeTab, setActiveTab] = useState<"input" | "result">("input");

  // Constants
  const periods: Period[] = ["this_week", "next_week", "next_next_week", "next_month"];
  const durations = [15, 30, 45, 60];

  const DEFAULT_SUBJECT = "打合せ候補日のご提案（{期間}）";
  const DEFAULT_BODY = `＜候補日＞\n{候補日}\n\n※上記日程が難しい場合は、ご都合のよろしい候補をお知らせいただけますと幸いです。\n\n＜方法＞\n対面 or オンライン`;
  const DEFAULT_KEYWORDS = "空き,調整可能";
  const DEFAULT_DATE_FORMAT = "yy/mm/dd（曜日）";

  // --- Effects ---
  useEffect(() => {
    document.title = "空き時間検索くん | 営業AIポータル";
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (localStorage.getItem("calendar_unlocked") === "true") setIsUnlocked(true);

    const loadSetting = (key: string, setter: (val: any) => void, type: "str" | "num" | "bool" | "num_null" = "str") => {
      const val = localStorage.getItem(key);
      if (val === null) return;
      if (type === "num") setter(Number(val));
      else if (type === "bool") setter(val === "true");
      else if (type === "num_null") setter(val === "null" ? null : Number(val));
      else setter(val);
    };

    loadSetting("mailSubject", setMailSubject);
    loadSetting("mailBody", setMailBody);
    loadSetting("ignoreKeywords", setIgnoreKeywords);
    loadSetting("dateFormat", setDateFormat);
    loadSetting("maxCandidates", setMaxCandidates, "num_null");
    loadSetting("showTodayAfternoon", setShowTodayAfternoon, "bool");
    loadSetting("workStartHour", setWorkStartHour, "num");
    loadSetting("workEndHour", setWorkEndHour, "num");
    loadSetting("enableSplitSlots", setEnableSplitSlots, "bool");

    const params = new URLSearchParams(window.location.search);
    if (params.get("authenticated") === "true") {
      setIsAuthenticated(true);
      setAuthChecking(false);
      const provider = params.get("provider");
      if (provider === "microsoft" || provider === "google") setCalendarProvider(provider);
      window.history.replaceState({}, "", "/agents/calendar-finder");
      return;
    }

    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/calendar/check-auth");
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          if (data.providers) setAuthenticatedProviders(data.providers);
          if (data.provider) setCalendarProvider(data.provider);
        }
      } catch (error) {
        console.error("Auth check error", error);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (result && isMobile) setActiveTab("result");
  }, [result, isMobile]);

  // --- Logic ---
  const handleCalendarAuth = async () => {
    setAuthLoading(true);
    try {
      const endpoint = calendarProvider === "google" ? "/api/auth/google" : "/api/auth/microsoft";
      const response = await fetch(endpoint);
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Auth error:", error);
      setAuthLoading(false);
    }
  };

  const handlePeriodClick = async (period: Period) => {
    setSelectedPeriod(period);
    setLoading(true);
    setResult(null);

    try {
      const endpoint = calendarProvider === "google" ? "/api/calendar/availability" : "/api/calendar/availability-microsoft";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          durationMin,
          ignoreKeywords: ignoreKeywords.split(",").map(k => k.trim()).filter(k => k),
          workStartHour,
          workEndHour,
          showTodayAfternoon,
        }),
      });

      if (response.status === 401) {
        const data = await response.json();
        if (data.needsReauth) {
          setIsAuthenticated(false);
          alert("認証が必要です。再度ログインしてください。");
          await handleCalendarAuth();
        }
        return;
      }

      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setResult(data.days);
    } catch (error) {
      console.error(error);
      const mockData = getMockAvailability(period);
      setResult(mockData.days);
    } finally {
      setLoading(false);
    }
  };

  const splitLongSlots = (slots: Slot[], durationMin: number): Slot[] => {
    const splitSlots: Slot[] = [];
    slots.forEach(slot => {
      const [startHour, startMin] = slot.start.split(":").map(Number);
      const [endHour, endMin] = slot.end.split(":").map(Number);
      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;
      const dur = endTotal - startTotal;

      if (dur > durationMin) {
        let cur = startTotal;
        while (cur + durationMin <= endTotal) {
          const next = cur + durationMin;
          splitSlots.push({
            start: `${String(Math.floor(cur/60)).padStart(2,"0")}:${String(cur%60).padStart(2,"0")}`,
            end: `${String(Math.floor(next/60)).padStart(2,"0")}:${String(next%60).padStart(2,"0")}`
          });
          cur = next;
        }
      } else if (dur === durationMin) {
        splitSlots.push(slot);
      }
    });
    return splitSlots;
  };

  const getFilteredResult = (): DaySlots[] | null => {
    if (!result || !durationMin) return result;
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = nowJST.toISOString().split("T")[0];
    const currentHour = nowJST.getUTCHours();

    return result.map(day => {
      if (!showTodayAfternoon && day.date === todayStr) {
        if (currentHour >= 12) return null;
        const morning = day.slots.filter(s => parseInt(s.start.split(":")[0]) < 12);
        if (morning.length === 0) return null;
        day = { ...day, slots: morning };
      }
      const filtered = day.slots.filter(s => {
        const [sh, sm] = s.start.split(":").map(Number);
        const [eh, em] = s.end.split(":").map(Number);
        return (eh*60+em) - (sh*60+sm) >= durationMin;
      });
      const final = enableSplitSlots ? splitLongSlots(filtered, durationMin) : filtered;
      return { ...day, slots: final };
    }).filter((d): d is DaySlots => d !== null);
  };

  const formatResultText = (): string => {
    if (!result || !selectedPeriod) return "";
    const lines = [periodLabels[selectedPeriod]];
    const filtered = getFilteredResult();
    if (!filtered) return "";

    filtered.forEach(day => {
      const parts = day.date.split("-");
      lines.push(`${parts[1]}/${parts[2]}(${day.weekday})`);
      if (day.slots.length === 0) lines.push("（空きなし）");
      else {
        const sorted = [...day.slots].sort((a,b) => a.start.localeCompare(b.start));
        if (sorted.length === 1) {
            const s = sorted[0];
            const [sh] = s.start.split(":").map(Number);
            const [eh] = s.end.split(":").map(Number);
            if (sh <= workStartHour && eh >= workEndHour - 1) {
                lines.push(`【午前】${String(workStartHour).padStart(2,"0")}:00〜12:00`);
                lines.push(`【午後】13:00〜${String(workEndHour).padStart(2,"0")}:00`);
            } else {
                lines.push(sorted.map(s => `${s.start}〜${s.end}`).join("／"));
            }
        } else {
            lines.push(sorted.map(s => `${s.start}〜${s.end}`).join("／"));
        }
      }
    });
    return lines.join("\n");
  };

  const formatDate = (dateStr: string, weekday: string): string => {
    const [y, m, d] = dateStr.split("-");
    switch(dateFormat) {
        case "yyyy/mm/dd（曜日）": return `${y}/${m}/${d}（${weekday}）`;
        case "yy/mm/dd（曜日）": return `${y.slice(2)}/${m}/${d}（${weekday}）`;
        case "mm/dd（曜日）": return `${m}/${d}（${weekday}）`;
        case "yyyy/mm/dd": return `${y}/${m}/${d}`;
        case "yy/mm/dd": return `${y.slice(2)}/${m}/${d}`;
        case "mm/dd": return `${m}/${d}`;
        default: return `${y.slice(2)}/${m}/${d}（${weekday}）`;
    }
  };

  const formatMailText = () => {
    if (!result || !selectedPeriod) return { subject: "", body: "" };
    const filtered = getFilteredResult();
    if (!filtered) return { subject: "", body: "" };
    const lines: string[] = [];
    filtered.forEach(day => {
        if (day.slots.length > 0 && !day.isHoliday) {
            const sorted = [...day.slots].sort((a,b) => a.start.localeCompare(b.start));
            const limited = maxCandidates ? sorted.slice(0, maxCandidates) : sorted;
            lines.push(`・${formatDate(day.date, day.weekday)} ${limited.map(s => `${s.start}〜${s.end}`).join("／")}`);
        }
    });
    return {
        subject: mailSubject.replace("{期間}", periodLabels[selectedPeriod]),
        body: mailBody.replace("{候補日}", lines.join("\n"))
    };
  };

  const handleCopy = async () => {
    const text = mode === "visit" ? formatResultText() : `件名：${formatMailText().subject}\n\n本文：\n${formatMailText().body}`;
    try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const res = await fetch("/api/auth/verify", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({password})});
        if (res.ok) {
            setIsUnlocked(true);
            setPasswordError(false);
            localStorage.setItem("calendar_unlocked", "true");
        } else {
            setPasswordError(true);
            setPassword("");
        }
    } catch { setPasswordError(true); }
  };

  const handleSaveSettings = () => {
    if(confirm("設定を保存しますか？")) {
        localStorage.setItem("mailSubject", mailSubject);
        localStorage.setItem("mailBody", mailBody);
        localStorage.setItem("ignoreKeywords", ignoreKeywords);
        localStorage.setItem("dateFormat", dateFormat);
        localStorage.setItem("maxCandidates", maxCandidates === null ? "null" : String(maxCandidates));
        localStorage.setItem("showTodayAfternoon", String(showTodayAfternoon));
        localStorage.setItem("workStartHour", String(workStartHour));
        localStorage.setItem("workEndHour", String(workEndHour));
        localStorage.setItem("enableSplitSlots", String(enableSplitSlots));
        setShowSettings(false);
    }
  };

  const handleResetSettings = () => {
    if(confirm("デフォルトに戻しますか？")) {
        setMailSubject(DEFAULT_SUBJECT);
        setMailBody(DEFAULT_BODY);
        setIgnoreKeywords(DEFAULT_KEYWORDS);
        setDateFormat(DEFAULT_DATE_FORMAT);
        setMaxCandidates(null);
        setShowTodayAfternoon(false);
        setWorkStartHour(9);
        setWorkEndHour(18);
        setEnableSplitSlots(false);
    }
  };

  // --- Render ---
  if (!isUnlocked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ width: "100%", maxWidth: 400, padding: 20 }}>
          <BackToHome />
          <div style={{ marginTop: 20, background: "var(--card-bg)", padding: 32, borderRadius: 16, boxShadow: "0 4px 20px var(--shadow)", border: "1px solid var(--card-border)" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                <Lock size={24} />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "var(--foreground)" }}>空き時間検索くん</h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>パスワードを入力してください</p>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <input type="password" value={password} onChange={(e) => {setPassword(e.target.value); setPasswordError(false);}} placeholder="パスワード" style={{ width: "100%", padding: "12px", borderRadius: 8, border: passwordError ? "2px solid #ef4444" : "1px solid var(--card-border)", marginBottom: 16, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: 8, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", color: "white", border: "none", fontWeight: 600, cursor: "pointer" }}>ログイン</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Components
  const Sidebar = () => (
    <div style={{ width: isMobile ? "100%" : 300, flexShrink: 0, background: "var(--card-bg)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16, boxSizing: "border-box", maxHeight: isMobile ? "none" : "calc(100vh - 120px)", overflowY: "auto" }}>
      <div>
        <SectionHeader icon={<User style={{ width: 16, height: 16, color: "#f5576c" }} />} title="アカウント" />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setCalendarProvider("google")} style={{ flex: 1, padding: "8px", borderRadius: 6, background: calendarProvider === "google" ? "#f0fdf4" : "var(--background)", borderColor: calendarProvider === "google" ? "#86efac" : "var(--card-border)", border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, position: "relative" }}>
             Google {authenticatedProviders.google && <div style={{width: 6, height: 6, borderRadius: "50%", background: "#22c55e"}} />}
          </button>
          <button onClick={() => setCalendarProvider("microsoft")} style={{ flex: 1, padding: "8px", borderRadius: 6, background: calendarProvider === "microsoft" ? "#f0fdf4" : "var(--background)", borderColor: calendarProvider === "microsoft" ? "#86efac" : "var(--card-border)", border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, position: "relative" }}>
             Outlook {authenticatedProviders.microsoft && <div style={{width: 6, height: 6, borderRadius: "50%", background: "#22c55e"}} />}
          </button>
        </div>
        {!authenticatedProviders[calendarProvider] && (
            <button onClick={handleCalendarAuth} disabled={authLoading} style={{ width: "100%", marginTop: 8, padding: "8px", borderRadius: 6, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{authLoading ? <Loader2 className="animate-spin" size={16} /> : "連携する"}</button>
        )}
      </div>

      <div>
        <SectionHeader icon={<Monitor style={{ width: 16, height: 16, color: "#a855f7" }} />} title="モード" />
         <div style={{ display: "flex", background: "var(--background)", padding: 4, borderRadius: 8 }}>
            <button onClick={() => setMode("visit")} style={{ flex: 1, padding: "8px", borderRadius: 6, background: mode === "visit" ? "var(--foreground)" : "transparent", color: mode === "visit" ? "var(--background)" : "var(--text-secondary)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>訪問用</button>
            <button onClick={() => setMode("mail")} style={{ flex: 1, padding: "8px", borderRadius: 6, background: mode === "mail" ? "var(--foreground)" : "transparent", color: mode === "mail" ? "var(--background)" : "var(--text-secondary)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>メール作成</button>
         </div>
      </div>

      <div>
        <SectionHeader icon={<Calendar style={{ width: 16, height: 16, color: "#3b82f6" }} />} title="検索期間" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {periods.map(p => (
                <button key={p} onClick={() => handlePeriodClick(p)} disabled={loading} style={{ padding: "10px", borderRadius: 8, background: selectedPeriod === p ? "var(--foreground)" : "var(--background)", color: selectedPeriod === p ? "var(--background)" : "var(--foreground)", border: "1px solid var(--card-border)", cursor: "pointer", fontSize: 12, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
                    {periodLabels[p]}
                </button>
            ))}
        </div>
      </div>

      <div>
        <SectionHeader icon={<Clock style={{ width: 16, height: 16, color: "#f59e0b" }} />} title="所要時間" />
        <div style={{ display: "flex", gap: 8 }}>
            {durations.map(d => (
                <button key={d} onClick={() => setDurationMin(d)} disabled={!selectedPeriod} style={{ flex: 1, padding: "8px 0", borderRadius: 6, background: durationMin === d ? "var(--foreground)" : "var(--background)", color: durationMin === d ? "var(--background)" : "var(--foreground)", border: "1px solid var(--card-border)", cursor: "pointer", fontSize: 12, fontWeight: 600, opacity: !selectedPeriod ? 0.5 : 1 }}>
                    {d}分
                </button>
            ))}
        </div>
      </div>
      
      <button onClick={() => setShowSettings(true)} style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 8, border: "1px dashed var(--card-border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
        <Settings size={16} /> 詳細設定
      </button>
    </div>
  );

  const MainContent = () => (
    <div style={{ flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 24, minWidth: 0, maxHeight: isMobile ? "none" : "calc(100vh - 120px)", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: !result ? "center" : "flex-start", boxSizing: "border-box" }}>
       {!result ? (
         <div style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
            {loading ? (
                <>
                  <Loader2 size={48} className="animate-spin" style={{ margin: "0 auto 16px" }} />
                  <p>スケジュールを確認中...</p>
                </>
            ) : (
                <>
                  <Calendar size={64} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
                  <p style={{ fontSize: 16, fontWeight: 500 }}>期間を選択して検索を開始</p>
                </>
            )}
         </div>
       ) : (
         <div style={{ width: "100%", animation: "fadeIn 0.3s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{selectedPeriod && periodLabels[selectedPeriod]} の空き状況</h2>
                <button onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, background: copied ? "#10b981" : "var(--foreground)", color: "white", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>
                    {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "コピー完了" : "コピー"}
                </button>
            </div>

            {mode === "visit" ? (
                <div style={{ display: "grid", gap: 16 }}>
                    {getFilteredResult()?.map((day, i) => {
                       const parts = day.date.split("-");
                       return (
                           <div key={i} style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: 16 }}>
                               <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: day.isHoliday ? "#ef4444" : "var(--foreground)" }}>
                                   {parts[1]}/{parts[2]} ({day.weekday}) {day.isHoliday && <span style={{fontSize: 12, fontWeight: 400}}>祝日</span>}
                               </div>
                               {day.slots.length === 0 ? <span style={{fontSize: 13, color: "var(--text-tertiary)"}}>空きなし</span> : (
                                   <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                       {day.slots.sort((a,b) => a.start.localeCompare(b.start)).map((s, idx) => (
                                           <span key={idx} style={{ padding: "4px 10px", borderRadius: 4, background: "var(--background)", border: "1px solid var(--card-border)", fontSize: 13, color: "var(--foreground)" }}>
                                               {s.start} - {s.end}
                                           </span>
                                       ))}
                                   </div>
                               )}
                           </div>
                       )
                    })}
                </div>
            ) : (
                <div style={{ background: "var(--background)", borderRadius: 8, padding: 16, border: "1px solid var(--card-border)" }}>
                   <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{formatMailText().subject}</div>
                   <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                      {formatMailText().body}
                   </div>
                </div>
            )}
         </div>
       )}
    </div>
  );

  // Settings Modal
  const SettingsDisplay = () => (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--modal-overlay)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSettings(false)}>
        <div style={{ width: "100%", maxWidth: 500, background: "var(--card-bg)", borderRadius: 16, padding: 24, maxHeight: "90vh", overflowY: "auto", margin: 16 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>設定</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                   <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>件名テンプレート</label>
                   <input type="text" value={mailSubject} onChange={e => setMailSubject(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }} />
                </div>
                <div>
                   <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>本文テンプレート</label>
                   <textarea value={mailBody} onChange={e => setMailBody(e.target.value)} rows={6} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }} />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>開始時間</label>
                        <select value={workStartHour} onChange={e => setWorkStartHour(Number(e.target.value))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--background)", color: "var(--foreground)" }}>
                            {Array.from({length:24}, (_,i) => <option key={i} value={i}>{i}:00</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>終了時間</label>
                        <select value={workEndHour} onChange={e => setWorkEndHour(Number(e.target.value))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--background)", color: "var(--foreground)" }}>
                            {Array.from({length:24}, (_,i) => <option key={i} value={i}>{i}:00</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                   <button onClick={handleResetSettings} style={{ padding: "8px 16px", borderRadius: 8, color: "#ef4444", background: "transparent", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>リセット</button>
                   <button onClick={handleSaveSettings} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--foreground)", color: "var(--background)", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>保存</button>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: isMobile ? 0 : 16 }}>
      {showSettings && <SettingsDisplay />}

      {!isMobile ? (
         // PC Layout
         <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <BackToHome />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <Calendar size={20} />
                </div>
                <div>
                   <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>空き時間検索くん</h1>
                   <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>カレンダーから空き時間を自動抽出</p>
                </div>
            </div>
            
            <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
                <Sidebar />
                <MainContent />
            </div>
         </div>
      ) : (
         // Mobile Layout
         <div style={{ paddingBottom: 80 }}>
             <div style={{ padding: "12px 16px", background: "var(--card-bg)", borderBottom: "1px solid var(--card-border)", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <BackToHome />
                <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>空き時間検索くん</h1>
             </div>
             
             <div style={{ padding: 16 }}>
                 <div style={{ display: activeTab === "input" ? "block" : "none" }}><Sidebar /></div>
                 <div style={{ display: activeTab === "result" ? "block" : "none" }}><MainContent /></div>
             </div>
             
             <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--card-bg)", borderTop: "1px solid var(--card-border)", display: "flex", justifyContent: "space-around", padding: "12px 0", zIndex: 50, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
                <button onClick={() => setActiveTab("input")} style={{ background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: activeTab === "input" ? "#f5576c" : "var(--text-tertiary)", fontSize: 10, fontWeight: 600, cursor: "pointer", width: "50%" }}>
                    <Calendar size={20} /> 入力
                </button>
                <button onClick={() => setActiveTab("result")} style={{ background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: activeTab === "result" ? "#f5576c" : "var(--text-tertiary)", fontSize: 10, fontWeight: 600, cursor: "pointer", width: "50%" }}>
                    <Check size={20} /> 結果
                </button>
             </div>
         </div>
      )}
    </div>
  );
}
