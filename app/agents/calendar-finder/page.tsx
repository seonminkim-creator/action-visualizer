"use client";
import { useState, useEffect } from "react";
import BackToHome from "../../components/BackToHome";
import { Copy } from "lucide-react";
import { Period, Mode, DaySlots } from "../../types/calendar";
import { getMockAvailability, periodLabels } from "../../lib/mockData";

export default function CalendarFinder() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [mode, setMode] = useState<Mode>("visit");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DaySlots[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true); // 認証チェック中
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

    if (savedSubject) setMailSubject(savedSubject);
    if (savedBody) setMailBody(savedBody);
    if (savedKeywords) setIgnoreKeywords(savedKeywords);
    if (savedDateFormat) setDateFormat(savedDateFormat);
    if (savedMaxCandidates) setMaxCandidates(savedMaxCandidates === "null" ? null : Number(savedMaxCandidates));

    const params = new URLSearchParams(window.location.search);
    if (params.get("authenticated") === "true") {
      setIsAuthenticated(true);
      setAuthChecking(false);
      // URLをクリーンアップ
      window.history.replaceState({}, "", "/agents/calendar-finder");
      return;
    }

    // クッキーから認証状態を確認
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/calendar/check-auth");
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.log("認証チェックエラー:", error);
      } finally {
        setAuthChecking(false); // チェック完了
      }
    };

    checkAuthStatus();
  }, []);

  // Google認証を開始
  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    try {
      const response = await fetch("/api/auth/google");
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
      // 実際のAPI呼び出し
      const response = await fetch("/api/calendar/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period,
          durationMin,
          ignoreKeywords: ignoreKeywords.split(",").map(k => k.trim()).filter(k => k),
        }),
      });

      if (response.status === 401) {
        // 認証が必要
        const data = await response.json();
        if (data.needsReauth) {
          setIsAuthenticated(false);
          alert("カレンダーへのアクセス権限が必要です。再度ログインしてください。");
          await handleGoogleAuth();
        }
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }

      const data = await response.json();
      setResult(data.days);
    } catch (error) {
      console.error("カレンダー取得エラー:", error);
      // エラー時はモックデータを使用
      const mockData = getMockAvailability(period);
      setResult(mockData.days);
    } finally {
      setLoading(false);
    }
  };

  // 所要時間でフィルタリングした結果を取得
  const getFilteredResult = (): DaySlots[] | null => {
    if (!result || !durationMin) return result;

    return result.map(day => {
      // 各日の枠を所要時間以上のものだけにフィルタ
      const filteredSlots = day.slots.filter(slot => {
        const [startHour, startMin] = slot.start.split(":").map(Number);
        const [endHour, endMin] = slot.end.split(":").map(Number);
        const durationInMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        return durationInMinutes >= durationMin;
      });

      return {
        ...day,
        slots: filteredSlots
      };
    });
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
        day.slots.forEach(slot => {
          lines.push(`・${slot.start}〜${slot.end}`);
        });
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

        // 時間枠を長さでソート（長い＝余裕がある時間を優先）
        const sortedSlots = [...day.slots].sort((a, b) => {
          const durationA = getSlotDuration(a.start, a.end);
          const durationB = getSlotDuration(b.start, b.end);
          return durationB - durationA; // 降順（長い順）
        });

        // 最大候補数に応じて時間枠を制限（余裕がある順に選択）
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
      alert("デフォルト設定に戻しました");
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "#f8fafc" }}>
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
            <h1 style={{
              fontSize: "clamp(14px, 4vw, 24px)",
              fontWeight: 600,
              margin: 0,
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
              padding: "6px 12px",
              borderRadius: 6,
              display: "inline-block",
              width: "fit-content"
            }}>
              空き時間検索くん 📅
            </h1>
            {isAuthenticated && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#22c55e"
                }} />
                <button
                  onClick={async () => {
                    if (window.confirm("Googleカレンダーとの連携を解除しますか？\n再度連携が必要になります。")) {
                      try {
                        await fetch("/api/auth/logout", { method: "POST" });
                        setIsAuthenticated(false);
                        setResult(null);
                        setSelectedPeriod(null);
                        setDurationMin(null);
                        window.location.reload();
                      } catch (error) {
                        console.error("連携解除エラー:", error);
                        alert("連携解除に失敗しました");
                      }
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "1px solid #e5e7eb",
                    color: "#64748b",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
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
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
            {loading ? "空き時間を取得中です…" : "期間を選んで空き時間を可視化"}
          </p>
        </div>

        {/* Google認証ボタン - 認証チェック完了後のみ表示 */}
        {!authChecking && !isAuthenticated && (
          <div style={{
            background: "white",
            padding: 16,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            marginBottom: 16
          }}>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>
              Googleカレンダーと連携して、実際の空き時間を表示します
            </p>
            <button
              onClick={handleGoogleAuth}
              disabled={authLoading}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 8,
                background: authLoading ? "#94a3b8" : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                border: "none",
                cursor: authLoading ? "not-allowed" : "pointer",
                fontSize: 15,
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              {authLoading ? "認証中..." : "Googleカレンダーと連携"}
            </button>
          </div>
        )}

        {/* モード切替 - 常に表示（モバイル含む） */}
        <div
          className="mode-toggle"
          style={{
            gap: 8,
            marginBottom: 16,
            background: "white",
            padding: 4,
            borderRadius: 8,
            border: "1px solid #e5e7eb"
          }}
        >
          <button
            onClick={() => setMode("visit")}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: mode === "visit" ? "#0f172a" : "transparent",
              color: mode === "visit" ? "white" : "#64748b",
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
              background: mode === "mail" ? "#0f172a" : "transparent",
              color: mode === "mail" ? "white" : "#64748b",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 0.2s"
            }}
          >
            メール候補
          </button>
        </div>

        {/* 期間選択 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#475569",
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
                background: selectedPeriod === period ? "#0f172a" : "#e5e7eb",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15,
                fontWeight: 600,
                color: selectedPeriod === period ? "white" : "#64748b",
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
            color: "#475569",
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
                  background: !selectedPeriod ? "#e5e7eb" : (durationMin === duration ? "#0f172a" : "white"),
                  border: `1px solid ${!selectedPeriod ? "#e5e7eb" : (durationMin === duration ? "#0f172a" : "#e5e7eb")}`,
                  cursor: !selectedPeriod ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  color: !selectedPeriod ? "#94a3b8" : (durationMin === duration ? "white" : "#64748b"),
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
                  background: "#f1f5f9",
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
                color: "#0f172a"
              }}>
                {periodLabels[selectedPeriod]}
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {mode === "mail" && (
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
                      color: "white",
                      transition: "all 0.2s"
                    }}
                  >
                    カスタマイズ
                  </button>
                )}
                <button
                  onClick={handleBack}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "#0f172a",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "white",
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
                    background: copied ? "#10b981" : "#0f172a",
                    color: "white",
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
                background: "white",
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
                        color: day.isHoliday ? "#ef4444" : "#0f172a",
                        marginBottom: 10,
                        paddingBottom: 6,
                        borderBottom: "2px solid #f1f5f9"
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
                          color: "#94a3b8",
                          textAlign: "center",
                          padding: "12px 0",
                          fontStyle: "italic"
                        }}>
                          空きなし
                        </div>
                      ) : (
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8
                        }}>
                          {day.slots.map((slot, sidx) => (
                            <div
                              key={sidx}
                              style={{
                                padding: "10px 14px",
                                background: "#f1f5f9",
                                borderRadius: 6,
                                fontSize: 14,
                                fontWeight: 500,
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {slot.start}〜{slot.end}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* メール候補表示 */}
            {mode === "mail" && (
              <div style={{
                background: "white",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 4
                  }}>
                    件名
                  </div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0f172a"
                  }}>
                    {formatMailText().subject}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 4
                  }}>
                    本文
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: "#475569",
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
              background: "white",
              borderRadius: 12,
              padding: 24,
              maxWidth: 600,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
                メール設定
              </h2>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
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
                    border: "1px solid #e5e7eb",
                    fontSize: 14
                  }}
                />
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {"{期間}"} と入力すると期間名に置換されます
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
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
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {"{候補日}"} と入力すると候補日リストに置換されます
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                  日付フォーマット
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                    background: "white"
                  }}
                >
                  <option value="yy/mm/dd（曜日）">25/10/27（月）</option>
                  <option value="yyyy/mm/dd（曜日）">2025/10/27（月）</option>
                  <option value="mm/dd（曜日）">10/27（月）</option>
                  <option value="yy/mm/dd">25/10/27</option>
                  <option value="yyyy/mm/dd">2025/10/27</option>
                  <option value="mm/dd">10/27</option>
                </select>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  メール本文の日付表示形式を選択できます
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
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
                    border: "1px solid #e5e7eb",
                    fontSize: 14
                  }}
                />
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  これらのキーワードを含む予定は空き時間として扱われます
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                  メール本文に表示する候補数
                </label>
                <select
                  value={maxCandidates === null ? "all" : String(maxCandidates)}
                  onChange={(e) => setMaxCandidates(e.target.value === "all" ? null : Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                    background: "white"
                  }}
                >
                  <option value="1">1つまで</option>
                  <option value="2">2つまで</option>
                  <option value="3">3つまで</option>
                  <option value="all">全部</option>
                </select>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  メールに含める候補日の最大数を制限できます
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
                      border: "1px solid #e5e7eb",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500
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
                      color: "white",
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
