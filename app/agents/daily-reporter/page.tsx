"use client";
import React, { useState, useEffect, useRef } from "react";
import { Loader2, Mic, Square, Copy, Check, FileText, Building2 } from "lucide-react";
import BackToHome from "../../components/BackToHome";
import { DailyReport } from "@/lib/types/daily-report";

export default function DailyReporter() {
  const [transcript, setTranscript] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [products, setProducts] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [result, setResult] = useState<DailyReport | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const wakeLockRef = useRef<any>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // ページタイトルを設定
  useEffect(() => {
    document.title = "営業日報くん | 営業AIポータル";
  }, []);

  // transcriptが変更されたら前回の結果をクリア
  useEffect(() => {
    if (result !== null) {
      setResult(null);
      setError(null);
      setErrorDetails(null);
      setProcessingTime(null);
    }
  }, [transcript]);

  // 録音開始
  async function startRecording(): Promise<void> {
    try {
      // iOS判定
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

      // Wake Lock APIで画面スリープを防止（Android Chrome対応）
      if ('wakeLock' in navigator && !isIOS) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('🔒 Wake Lock 有効化（画面スリープ防止）');

          wakeLockRef.current.addEventListener('release', () => {
            console.log('🔓 Wake Lock 解除');
          });
        } catch (err) {
          console.warn('⚠️ Wake Lock 取得失敗:', err);
        }
      }

      // iOS用：無音オーディオで画面スリープを防止
      if (isIOS) {
        try {
          const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAABQAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV//////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAAbC9Zfjh/+MYxAALACwAAP/AADwQKVE62Zc8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
          silentAudio.loop = true;
          silentAudio.volume = 0.01;
          await silentAudio.play();
          silentAudioRef.current = silentAudio;
          console.log('🎵 無音オーディオ再生開始（iOS画面スリープ防止）');
        } catch (err) {
          console.warn('⚠️ 無音オーディオ再生失敗:', err);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setError(null);

      // 録音時間のカウント開始
      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (err) {
      setError("マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。");
      console.error(err);
    }
  }

  // 録音停止
  function stopRecording(): void {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);

      // タイマーを停止
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }

      // Wake Lock解除
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          console.log('🔓 Wake Lock 手動解除');
          wakeLockRef.current = null;
        });
      }

      // iOS用無音オーディオ停止
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
        console.log('🔇 無音オーディオ停止');
      }
    }
  }

  // 音声を文字起こし
  async function transcribeAudio(audioBlob: Blob): Promise<void> {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "文字起こしに失敗しました";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          console.error("エラーレスポンスのパース失敗:", e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setTranscript((prev) => {
        const separator = prev ? "\n\n" : "";
        return prev + separator + data.transcription;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "文字起こし中にエラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  }

  // 時間をフォーマット（秒 → MM:SS）
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  // クリップボードにコピー
  async function copyToClipboard(text: string, sectionName: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error("コピーに失敗:", err);
    }
  }

  // 日報全体をテキスト形式で取得
  function getFullReportText(): string {
    if (!result) return "";
    const { title, visitInfo, targetProducts, visitSummary } = result;
    return `【タイトル】
${title}

【訪問先】
${visitInfo.destination}

【参加者】
${visitInfo.participants.join(", ")}

【商談対象製品】
${targetProducts.join(", ")}

【訪問内容要約】

① 目的
${visitSummary.purpose}

② 結果
${visitSummary.result}

③ 提案
${visitSummary.proposal}

④ 課題
${visitSummary.challenges}

⑤ 次のステップ
${visitSummary.nextSteps}`;
  }

  // 日報を生成
  async function generateReport(): Promise<void> {
    if (!transcript.trim()) {
      setError("商談内容を入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setProcessingTime(null);
    setResult(null);

    try {
      const res = await fetch("/api/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          destination: destination.trim() || undefined,
          products: products.trim() ? products.split(",").map(p => p.trim()) : undefined,
        }),
      });

      if (!res.ok) {
        let errorMessage = "日報の生成に失敗しました";
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
          errorMessage = `日報の生成に失敗 (${res.status}): ${res.statusText}`;
        }

        setError(errorMessage);
        setErrorDetails(details);
        setProcessingTime(timeInfo);
        return;
      }

      const data = await res.json();

      if (!data || !data.report) {
        setError("日報データが不完全です。");
        setErrorDetails("もう一度お試しください。");
        return;
      }

      setResult(data.report);
      setProcessingTime(data.processingTime);
    } catch (err) {
      console.error("Daily Report Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "予期しないエラーが発生しました。しばらくしてから再度お試しください。"
      );
      setErrorDetails("ネットワーク接続を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
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
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                flexShrink: 0,
              }}
            >
              <FileText size={24} />
            </div>
            <h1
              style={{
                fontSize: "clamp(18px, 4vw, 24px)",
                fontWeight: 600,
                margin: 0,
                color: "var(--foreground)",
              }}
            >
              営業日報くん
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, paddingLeft: 60 }}>
            商談内容から営業日報を自動生成
          </p>
        </div>

        {!result && !loading && (
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              border: "1px solid var(--card-border)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "var(--foreground)",
                lineHeight: 1.8,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              📝 使い方
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                paddingLeft: 8,
              }}
            >
              商談内容を入力（録音 or テキスト貼り付け） → 訪問先・製品名を入力（任意） → 「日報を作成」 → <strong>営業日報を出力</strong>
            </div>
          </div>
        )}

        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {/* 録音セクション */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--card-border)" }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--foreground)",
                marginBottom: 12,
              }}
            >
              🎤 音声録音（オプション）
            </label>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                  }}
                >
                  <Mic style={{ width: 16, height: 16 }} />
                  録音開始
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                >
                  <Square style={{ width: 16, height: 16 }} />
                  録音停止
                </button>
              )}
              {isRecording && (
                <>
                  <span style={{ fontSize: 14, color: "#ef4444", fontWeight: 600 }}>
                    ● 録音中
                  </span>
                  <span style={{ fontSize: 16, color: "var(--foreground)", fontWeight: 700, fontFamily: "monospace" }}>
                    {formatTime(recordingTime)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 基本情報入力 */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--card-border)" }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--foreground)",
                marginBottom: 8,
              }}
            >
              <Building2 style={{ width: 14, height: 14, display: "inline", marginRight: 6 }} />
              訪問先（任意）
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="例: ○○農園"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--card-border)",
                background: "var(--background)",
                color: "var(--foreground)",
                fontSize: 14,
                boxSizing: "border-box",
                marginBottom: 12,
              }}
            />

            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--foreground)",
                marginBottom: 8,
              }}
            >
              🏷️ 商談対象製品（任意・カンマ区切り）
            </label>
            <input
              type="text"
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              placeholder="例: プロソイル, バイオマックス"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--card-border)",
                background: "var(--background)",
                color: "var(--foreground)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* テキスト入力セクション */}
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--foreground)",
              marginBottom: 8,
            }}
          >
            商談内容を入力
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="例: 本日は○○農園の田中様と、春の育苗計画について打ち合わせを行いました..."
            style={{
              width: "100%",
              minHeight: 200,
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--card-border)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: 14,
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />

          {/* 文字数カウンター */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            fontSize: 12,
            color: transcript.length > 35000 ? "#dc2626" : transcript.length > 25000 ? "#d97706" : "var(--text-secondary)"
          }}>
            <span>
              {transcript.length.toLocaleString()}文字 / 35,000文字
              {transcript.length > 35000 && " （制限を超えています）"}
            </span>
            {transcript.length > 35000 && (
              <span style={{
                padding: "2px 8px",
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 11
              }}>
                制限超過
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={generateReport}
              disabled={loading || !transcript.trim()}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background:
                  loading || !transcript.trim()
                    ? "var(--text-tertiary)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                cursor: loading || !transcript.trim() ? "not-allowed" : "pointer",
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
              日報を作成
            </button>

            <button
              onClick={() => {
                setTranscript("");
                setDestination("");
                setProducts("");
                setResult(null);
                setError(null);
              }}
              disabled={loading}
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                padding: "6px 10px",
              }}
            >
              クリア
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
              background: "var(--card-bg)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
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
                borderBottom: "2px solid var(--card-border)",
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--foreground)",
                  margin: 0,
                }}
              >
                📋 営業日報
              </h2>
              <button
                onClick={() => copyToClipboard(getFullReportText(), "full")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: copiedSection === "full" ? "#10b981" : "var(--card-bg)",
                  color: copiedSection === "full" ? "white" : "var(--text-secondary)",
                  border: "1px solid var(--card-border)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                {copiedSection === "full" ? (
                  <>
                    <Check style={{ width: 14, height: 14 }} />
                    コピー完了
                  </>
                ) : (
                  <>
                    <Copy style={{ width: 14, height: 14 }} />
                    全体をコピー
                  </>
                )}
              </button>
            </div>

            {/* タイトル */}
            <div style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                タイトル
              </h3>
              <p style={{ fontSize: 16, color: "var(--foreground)", lineHeight: 1.7, margin: 0, fontWeight: 600 }}>
                {result.title}
              </p>
            </div>

            {/* 訪問先・参加者 */}
            <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  訪問先
                </h3>
                <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7, margin: 0 }}>
                  {result.visitInfo.destination}
                </p>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  参加者
                </h3>
                <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7, margin: 0 }}>
                  {result.visitInfo.participants.join(", ")}
                </p>
              </div>
            </div>

            {/* 商談対象製品 */}
            <div style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                商談対象製品
              </h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.targetProducts.map((product, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      background: "#dbeafe",
                      color: "#1e40af",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {product}
                  </span>
                ))}
              </div>
            </div>

            {/* 訪問内容要約 */}
            <div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                }}
              >
                訪問内容要約
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 12, background: "var(--background)", borderRadius: 8, borderLeft: "4px solid #667eea" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#667eea", marginBottom: 4 }}>① 目的</div>
                  <div style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7 }}>{result.visitSummary.purpose}</div>
                </div>

                <div style={{ padding: 12, background: "var(--background)", borderRadius: 8, borderLeft: "4px solid #10b981" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#10b981", marginBottom: 4 }}>② 結果</div>
                  <div style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7 }}>{result.visitSummary.result}</div>
                </div>

                <div style={{ padding: 12, background: "var(--background)", borderRadius: 8, borderLeft: "4px solid #f59e0b" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>③ 提案</div>
                  <div style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7 }}>{result.visitSummary.proposal}</div>
                </div>

                <div style={{ padding: 12, background: "var(--background)", borderRadius: 8, borderLeft: "4px solid #ef4444" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>④ 課題</div>
                  <div style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7 }}>{result.visitSummary.challenges}</div>
                </div>

                <div style={{ padding: 12, background: "var(--background)", borderRadius: 8, borderLeft: "4px solid #8b5cf6" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6", marginBottom: 4 }}>⑤ 次のステップ</div>
                  <div style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7 }}>{result.visitSummary.nextSteps}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "var(--text-tertiary)",
            textAlign: "center",
          }}
        >
          営業日報くん - 商談内容から営業日報を自動生成
        </p>
      </div>
    </div>
  );
}
