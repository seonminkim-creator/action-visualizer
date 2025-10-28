"use client";
import { useState, useEffect } from "react";
import BackToHome from "../../components/BackToHome";
import { Copy, Calendar } from "lucide-react";
import { Period, Mode, DaySlots, Slot } from "../../types/calendar";
import { getMockAvailability, periodLabels } from "../../lib/mockData";

export default function CalendarFinder() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [mode, setMode] = useState<Mode>("visit");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DaySlots[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [calendarProvider, setCalendarProvider] = useState<"google" | "microsoft">("google"); // カレンダープロバイダー
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true); // 認証チェック中
  const [authenticatedProviders, setAuthenticatedProviders] = useState<{google: boolean, microsoft: boolean}>({google: false, microsoft: false}); // 各プロバイダーの認証状態
  const [showSettings, setShowSettings] = useState(false); // 設定モーダル
  const [mailSubject, setMailSubject] = useState("打合せ候補日のご提案（{期間}）");
  const [mailBody, setMailBody] = useState(`＜候補日＞
{候補日}

※上記日程が難しい場合は、ご都合のよろしい候補をお知らせいただけますと幸いです。

＜方法＞
対面 or オンライン`);
  const [ignoreKeywords, setIgnoreKeywords] = useState("空き,調整可能");
  const [dateFormat, setDateFormat] = useState("yy/mm/dd（曜日）"); // 日付フォーマット
  const [maxCandidates, setMaxCandidates] = useState<number | null>(null); // 最大候補数（nullは全部）
  const [showTodayAfternoon, setShowTodayAfternoon] = useState(false); // 午後以降も当日を表示するか
  const [workStartHour, setWorkStartHour] = useState(9); // 営業開始時間
  const [workEndHour, setWorkEndHour] = useState(18); // 営業終了時間
  const [enableSplitSlots, setEnableSplitSlots] = useState(false); // 空き時間を細分化するか

  // ページタイトルを設定
  useEffect(() => {
    document.title = "空き時間検索くん | 営業AIポータル";
  }, []);

  // デフォルト設定
  const DEFAULT_SUBJECT = "打合せ候補日のご提案（{期間}）";
  const DEFAULT_BODY = `＜候補日＞
{候補日}

※上記日程が難しい場合は、ご都合のよろしい候補をお知らせいただけますと幸いです。

＜方法＞
対面 or オンライン`;
  const DEFAULT_KEYWORDS = "空き,調整可能";
  const DEFAULT_DATE_FORMAT = "yy/mm/dd（曜日）";
  const DEFAULT_MAX_CANDIDATES = null; // デフォルトは全部
  const DEFAULT_SHOW_TODAY_AFTERNOON = false; // デフォルトで当日は非表示
  const DEFAULT_WORK_START_HOUR = 9; // デフォルト営業開始時間
  const DEFAULT_WORK_END_HOUR = 18; // デフォルト営業終了時間
  const DEFAULT_ENABLE_SPLIT_SLOTS = false; // デフォルトで細分化OFF

  const periods: Period[] = ["this_week", "next_week", "next_next_week", "next_month"];
  const durations = [15, 30, 45, 60];

  // 認証状態をチェック & 設定を読み込み
  useEffect(() => {
    // ローカルストレージから設定を読み込み
    const savedSubject = localStorage.getItem("mailSubject");
    const savedBody = localStorage.getItem("mailBody");
    const savedKeywords = localStorage.getItem("ignoreKeywords");
    const savedDateFormat = localStorage.getItem("dateFormat");
    const savedMaxCandidates = localStorage.getItem("maxCandidates");
    const savedShowTodayAfternoon = localStorage.getItem("showTodayAfternoon");
    const savedWorkStartHour = localStorage.getItem("workStartHour");
    const savedWorkEndHour = localStorage.getItem("workEndHour");
    const savedEnableSplitSlots = localStorage.getItem("enableSplitSlots");

    if (savedSubject) setMailSubject(savedSubject);
    if (savedBody) setMailBody(savedBody);
    if (savedKeywords) setIgnoreKeywords(savedKeywords);
    if (savedDateFormat) setDateFormat(savedDateFormat);
    if (savedMaxCandidates) setMaxCandidates(savedMaxCandidates === "null" ? null : Number(savedMaxCandidates));
    if (savedShowTodayAfternoon !== null) setShowTodayAfternoon(savedShowTodayAfternoon === "true");
    if (savedWorkStartHour) setWorkStartHour(Number(savedWorkStartHour));
    if (savedWorkEndHour) setWorkEndHour(Number(savedWorkEndHour));
    if (savedEnableSplitSlots !== null) setEnableSplitSlots(savedEnableSplitSlots === "true");

    const params = new URLSearchParams(window.location.search);
    if (params.get("authenticated") === "true") {
      setIsAuthenticated(true);
      setAuthChecking(false);

      // プロバイダー情報を取得してセット
      const provider = params.get("provider");
      if (provider === "microsoft" || provider === "google") {
        setCalendarProvider(provider);
        console.log(`✅ 認証完了: プロバイダー=${provider}`);
      }

      // URLをクリーンアップ
      window.history.replaceState({}, "", "/agents/calendar-finder");
      return;
    }

    // クッキーから認証状態を確認
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/calendar/check-auth");
        const data = await response.json();

        console.log("✅ 認証状態:", data);

        if (data.authenticated) {
          setIsAuthenticated(true);
          // 両方のプロバイダーの認証状態を保存
          if (data.providers) {
            setAuthenticatedProviders(data.providers);
            // デフォルトで認証済みのプロバイダーを選択
            if (data.provider) {
              setCalendarProvider(data.provider);
            }
          }
        }
      } catch (error) {
        console.log("認証チェックエラー:", error);
      } finally {
        setAuthChecking(false); // チェック完了
      }
    };

    checkAuthStatus();
  }, []);

  // カレンダー認証を開始
  const handleCalendarAuth = async () => {
    setAuthLoading(true);
    try {
      const endpoint = calendarProvider === "google" ? "/api/auth/google" : "/api/auth/microsoft";
      const response = await fetch(endpoint);
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("認証エラー:", error);
      setAuthLoading(false);
    }
  };

  const handlePeriodClick = async (period: Period) => {
    setSelectedPeriod(period);
    setLoading(true);
    setResult(null);

    try {
      // プロバイダーに応じたAPI呼び出し
      const endpoint = calendarProvider === "google"
        ? "/api/calendar/availability"
        : "/api/calendar/availability-microsoft";

      console.log(`📞 呼び出し: provider=${calendarProvider}, endpoint=${endpoint}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        // 認証が必要
        const data = await response.json();
        if (data.needsReauth) {
          setIsAuthenticated(false);
          const providerName = calendarProvider === "google" ? "Googleカレンダー" : "Outlookカレンダー";
          alert(`${providerName}へのアクセス権限が必要です。再度ログインしてください。`);
          await handleCalendarAuth();
        }
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }

      const data = await response.json();
      console.log(`✅ ${calendarProvider === "google" ? "Google" : "Outlook"}カレンダーからデータ取得成功:`, data);
      setResult(data.days);
    } catch (error) {
      console.error("カレンダー取得エラー:", error);
      alert(`カレンダーデータの取得に失敗しました。\nエラー: ${error}\n\nモックデータを表示します。`);
      // エラー時はモックデータを使用
      const mockData = getMockAvailability(period);
      setResult(mockData.days);
    } finally {
      setLoading(false);
    }
  };

  // 長い空き時間を所要時間単位で細分化する
  const splitLongSlots = (slots: Slot[], durationMin: number): Slot[] => {
    const splitSlots: Slot[] = [];

    slots.forEach(slot => {
      const [startHour, startMin] = slot.start.split(":").map(Number);
      const [endHour, endMin] = slot.end.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const totalDuration = endMinutes - startMinutes;

      // 所要時間より長い枠を細分化
      if (totalDuration > durationMin) {
        let currentStart = startMinutes;
        while (currentStart + durationMin <= endMinutes) {
          const currentEnd = currentStart + durationMin;
          splitSlots.push({
            start: `${String(Math.floor(currentStart / 60)).padStart(2, "0")}:${String(currentStart % 60).padStart(2, "0")}`,
            end: `${String(Math.floor(currentEnd / 60)).padStart(2, "0")}:${String(currentEnd % 60).padStart(2, "0")}`,
          });
          currentStart = currentEnd;
        }
      } else if (totalDuration === durationMin) {
        // ちょうど所要時間の枠はそのまま
        splitSlots.push(slot);
      }
    });

    return splitSlots;
  };

  // 所要時間でフィルタリングした結果を取得
  const getFilteredResult = (): DaySlots[] | null => {
    if (!result || !durationMin) return result;

    // 現在時刻（JST）を取得
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = nowJST.toISOString().split("T")[0];
    const currentHour = nowJST.getUTCHours();

    return result
      .map(day => {
        // 設定により、当日の午後を表示しない場合の処理
        if (!showTodayAfternoon && day.date === todayStr) {
          // 午前中なら午前の枠のみ表示、午後以降なら当日全体をスキップ
          if (currentHour >= 12) {
            return null; // 午後以降は当日全体をスキップ
          } else {
            // 午前中は午前の枠のみ表示（午後の枠を除外）
            const morningSlots = day.slots.filter(slot => {
              const hour = parseInt(slot.start.split(":")[0]);
              return hour < 12;
            });
            if (morningSlots.length === 0) {
              return null; // 午前に枠がなければスキップ
            }
            // 午前の枠のみで処理を続ける
            day = { ...day, slots: morningSlots };
          }
        }

        // 各日の枠を所要時間以上のものだけにフィルタ
        const filteredSlots = day.slots.filter(slot => {
          const [startHour, startMin] = slot.start.split(":").map(Number);
          const [endHour, endMin] = slot.end.split(":").map(Number);
          const durationInMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
          return durationInMinutes >= durationMin;
        });

        // 設定により、長い枠を細分化するかどうか
        const finalSlots = enableSplitSlots
          ? splitLongSlots(filteredSlots, durationMin)
          : filteredSlots;

        return {
          ...day,
          slots: finalSlots
        };
      })
      .filter((day): day is DaySlots => day !== null); // nullを除外
  };

  const formatResultText = (): string => {
    if (!result || !selectedPeriod) return "";

    const lines: string[] = [periodLabels[selectedPeriod]];
    const filteredResult = getFilteredResult();
    if (!filteredResult) return "";

    filteredResult.forEach(day => {
      const dateParts = day.date.split("-");
      const formattedDate = `${dateParts[1]}/${dateParts[2]}(${day.weekday})`;
      lines.push(formattedDate);

      if (day.slots.length === 0) {
        lines.push("（空きなし）");
      } else {
        // 時系列順にソート
        const sortedSlots = [...day.slots].sort((a, b) => {
          const aTime = a.start.split(":").map(Number);
          const bTime = b.start.split(":").map(Number);
          const aMinutes = aTime[0] * 60 + aTime[1];
          const bMinutes = bTime[0] * 60 + bTime[1];
          return aMinutes - bMinutes;
        });

        // 終日空き（1つの枠で営業時間全体が空いている）の場合のみ午前・午後で分割
        if (sortedSlots.length === 1) {
          const slot = sortedSlots[0];
          const [startHour] = slot.start.split(":").map(Number);
          const [endHour] = slot.end.split(":").map(Number);

          // 営業開始時刻から始まり、営業終了時刻まで続く枠の場合
          if (startHour <= workStartHour && endHour >= workEndHour - 1) {
            // 午前と午後に分割（12:00-13:00は昼休みと仮定）
            lines.push(`【午前】${String(workStartHour).padStart(2, "0")}:00〜12:00`);
            lines.push(`【午後】13:00〜${String(workEndHour).padStart(2, "0")}:00`);
          } else {
            // 終日空きではない場合は通常表示
            const timeSlots = sortedSlots.map(slot => `${slot.start}〜${slot.end}`).join("／");
            lines.push(timeSlots);
          }
        } else {
          // 複数の枠がある場合は通常表示
          const timeSlots = sortedSlots.map(slot => `${slot.start}〜${slot.end}`).join("／");
          lines.push(timeSlots);
        }
      }
    });

    return lines.join("\n");
  };

  const formatDate = (dateStr: string, weekday: string): string => {
    const dateParts = dateStr.split("-");
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];

    // 日付フォーマットに応じて変換
    switch (dateFormat) {
      case "yyyy/mm/dd（曜日）":
        return `${year}/${month}/${day}（${weekday}）`;
      case "yy/mm/dd（曜日）":
        return `${year.slice(2)}/${month}/${day}（${weekday}）`;
      case "mm/dd（曜日）":
        return `${month}/${day}（${weekday}）`;
      case "yyyy/mm/dd":
        return `${year}/${month}/${day}`;
      case "yy/mm/dd":
        return `${year.slice(2)}/${month}/${day}`;
      case "mm/dd":
        return `${month}/${day}`;
      default:
        return `${year.slice(2)}/${month}/${day}（${weekday}）`;
    }
  };

  const formatMailText = (): { subject: string; body: string } => {
    if (!result || !selectedPeriod) return { subject: "", body: "" };

    const filteredResult = getFilteredResult();
    if (!filteredResult) return { subject: "", body: "" };

    // 候補日を生成（祝日は除外、余裕がある時間枠を優先）
    const candidateLines: string[] = [];

    // 時間枠の長さを計算する関数（分単位）
    const getSlotDuration = (start: string, end: string): number => {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      return (endHour * 60 + endMin) - (startHour * 60 + startMin);
    };

    filteredResult.forEach(day => {
      if (day.slots.length > 0 && !day.isHoliday) {
        const formattedDate = formatDate(day.date, day.weekday);

        // 時系列順にソート
        const sortedSlots = [...day.slots].sort((a, b) => {
          const aTime = a.start.split(":").map(Number);
          const bTime = b.start.split(":").map(Number);
          const aMinutes = aTime[0] * 60 + aTime[1];
          const bMinutes = bTime[0] * 60 + bTime[1];
          return aMinutes - bMinutes; // 昇順（早い順）
        });

        // 最大候補数に応じて時間枠を制限（時系列で先頭から選択）
        const limitedSlots = maxCandidates ? sortedSlots.slice(0, maxCandidates) : sortedSlots;
        const timeSlots = limitedSlots.map(s => `${s.start}〜${s.end}`).join("／");
        candidateLines.push(`・${formattedDate} ${timeSlots}`);
      }
    });

    // テンプレートを置換
    const subject = mailSubject.replace("{期間}", periodLabels[selectedPeriod]);
    const body = mailBody.replace("{候補日}", candidateLines.join("\n"));

    return { subject, body };
  };

  const handleCopy = async () => {
    const text = mode === "visit" ? formatResultText() : `件名：${formatMailText().subject}\n\n本文：\n${formatMailText().body}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("コピーに失敗しました", err);
    }
  };

  const handleBack = () => {
    setSelectedPeriod(null);
    setResult(null);
  };

  const handleSaveSettings = () => {
    if (window.confirm("設定を保存しますか？")) {
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
      alert("設定を保存しました");
    }
  };

  const handleResetSettings = () => {
    if (window.confirm("デフォルト設定に戻しますか？\n現在の設定は失われます。")) {
      setMailSubject(DEFAULT_SUBJECT);
      setMailBody(DEFAULT_BODY);
      setIgnoreKeywords(DEFAULT_KEYWORDS);
      setDateFormat(DEFAULT_DATE_FORMAT);
      setMaxCandidates(DEFAULT_MAX_CANDIDATES);
      setShowTodayAfternoon(DEFAULT_SHOW_TODAY_AFTERNOON);
      setWorkStartHour(DEFAULT_WORK_START_HOUR);
      setWorkEndHour(DEFAULT_WORK_END_HOUR);
      setEnableSplitSlots(DEFAULT_ENABLE_SPLIT_SLOTS);
      alert("デフォルト設定に戻しました");
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .result-view {
          animation: fadeIn 0.3s ease-out;
        }
        .period-chip {
          transition: all 0.2s;
        }
        .period-chip:hover {
          transform: translateY(-2px);
        }
        .mode-toggle {
          display: flex;
        }
        @media (min-width: 768px) {
          .container { padding: 32px; }
        }
      `}</style>

      <div style={{ margin: "0 auto", maxWidth: 960 }}>
        <div style={{ marginBottom: 16 }}>
          <BackToHome />
        </div>

        {/* ヘッダー */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            flexWrap: "wrap",
            gap: 8
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <Calendar size={24} />
              </div>
              <h1
                style={{
                  fontSize: "clamp(18px, 4vw, 24px)",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                空き時間検索くん
              </h1>
            </div>
            {isAuthenticated && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#22c55e"
                }} />
                <span style={{
                  fontSize: 12,
                  color: "#22c55e",
                  fontWeight: 500
                }}>
                  {calendarProvider === "google" ? "Google" : "Outlook"}連携中
                </span>
                <button
                  onClick={async () => {
                    const providerName = calendarProvider === "google" ? "Google" : "Outlook";
                    if (window.confirm(`${providerName}カレンダーとの連携を解除しますか？\n再度連携が必要になります。`)) {
                      try {
                        // サーバー側でクッキーを削除
                        const response = await fetch("/api/auth/disconnect", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            provider: calendarProvider,
                          }),
                        });

                        if (!response.ok) {
                          throw new Error("連携解除に失敗しました");
                        }

                        console.log(`✅ ${providerName}カレンダーとの連携を解除しました`);

                        // 該当プロバイダーの認証状態を更新
                        const newAuthProviders = { ...authenticatedProviders };
                        newAuthProviders[calendarProvider] = false;
                        setAuthenticatedProviders(newAuthProviders);

                        // 両方とも未認証になった場合のみ isAuthenticated を false に
                        if (!newAuthProviders.google && !newAuthProviders.microsoft) {
                          setIsAuthenticated(false);
                        }

                        setResult(null);
                        setSelectedPeriod(null);
                        setDurationMin(null);
                        window.location.reload();
                      } catch (error) {
                        console.error("連携解除エラー:", error);
                        alert(`連携解除に失敗しました\nエラー: ${error}`);
                      }
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "1px solid var(--card-border)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--card-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  連携解除
                </button>
              </div>
            )}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, paddingLeft: 60 }}>
            {loading ? "空き時間を取得中です…" : "空き時間をすぐ可視化"}
          </p>
        </div>

        {/* カレンダープロバイダー選択 - 未認証の場合のみ表示 */}
        {!authChecking && !isAuthenticated && (
          <div style={{
            background: "var(--card-bg)",
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--card-border)",
            marginBottom: 16
          }}>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
              カレンダーと連携して、実際の空き時間を表示します
            </p>

            {/* プロバイダー選択 */}
            <div style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              background: "var(--background)",
              padding: 4,
              borderRadius: 8,
            }}>
              <button
                onClick={() => setCalendarProvider("google")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: calendarProvider === "google" ? "var(--card-bg)" : "transparent",
                  color: calendarProvider === "google" ? "var(--foreground)" : "var(--text-secondary)",
                  border: calendarProvider === "google" ? "1px solid var(--card-border)" : "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow: calendarProvider === "google" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  position: "relative",
                }}
              >
                Google
                {authenticatedProviders.google && (
                  <span style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22c55e",
                  }} />
                )}
              </button>
              <button
                onClick={() => setCalendarProvider("microsoft")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: calendarProvider === "microsoft" ? "var(--card-bg)" : "transparent",
                  color: calendarProvider === "microsoft" ? "var(--foreground)" : "var(--text-secondary)",
                  border: calendarProvider === "microsoft" ? "1px solid var(--card-border)" : "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow: calendarProvider === "microsoft" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  position: "relative",
                }}
              >
                Outlook
                {authenticatedProviders.microsoft && (
                  <span style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22c55e",
                  }} />
                )}
              </button>
            </div>

            {/* 認証ボタン - 選択されたプロバイダーが未認証の場合のみ表示 */}
            {!authenticatedProviders[calendarProvider] && (
              <button
                onClick={handleCalendarAuth}
                disabled={authLoading}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: 8,
                  background: authLoading ? "var(--text-tertiary)" : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  color: "var(--card-bg)",
                  border: "none",
                  cursor: authLoading ? "not-allowed" : "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
              >
                {authLoading
                  ? "認証中..."
                  : calendarProvider === "google"
                  ? "Googleカレンダーと連携"
                  : "Outlookカレンダーと連携"}
              </button>
            )}

            {/* 認証済みメッセージ */}
            {authenticatedProviders[calendarProvider] && (
              <div style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 8,
                background: "#f0fdf4",
                border: "1px solid #86efac",
                color: "#166534",
                fontSize: 14,
                fontWeight: 500,
                textAlign: "center"
              }}>
                {calendarProvider === "google" ? "Google" : "Outlook"}カレンダーと連携済み ✓
              </div>
            )}
          </div>
        )}

        {/* モード切替 - 常に表示（モバイル含む） */}
        <div
          className="mode-toggle"
          style={{
            gap: 8,
            marginBottom: 16,
            background: "var(--card-bg)",
            padding: 4,
            borderRadius: 8,
            border: "1px solid var(--card-border)"
          }}
        >
          <button
            onClick={() => setMode("visit")}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: mode === "visit" ? "var(--foreground)" : "transparent",
              color: mode === "visit" ? "var(--card-bg)" : "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 0.2s"
            }}
          >
            訪問用
          </button>
          <button
            onClick={() => setMode("mail")}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: mode === "mail" ? "var(--foreground)" : "transparent",
              color: mode === "mail" ? "var(--card-bg)" : "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 0.2s"
            }}
          >
            メール候補
          </button>
        </div>

        {/* 細分化ON/OFFトグル */}
        {isAuthenticated && (
          <div style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--card-bg)",
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--card-border)"
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>
                空き時間を細分化
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {enableSplitSlots ? "30分刻みで表示中" : "まとめて表示中"}
              </div>
            </div>
            <button
              onClick={() => {
                const newValue = !enableSplitSlots;
                setEnableSplitSlots(newValue);
                localStorage.setItem("enableSplitSlots", String(newValue));
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                background: enableSplitSlots ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" : "var(--card-border)",
                color: enableSplitSlots ? "var(--card-bg)" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              {enableSplitSlots ? "ON" : "OFF"}
            </button>
          </div>
        )}

        {/* 期間選択 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 8
          }}>
            期間
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12
          }}>
          {periods.map(period => (
            <button
              key={period}
              onClick={() => handlePeriodClick(period)}
              className="period-chip"
              disabled={loading}
              style={{
                padding: "16px 20px",
                borderRadius: 8,
                background: selectedPeriod === period ? "var(--foreground)" : "var(--card-border)",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15,
                fontWeight: 600,
                color: selectedPeriod === period ? "var(--card-bg)" : "var(--text-secondary)",
                whiteSpace: "nowrap",
                boxShadow: selectedPeriod === period ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                opacity: loading ? 0.6 : 1
              }}
            >
              {periodLabels[period]}
            </button>
          ))}
          </div>
        </div>

        {/* 所要時間選択 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 8
          }}>
            所要時間
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
            gap: 8
          }}>
            {durations.map(duration => (
              <button
                key={duration}
                onClick={() => setDurationMin(duration)}
                disabled={!selectedPeriod}
                style={{
                  padding: "12px 16px",
                  borderRadius: 6,
                  background: !selectedPeriod ? "var(--card-border)" : (durationMin === duration ? "var(--foreground)" : "var(--card-bg)"),
                  border: `1px solid ${!selectedPeriod ? "var(--card-border)" : (durationMin === duration ? "var(--foreground)" : "var(--card-border)")}`,
                  cursor: !selectedPeriod ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  color: !selectedPeriod ? "var(--text-tertiary)" : (durationMin === duration ? "var(--card-bg)" : "var(--text-secondary)"),
                  transition: "all 0.2s",
                  opacity: !selectedPeriod ? 0.6 : 1
                }}
              >
                {duration}分
              </button>
            ))}
          </div>
        </div>

        {/* ローディング */}
        {loading && (
          <div style={{ marginTop: 24 }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: 60,
                  background: "var(--card-border)",
                  borderRadius: 8,
                  marginBottom: 12,
                  animation: "pulse 1.5s ease-in-out infinite"
                }}
              />
            ))}
          </div>
        )}

        {/* 結果ビュー */}
        {result && selectedPeriod && !loading && (
          <div className="result-view" style={{ marginTop: 24 }}>
            {/* 結果ヘッダー */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              gap: 12
            }}>
              <h2 style={{
                fontSize: 18,
                fontWeight: 600,
                margin: 0,
                color: "var(--foreground)"
              }}>
                {periodLabels[selectedPeriod]}
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* 訪問モードとメールモード両方でカスタマイズボタンを表示 */}
                <button
                  onClick={() => setShowSettings(true)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--card-bg)",
                    transition: "all 0.2s"
                  }}
                >
                  カスタマイズ
                </button>
                <button
                  onClick={handleBack}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "var(--foreground)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--card-bg)",
                    transition: "all 0.2s"
                  }}
                >
                  リセット
                </button>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: copied ? "#10b981" : "var(--foreground)",
                    color: "var(--card-bg)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s"
                  }}
                >
                  <Copy size={14} />
                  {copied ? "コピー完了!" : "コピー"}
                </button>
              </div>
            </div>

            {/* 訪問用表示 */}
            {mode === "visit" && (
              <div style={{
                background: "var(--card-bg)",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                {getFilteredResult()?.map((day, idx) => {
                  const dateParts = day.date.split("-");
                  const formattedDate = `${dateParts[1]}/${dateParts[2]}(${day.weekday})`;
                  const filteredResult = getFilteredResult();

                  return (
                    <div key={idx} style={{ marginBottom: idx < (filteredResult?.length || 0) - 1 ? 20 : 0 }}>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: day.isHoliday ? "#ef4444" : "var(--foreground)",
                        marginBottom: 10,
                        paddingBottom: 6,
                        borderBottom: "2px solid var(--card-border)"
                      }}>
                        {formattedDate} {day.isHoliday && "祝日"}
                      </div>
                      {day.isHoliday ? (
                        <div style={{
                          fontSize: 14,
                          color: "#ef4444",
                          textAlign: "center",
                          padding: "12px 0",
                          fontStyle: "italic"
                        }}>
                          祝日
                        </div>
                      ) : day.slots.length === 0 ? (
                        <div style={{
                          fontSize: 14,
                          color: "var(--text-tertiary)",
                          textAlign: "center",
                          padding: "12px 0",
                          fontStyle: "italic"
                        }}>
                          空きなし
                        </div>
                      ) : (() => {
                        // 時系列順にソート
                        const sortedSlots = [...day.slots].sort((a, b) => {
                          const aTime = a.start.split(":").map(Number);
                          const bTime = b.start.split(":").map(Number);
                          const aMinutes = aTime[0] * 60 + aTime[1];
                          const bMinutes = bTime[0] * 60 + bTime[1];
                          return aMinutes - bMinutes;
                        });

                        return (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {sortedSlots.map((slot, sidx) => (
                              <div
                                key={sidx}
                                style={{
                                  padding: "10px 14px",
                                  background: "var(--card-border)",
                                  borderRadius: 6,
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: "var(--text-secondary)",
                                  border: "1px solid var(--card-border)",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {slot.start}〜{slot.end}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* メール候補表示 */}
            {mode === "mail" && (
              <div style={{
                background: "var(--card-bg)",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 4
                  }}>
                    件名
                  </div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--foreground)"
                  }}>
                    {formatMailText().subject}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 4
                  }}>
                    本文
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7
                  }}>
                    {formatMailText().body}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 設定モーダル */}
        {showSettings && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setShowSettings(false)}
          >
            <div style={{
              background: "var(--card-bg)",
              borderRadius: 12,
              padding: 24,
              maxWidth: 600,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: "var(--foreground)" }}>
                {mode === "mail" ? "メール設定" : "表示設定"}
              </h2>

              {mode === "mail" && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--foreground)" }}>
                      件名テンプレート
                    </label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="打合せ候補日のご提案（{期間}）"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    fontSize: 14,
                    background: "var(--background)",
                    color: "var(--foreground)"
                  }}
                />
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  {"{期間}"} と入力すると期間名に置換されます
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--foreground)" }}>
                  本文テンプレート
                </label>
                <textarea
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  placeholder="＜候補日＞\n{候補日}\n\n※上記日程が難しい場合は..."
                  rows={10}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "vertical",
                    background: "var(--background)",
                    color: "var(--foreground)"
                  }}
                />
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  {"{候補日}"} と入力すると候補日リストに置換されます
                </p>
              </div>
                </>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--foreground)" }}>
                  日付フォーマット
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    fontSize: 14,
                    background: "var(--background)",
                    color: "var(--foreground)"
                  }}
                >
                  <option value="yy/mm/dd（曜日）">25/10/27（月）</option>
                  <option value="yyyy/mm/dd（曜日）">2025/10/27（月）</option>
                  <option value="mm/dd（曜日）">10/27（月）</option>
                  <option value="yy/mm/dd">25/10/27</option>
                  <option value="yyyy/mm/dd">2025/10/27</option>
                  <option value="mm/dd">10/27</option>
                </select>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  {mode === "mail" ? "メール本文の日付表示形式を選択できます" : "日付の表示形式を選択できます"}
                </p>
              </div>

              {mode === "mail" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--foreground)" }}>
                    無視するキーワード（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={ignoreKeywords}
                  onChange={(e) => setIgnoreKeywords(e.target.value)}
                  placeholder="空き,調整可能,仮"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    fontSize: 14,
                    background: "var(--background)",
                    color: "var(--foreground)"
                  }}
                />
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  これらのキーワードを含む予定は空き時間として扱われます
                </p>
              </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--foreground)" }}>
                  {mode === "mail" ? "メール本文に表示する候補数" : "表示する候補数"}
                </label>
                <select
                  value={maxCandidates === null ? "all" : String(maxCandidates)}
                  onChange={(e) => setMaxCandidates(e.target.value === "all" ? null : Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    fontSize: 14,
                    background: "var(--background)",
                    color: "var(--foreground)"
                  }}
                >
                  <option value="1">1つまで</option>
                  <option value="2">2つまで</option>
                  <option value="3">3つまで</option>
                  <option value="all">全部</option>
                </select>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  {mode === "mail" ? "メールに含める候補日の最大数を制限できます" : "画面に表示する候補日の最大数を制限できます"}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", color: "var(--foreground)" }}>
                  <input
                    type="checkbox"
                    checked={showTodayAfternoon}
                    onChange={(e) => setShowTodayAfternoon(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  午後以降も当日の予定を表示する
                </label>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, marginLeft: 26 }}>
                  オフにすると、12時以降は当日の候補を表示しません
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--foreground)" }}>
                  営業時間
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <select
                    value={workStartHour}
                    onChange={(e) => setWorkStartHour(Number(e.target.value))}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--card-border)",
                      fontSize: 14,
                      background: "var(--background)",
                      color: "var(--foreground)"
                    }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                  <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>〜</span>
                  <select
                    value={workEndHour}
                    onChange={(e) => setWorkEndHour(Number(e.target.value))}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--card-border)",
                      fontSize: 14,
                      background: "var(--background)",
                      color: "var(--foreground)"
                    }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  空き時間として表示する時間帯を設定できます
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setShowSettings(false)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: 6,
                      background: "transparent",
                      border: "1px solid var(--card-border)",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--foreground)"
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: 6,
                      background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                      color: "var(--card-bg)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500
                    }}
                  >
                    保存
                  </button>
                </div>
                <button
                  onClick={handleResetSettings}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  デフォルトに戻す
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
