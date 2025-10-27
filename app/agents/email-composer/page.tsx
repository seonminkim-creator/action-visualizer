"use client";
import React, { useState, useEffect } from "react";
import { Loader2, Mail, Copy, Check, RotateCcw, Settings, Brain, Trash2 } from "lucide-react";
import BackToHome from "../../components/BackToHome";

type TaskType = "reply" | "compose" | "revise";
type Tab = "composer" | "settings";

export default function EmailComposer() {
  const [activeTab, setActiveTab] = useState<Tab>("composer");
  const [taskType, setTaskType] = useState<TaskType>("reply");
  const [inputText, setInputText] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // 文体学習機能
  const [styleProfile, setStyleProfile] = useState<string | null>(null);
  const [sampleEmails, setSampleEmails] = useState<string[]>(["", "", ""]);
  const [learningLoading, setLearningLoading] = useState<boolean>(false);
  const [learningError, setLearningError] = useState<string | null>(null);

  // localStorage から文体プロファイルを読み込み
  useEffect(() => {
    const savedProfile = localStorage.getItem("emailStyleProfile");
    if (savedProfile) {
      setStyleProfile(savedProfile);
    }
  }, []);

  async function generateEmail(): Promise<void> {
    if (!inputText.trim()) {
      setError("メール内容または依頼内容を入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setProcessingTime(null);
    setResult(null);

    try {
      const res = await fetch("/api/email-composer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          inputText: inputText.trim(),
          additionalInfo: additionalInfo.trim(),
          styleProfile: styleProfile || undefined, // 学習した文体を送信
        }),
      });

      if (!res.ok) {
        let errorMessage = "メール生成に失敗しました";
        let details = "";
        let timeInfo = "";
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.details) {
            details = errorData.details;
          }
          if (errorData.processingTime) {
            timeInfo = errorData.processingTime;
          }
        } catch {
          errorMessage = `メール生成に失敗 (${res.status}): ${res.statusText}`;
        }

        setError(errorMessage);
        setErrorDetails(details);
        setProcessingTime(timeInfo);
        return;
      }

      const data = await res.json();

      if (!data.email || data.email.trim() === "") {
        setError("メール生成結果が空です");
        setErrorDetails("もう一度お試しください。");
        return;
      }

      setResult(data.email);
    } catch (err) {
      console.error("Email Composer Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "予期しないエラーが発生しました"
      );
      setErrorDetails("ネットワーク接続を確認してください。");
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

      if (!res.ok) {
        let errorMessage = "文体分析に失敗しました";
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = `エラー: ${errorData.error}`;
          }
        } catch {
          errorMessage = `文体分析に失敗 (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();

      if (!data.styleProfile || data.styleProfile.trim() === "") {
        throw new Error("文体分析結果が空です");
      }

      // localStorageに保存
      localStorage.setItem("emailStyleProfile", data.styleProfile);
      setStyleProfile(data.styleProfile);

      // 成功メッセージ
      alert("✅ 文体の学習が完了しました！\n\nこれからのメール生成では、あなたの文体が反映されます。");
    } catch (err) {
      console.error("Style Learning Error:", err);
      setLearningError(
        err instanceof Error
          ? err.message
          : "予期しないエラーが発生しました"
      );
    } finally {
      setLearningLoading(false);
    }
  }

  function clearStyleProfile(): void {
    if (confirm("学習した文体をリセットしますか？")) {
      localStorage.removeItem("emailStyleProfile");
      setStyleProfile(null);
      alert("✅ 文体がリセットされました");
    }
  }

  async function copyToClipboard(): Promise<void> {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("コピーに失敗:", err);
    }
  }

  function reset(): void {
    setInputText("");
    setAdditionalInfo("");
    setResult(null);
    setError(null);
    setErrorDetails(null);
    setProcessingTime(null);
  }

  const taskTypeLabels = {
    reply: "返信作成",
    compose: "新規作成",
    revise: "添削",
  };

  const taskTypePlaceholders = {
    reply: "受信したメール内容を貼り付けてください...",
    compose: "作成したいメールの要件を入力してください（例：新商品の案内、価格改定のお知らせ）",
    revise: "添削したいメール文を貼り付けてください...",
  };

  const additionalInfoPlaceholders = {
    reply: "返信内容の指示があれば入力してください（例：来週火曜日に訪問したい旨を伝える）",
    compose: "補足情報があれば入力してください（例：送付先はJA担当者、カジュアルなトーンで）",
    revise: "添削の指示があれば入力してください（例：もう少しカジュアルに、丁寧すぎる表現を減らす）",
  };

  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 960 }}>
        <div style={{ marginBottom: 16 }}>
          <BackToHome />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                flexShrink: 0,
              }}
            >
              <Mail size={24} />
            </div>
            <h1
              style={{
                fontSize: "clamp(18px, 4vw, 24px)",
                fontWeight: 600,
                margin: 0,
              }}
            >
              メール返信叩きくん
            </h1>
            {styleProfile && (
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  background: "#dcfce7",
                  color: "#16a34a",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Brain style={{ width: 12, height: 12 }} />
                文体学習済み
              </span>
            )}
          </div>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0, paddingLeft: 60 }}>
            {loading
              ? "メール文を生成中...（最大60秒程度かかる場合があります）"
              : "ビジネスメールの作成・返信・添削をお手伝いします"}
          </p>
        </div>

        {/* タブ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "2px solid #e5e7eb" }}>
          <button
            onClick={() => setActiveTab("composer")}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "composer" ? "2px solid #667eea" : "2px solid transparent",
              color: activeTab === "composer" ? "#667eea" : "#64748b",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: -2,
            }}
          >
            <Mail style={{ width: 16, height: 16 }} />
            メール作成
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "settings" ? "2px solid #667eea" : "2px solid transparent",
              color: activeTab === "settings" ? "#667eea" : "#64748b",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: -2,
            }}
          >
            <Settings style={{ width: 16, height: 16 }} />
            文体学習
          </button>
        </div>

        {/* メール作成タブ */}
        {activeTab === "composer" && (
          <>
            {!result && !loading && (
              <div
                style={{
                  background: "white",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 16,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: "#475569" }}>📋 使い方</span>
                    　タスクを選択して、メール内容や要件を入力してください
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              {/* タスクタイプ選択 */}
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 12,
                }}
              >
                タスクを選択
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {(["reply", "compose", "revise"] as TaskType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTaskType(type)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: 8,
                      background: taskType === type ? "#667eea" : "white",
                      color: taskType === type ? "white" : "#475569",
                      border: `2px solid ${taskType === type ? "#667eea" : "#e5e7eb"}`,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {taskTypeLabels[type]}
                  </button>
                ))}
              </div>

              {/* メイン入力 */}
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                {taskType === "reply"
                  ? "受信メール"
                  : taskType === "compose"
                  ? "作成要件"
                  : "添削対象メール"}
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={taskTypePlaceholders[taskType]}
                style={{
                  width: "100%",
                  minHeight: 200,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  boxSizing: "border-box",
                  resize: "vertical",
                  marginBottom: 16,
                }}
              />

              {/* 追加情報 */}
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                追加指示（オプション）
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder={additionalInfoPlaceholders[taskType]}
                style={{
                  width: "100%",
                  minHeight: 100,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={generateEmail}
                  disabled={loading || !inputText.trim()}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    background:
                      loading || !inputText.trim()
                        ? "#94a3b8"
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    cursor: loading || !inputText.trim() ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                  }}
                >
                  {loading && (
                    <Loader2
                      style={{
                        width: 16,
                        height: 16,
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  )}
                  <Mail style={{ width: 16, height: 16 }} />
                  メール生成
                </button>

                <button
                  onClick={reset}
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    background: "white",
                    color: "#475569",
                    border: "1px solid #e5e7eb",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                  }}
                >
                  <RotateCcw style={{ width: 16, height: 16 }} />
                  リセット
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  color: "#dc2626",
                  fontSize: 14,
                  padding: 16,
                  background: "#fee2e2",
                  borderRadius: 8,
                  marginBottom: 16,
                  border: "1px solid #fecaca",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{error}</div>
                {errorDetails && (
                  <div style={{ fontSize: 13, color: "#991b1b", marginBottom: 6 }}>
                    {errorDetails}
                  </div>
                )}
                {processingTime && (
                  <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 8 }}>
                    処理時間: {processingTime}
                  </div>
                )}
              </div>
            )}

            {result && !loading && (
              <div
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    paddingBottom: 8,
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#0f172a",
                      margin: 0,
                    }}
                  >
                    ✉️ 生成されたメール文
                  </h2>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: copied ? "#10b981" : "white",
                      color: copied ? "white" : "#475569",
                      border: "1px solid #e5e7eb",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s",
                    }}
                  >
                    {copied ? (
                      <>
                        <Check style={{ width: 14, height: 14 }} />
                        コピー完了
                      </>
                    ) : (
                      <>
                        <Copy style={{ width: 14, height: 14 }} />
                        コピー
                      </>
                    )}
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#334155",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    background: "#f8fafc",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {result}
                </div>
              </div>
            )}
          </>
        )}

        {/* 文体学習タブ */}
        {activeTab === "settings" && (
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#0f172a",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Brain style={{ width: 20, height: 20 }} />
              あなたの文体を学習
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
              あなたが実際に書いたメール文を1〜3件貼り付けてください。
              <br />
              AIがあなたの文体・トーン・表現パターンを分析し、今後のメール生成に反映します。
            </p>

            {/* サンプルメール入力欄 */}
            {sampleEmails.map((email, index) => (
              <div key={index} style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: 8,
                  }}
                >
                  サンプルメール {index + 1}
                  {index === 0 && <span style={{ color: "#ef4444" }}>（必須）</span>}
                  {index > 0 && <span style={{ color: "#64748b", fontWeight: 400 }}>（任意）</span>}
                </label>
                <textarea
                  value={email}
                  onChange={(e) => {
                    const newEmails = [...sampleEmails];
                    newEmails[index] = e.target.value;
                    setSampleEmails(newEmails);
                  }}
                  placeholder={`あなたが実際に書いたメール文を貼り付けてください...${index === 0 ? "（少なくとも1件は必須）" : ""}`}
                  style={{
                    width: "100%",
                    minHeight: 150,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>
            ))}

            {learningError && (
              <div
                style={{
                  color: "#dc2626",
                  fontSize: 14,
                  padding: 12,
                  background: "#fee2e2",
                  borderRadius: 8,
                  marginBottom: 16,
                  border: "1px solid #fecaca",
                }}
              >
                {learningError}
              </div>
            )}

            <button
              onClick={learnWritingStyle}
              disabled={learningLoading}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: learningLoading
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                color: "white",
                border: "none",
                cursor: learningLoading ? "not-allowed" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
              }}
            >
              {learningLoading && (
                <Loader2
                  style={{
                    width: 16,
                    height: 16,
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
              <Brain style={{ width: 16, height: 16 }} />
              文体を学習する
            </button>

            {/* 学習済み文体の表示 */}
            {styleProfile && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#16a34a",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Check style={{ width: 16, height: 16 }} />
                    学習済みの文体
                  </h3>
                  <button
                    onClick={clearStyleProfile}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "white",
                      color: "#ef4444",
                      border: "1px solid #fecaca",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                    リセット
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#15803d",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {styleProfile}
                </div>
              </div>
            )}
          </div>
        )}

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          メール返信叩きくん - ビジネスメールの作成・返信・添削アシスタント
        </p>
      </div>
    </div>
  );
}
