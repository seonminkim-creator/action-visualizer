"use client";
import { useState } from "react";
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
  const [durationMin, setDurationMin] = useState<number>(60);

  const periods: Period[] = ["this_week", "next_week", "next_next_week", "next_month"];
  const durations = [15, 30, 45, 60];

  const handlePeriodClick = async (period: Period) => {
    setSelectedPeriod(period);
    setLoading(true);
    setResult(null);

    // モックデータを取得（実際はAPI呼び出し）
    setTimeout(() => {
      const mockData = getMockAvailability(period);
      setResult(mockData.days);
      setLoading(false);
    }, 500);
  };

  const formatResultText = (): string => {
    if (!result || !selectedPeriod) return "";

    const lines: string[] = [periodLabels[selectedPeriod]];

    result.forEach(day => {
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

  const formatMailText = (): { subject: string; body: string } => {
    if (!result || !selectedPeriod) return { subject: "", body: "" };

    const subject = `打合せ候補日のご提案（${periodLabels[selectedPeriod]}）`;

    const bodyLines: string[] = ["＜候補日＞"];

    result.forEach(day => {
      if (day.slots.length > 0) {
        const dateParts = day.date.split("-");
        const year = dateParts[0].slice(2); // "25"
        const formattedDate = `${year}/${dateParts[1]}/${dateParts[2]}（${day.weekday}）`;
        const timeSlots = day.slots.map(s => `${s.start}〜${s.end}`).join("／");
        bodyLines.push(`・${formattedDate} ${timeSlots}`);
      }
    });

    bodyLines.push("");
    bodyLines.push("※上記日程が難しい場合は、ご都合のよろしい候補をお知らせいただけますと幸いです。");
    bodyLines.push("");
    bodyLines.push("＜方法＞");
    bodyLines.push("対面 or オンライン");

    return { subject, body: bodyLines.join("\n") };
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
        @media (min-width: 768px) {
          .container { padding: 32px; }
        }
      `}</style>

      <div style={{ margin: "0 auto", maxWidth: 960 }}>
        <div style={{ marginBottom: 16 }}>
          <BackToHome />
        </div>

        {/* ヘッダー */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <h1 style={{
            fontSize: "clamp(14px, 4vw, 24px)",
            fontWeight: 600,
            margin: 0,
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            color: "white",
            padding: "6px 12px",
            borderRadius: 6,
            display: "inline-block"
          }}>
            空き時間みえーるくん 📅
          </h1>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
            {loading ? "空き時間を取得中です…" : "期間を選んで空き時間を可視化"}
          </p>
        </div>

        {/* モード切替 */}
        {!selectedPeriod && (
          <div style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            background: "white",
            padding: 4,
            borderRadius: 8,
            border: "1px solid #e5e7eb"
          }}>
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
        )}

        {/* 期間チップ（常に表示） */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
          marginBottom: 12
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
                style={{
                  padding: "12px 16px",
                  borderRadius: 6,
                  background: durationMin === duration ? "#0f172a" : "white",
                  border: `1px solid ${durationMin === duration ? "#0f172a" : "#e5e7eb"}`,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  color: durationMin === duration ? "white" : "#64748b",
                  transition: "all 0.2s"
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
              marginBottom: 16
            }}>
              <h2 style={{
                fontSize: 18,
                fontWeight: 600,
                margin: 0,
                color: "#0f172a"
              }}>
                {periodLabels[selectedPeriod]}
              </h2>
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

            {/* 訪問用表示 */}
            {mode === "visit" && (
              <div style={{
                background: "white",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                {result.map((day, idx) => {
                  const dateParts = day.date.split("-");
                  const formattedDate = `${dateParts[1]}/${dateParts[2]}(${day.weekday})`;

                  return (
                    <div key={idx} style={{ marginBottom: idx < result.length - 1 ? 20 : 0 }}>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#0f172a",
                        marginBottom: 10,
                        paddingBottom: 6,
                        borderBottom: "2px solid #f1f5f9"
                      }}>
                        {formattedDate}
                      </div>
                      {day.slots.length === 0 ? (
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
                                padding: "8px 14px",
                                background: "#f1f5f9",
                                borderRadius: 6,
                                fontSize: 14,
                                fontWeight: 500,
                                color: "#334155",
                                border: "1px solid #e2e8f0"
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

            {/* 戻りリンク */}
            <button
              onClick={handleBack}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                borderRadius: 8,
                background: "transparent",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                fontSize: 13,
                color: "#475569",
                width: "100%"
              }}
            >
              ← 期間を選び直す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
