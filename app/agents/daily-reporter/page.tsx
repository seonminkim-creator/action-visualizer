"use client";
import React, { useState, useEffect, useRef } from "react";
import { Loader2, Mic, Square, Copy, Check, FileText, Building2, ThumbsUp, ThumbsDown, History, X } from "lucide-react";
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
  const [copyFormat, setCopyFormat] = useState<"text" | "markdown">("text");
  const [reportId, setReportId] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackRating, setFeedbackRating] = useState<"good" | "bad" | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [reportHistory, setReportHistory] = useState<Array<{
    id: string;
    date: string;
    destination: string;
    products: string[];
    report: DailyReport;
  }>>([]);
  const wakeLockRef = useRef<any>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // ページタイトルを設定
  useEffect(() => {
    document.title = "営業日報くん | 営業AIポータル";
  }, []);

  // ページ読み込み時に履歴を復元
  useEffect(() => {
    loadHistory();
  }, []);

  // 履歴をLocalStorageから読み込み
  function loadHistory() {
    try {
      const stored = localStorage.getItem("dailyReportHistory");
      if (stored) {
        const history = JSON.parse(stored);
        setReportHistory(history);
      }
    } catch (err) {
      console.error("履歴の読み込みに失敗:", err);
    }
  }

  // 履歴をLocalStorageに保存
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

      // 最新20件のみ保持
      const updatedHistory = [newEntry, ...history].slice(0, 20);

      localStorage.setItem("dailyReportHistory", JSON.stringify(updatedHistory));
      setReportHistory(updatedHistory);

      console.log("✅ 履歴に保存しました");
    } catch (err) {
      console.error("履歴の保存に失敗:", err);
    }
  }

  // 履歴から日報を読み込み
  function loadFromHistory(historyEntry: any) {
    setResult(historyEntry.report);
    setReportId(historyEntry.id);
    setFeedbackSubmitted(false);
    setFeedbackRating(null);
    setShowHistory(false);

    // 入力フィールドにも反映（オプション）
    setDestination(historyEntry.destination || "");
    setProducts(historyEntry.products?.join(", ") || "");
  }

  // transcriptが変更されたら前回の結果をクリア
  useEffect(() => {
    if (result !== null) {
      setResult(null);
      setError(null);
      setErrorDetails(null);
      setProcessingTime(null);
      setFeedbackSubmitted(false);
      setFeedbackRating(null);
    }
  }, [transcript]);

  // フィードバック送信
  async function submitFeedback(rating: "good" | "bad"): Promise<void> {
    if (!reportId) return;

    try {
      const res = await fetch("/api/daily-report-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          rating,
        }),
      });

      if (!res.ok) {
        throw new Error("フィードバックの送信に失敗しました");
      }

      setFeedbackSubmitted(true);
      setFeedbackRating(rating);
      console.log(`✅ フィードバック送信: ${rating}`);
    } catch (err) {
      console.error("フィードバック送信エラー:", err);
    }
  }

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

  // 日報全体をMarkdown形式で取得
  function getFullReportMarkdown(): string {
    if (!result) return "";
    const { title, visitInfo, targetProducts, visitSummary } = result;
    return `# ${title}

## 訪問先
${visitInfo.destination}

## 参加者
${visitInfo.participants.map(p => `- ${p}`).join('\n')}

## 商談対象製品
${targetProducts.map(p => `- ${p}`).join('\n')}

## 訪問内容要約

### ① 目的
${visitSummary.purpose}

### ② 結果
${visitSummary.result}

### ③ 提案
${visitSummary.proposal}

### ④ 課題
${visitSummary.challenges}

### ⑤ 次のステップ
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

      // レポートID生成
      const newReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setReportId(newReportId);
      setFeedbackSubmitted(false);
      setFeedbackRating(null);

      // 履歴に保存
      saveToHistory(data.report);
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

        {/* 履歴ボタン */}
        {reportHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--card-bg)",
              color: "var(--text-secondary)",
              border: "1px solid var(--card-border)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <History style={{ width: 16, height: 16 }} />
            履歴 ({reportHistory.length}件)
          </button>
        )}

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

          {/* 入力補助ヒント */}
          <div style={{
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 12,
            color: "#0c4a6e",
            lineHeight: 1.8
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>✓ 入力のコツ</div>
            <div style={{ paddingLeft: 8 }}>
              • 訪問先名と参加者を明記<br />
              • 具体的な数値（面積、使用量、金額等）<br />
              • 顧客の反応や懸念点<br />
              • 次回の約束や期限
            </div>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="例: ○○農園の田中様を訪問。大豆5haで除草に困っているとのこと。パワーガイザー液剤を提案し、まず1haで試験したいと..."
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
                flexWrap: "wrap",
                gap: 12,
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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* フォーマット選択 */}
                <div style={{ display: "flex", gap: 4, background: "var(--background)", borderRadius: 6, padding: 2 }}>
                  <button
                    onClick={() => setCopyFormat("text")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      background: copyFormat === "text" ? "#667eea" : "transparent",
                      color: copyFormat === "text" ? "white" : "var(--text-secondary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      transition: "all 0.2s",
                    }}
                  >
                    テキスト
                  </button>
                  <button
                    onClick={() => setCopyFormat("markdown")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      background: copyFormat === "markdown" ? "#667eea" : "transparent",
                      color: copyFormat === "markdown" ? "white" : "var(--text-secondary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      transition: "all 0.2s",
                    }}
                  >
                    Markdown
                  </button>
                </div>

                {/* コピーボタン */}
                <button
                  onClick={() => copyToClipboard(
                    copyFormat === "markdown" ? getFullReportMarkdown() : getFullReportText(),
                    "full"
                  )}
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
                      コピー
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 日報基本情報 */}
            <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--card-border)" }}>
              {/* タイトル */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  日報タイトル
                </div>
                <h2 style={{
                  fontSize: 20,
                  color: "var(--foreground)",
                  lineHeight: 1.5,
                  margin: 0,
                  fontWeight: 700
                }}>
                  {result.title}
                </h2>
              </div>

              {/* 訪問先・参加者 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 16 }}>
                <div style={{
                  padding: 12,
                  background: "var(--background)",
                  borderRadius: 8,
                  border: "1px solid var(--card-border)"
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    📍 訪問先
                  </div>
                  <div style={{ fontSize: 15, color: "var(--foreground)", lineHeight: 1.6, fontWeight: 600 }}>
                    {result.visitInfo.destination}
                  </div>
                </div>
                <div style={{
                  padding: 12,
                  background: "var(--background)",
                  borderRadius: 8,
                  border: "1px solid var(--card-border)"
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    👥 参加者
                  </div>
                  <div style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7 }}>
                    {result.visitInfo.participants.map((p, i) => (
                      <div key={i} style={{ marginBottom: i < result.visitInfo.participants.length - 1 ? 4 : 0 }}>
                        • {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 商談対象製品 */}
              <div style={{
                padding: 12,
                background: "var(--background)",
                borderRadius: 8,
                border: "1px solid var(--card-border)"
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  🏷️ 商談対象製品
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {result.targetProducts.map((product, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        fontSize: 13,
                        fontWeight: 600,
                        boxShadow: "0 2px 4px rgba(102, 126, 234, 0.2)"
                      }}
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 訪問内容要約 */}
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                📝 訪問内容要約
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{
                  padding: 14,
                  background: "var(--background)",
                  borderRadius: 8,
                  borderLeft: "4px solid #667eea",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#667eea",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    ① 目的
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: "var(--foreground)",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap"
                  }}>
                    {result.visitSummary.purpose}
                  </div>
                </div>

                <div style={{
                  padding: 14,
                  background: "var(--background)",
                  borderRadius: 8,
                  borderLeft: "4px solid #10b981",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#10b981",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    ② 結果
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: "var(--foreground)",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap"
                  }}>
                    {result.visitSummary.result}
                  </div>
                </div>

                <div style={{
                  padding: 14,
                  background: "var(--background)",
                  borderRadius: 8,
                  borderLeft: "4px solid #f59e0b",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#f59e0b",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    ③ 提案
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: "var(--foreground)",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap"
                  }}>
                    {result.visitSummary.proposal}
                  </div>
                </div>

                <div style={{
                  padding: 14,
                  background: "var(--background)",
                  borderRadius: 8,
                  borderLeft: "4px solid #ef4444",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#ef4444",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    ④ 課題
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: "var(--foreground)",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap"
                  }}>
                    {result.visitSummary.challenges}
                  </div>
                </div>

                <div style={{
                  padding: 14,
                  background: "var(--background)",
                  borderRadius: 8,
                  borderLeft: "4px solid #8b5cf6",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8b5cf6",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    ⑤ 次のステップ
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: "var(--foreground)",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap"
                  }}>
                    {result.visitSummary.nextSteps}
                  </div>
                </div>
              </div>
            </div>

            {/* フィードバックセクション */}
            <div style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--card-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                この日報は役に立ちましたか？
              </div>

              {!feedbackSubmitted ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => submitFeedback("good")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      background: "var(--card-bg)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--card-border)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#10b981";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.borderColor = "#10b981";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "var(--card-bg)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.borderColor = "var(--card-border)";
                    }}
                  >
                    <ThumbsUp style={{ width: 14, height: 14 }} />
                    良い
                  </button>
                  <button
                    onClick={() => submitFeedback("bad")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      background: "var(--card-bg)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--card-border)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#ef4444";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.borderColor = "#ef4444";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "var(--card-bg)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.borderColor = "var(--card-border)";
                    }}
                  >
                    <ThumbsDown style={{ width: 14, height: 14 }} />
                    改善が必要
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  background: feedbackRating === "good" ? "#d1fae5" : "#fee2e2",
                  color: feedbackRating === "good" ? "#065f46" : "#991b1b",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <Check style={{ width: 14, height: 14 }} />
                  フィードバックを送信しました
                </div>
              )}
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

        {/* 履歴モーダル */}
        {showHistory && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 16,
            }}
            onClick={() => setShowHistory(false)}
          >
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: 12,
                padding: 24,
                maxWidth: 800,
                width: "100%",
                maxHeight: "80vh",
                overflow: "auto",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottom: "2px solid var(--card-border)",
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "var(--foreground)",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <History style={{ width: 20, height: 20 }} />
                  日報履歴
                </h2>
                <button
                  onClick={() => setShowHistory(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    padding: 4,
                  }}
                >
                  <X style={{ width: 20, height: 20 }} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reportHistory.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: 16,
                      background: "var(--background)",
                      borderRadius: 8,
                      border: "1px solid var(--card-border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onClick={() => loadFromHistory(entry)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.2)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "var(--card-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--foreground)",
                        marginBottom: 8,
                      }}
                    >
                      {entry.report.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 6,
                      }}
                    >
                      <span>📍 {entry.destination}</span>
                      <span>📅 {new Date(entry.date).toLocaleDateString("ja-JP")}</span>
                    </div>
                    {entry.products.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {entry.products.map((product, i) => (
                          <span
                            key={i}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "#e0e7ff",
                              color: "#4338ca",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {reportHistory.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "var(--text-secondary)",
                    fontSize: 14,
                  }}
                >
                  まだ履歴がありません
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
