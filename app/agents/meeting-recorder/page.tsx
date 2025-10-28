"use client";
import React, { useState, useEffect } from "react";
import { Loader2, Mic, MicOff, Square, Monitor, Settings, History, Copy, Check, MessageSquare } from "lucide-react";
import BackToHome from "../../components/BackToHome";

type MeetingSummary = {
  summary: {
    purpose: string;
    discussions: string[];
    decisions: string[];
  };
  todos: Array<{
    task: string;
    assignee: string;
    deadline?: string;
    priority: "high" | "medium" | "low";
  }>;
  detailedMinutes: string;
};

export default function MeetingRecorder() {
  const [transcript, setTranscript] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // ページタイトルを設定
  useEffect(() => {
    document.title = "会議まとめくん | 営業AIポータル";
  }, []);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingSummary | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordingMode, setRecordingMode] = useState<"microphone" | "system">("microphone");
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [micGainNode, setMicGainNode] = useState<GainNode | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [autoGenerateSummary, setAutoGenerateSummary] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; date: string; summary: MeetingSummary }>>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // LocalStorageから設定と履歴を読み込み
  useEffect(() => {
    const savedAutoGenerate = localStorage.getItem("autoGenerateSummary");
    if (savedAutoGenerate !== null) {
      setAutoGenerateSummary(savedAutoGenerate === "true");
    }

    const savedHistory = localStorage.getItem("meetingHistory");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("履歴の読み込みに失敗:", e);
      }
    }
  }, []);

  // 設定をLocalStorageに保存
  useEffect(() => {
    localStorage.setItem("autoGenerateSummary", String(autoGenerateSummary));
  }, [autoGenerateSummary]);

  // 履歴をLocalStorageに保存
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("meetingHistory", JSON.stringify(history));
    }
  }, [history]);

  // transcriptが変更されたら前回の結果をクリア
  useEffect(() => {
    if (result !== null) {
      setResult(null);
      setError(null);
      setErrorDetails(null);
      setProcessingTime(null);
    }
  }, [transcript]);

  async function startRecording(): Promise<void> {
    try {
      let stream: MediaStream;

      if (recordingMode === "microphone") {
        // マイク録音のみ
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        // システム音声（WEB会議）：マイク＋システム音声の両方を録音
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const systemStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        // 映像トラックを削除
        const videoTracks = systemStream.getVideoTracks();
        videoTracks.forEach((track: MediaStreamTrack) => track.stop());

        // AudioContextで2つの音声をミックス
        const audioContext = new AudioContext();
        const systemSource = audioContext.createMediaStreamSource(systemStream);
        const destination = audioContext.createMediaStreamDestination();

        // システム音声は常に接続
        systemSource.connect(destination);

        // マイクトラックの参照を保持（ミュート制御用）
        const micSource = audioContext.createMediaStreamSource(micStream);
        const micGain = audioContext.createGain();
        micSource.connect(micGain);
        micGain.connect(destination);

        // GainNodeを保存（後でミュート制御に使用）
        setMicGainNode(micGain);

        // クリーンアップ用に保存
        (destination.stream as any)._micStream = micStream;
        (destination.stream as any)._systemStream = systemStream;

        stream = destination.stream;
      }

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        // 文字起こし処理
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob);

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            // APIからの詳細エラーメッセージを取得
            let errorMessage = "文字起こしに失敗しました";
            try {
              const errorData = await response.json();
              if (errorData.error) {
                errorMessage = `文字起こしエラー: ${errorData.error}`;
              }
            } catch {
              errorMessage = `文字起こしに失敗 (${response.status}): ${response.statusText}`;
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();

          // データ検証
          if (!data.transcription || data.transcription.trim() === "") {
            throw new Error("音声が認識できませんでした。もう一度録音してください。");
          }

          const newTranscript = data.transcription;
          setTranscript((prev) => {
            const newText = prev ? prev + "\n\n" + newTranscript : newTranscript;
            return newText;
          });

          // 自動議事録作成が有効な場合、文字起こし後に自動実行
          if (autoGenerateSummary) {
            // transcriptステートが更新されるのを待つため、setTimeoutを使用
            setTimeout(() => {
              generateSummary();
            }, 500);
          }
        } catch (err) {
          console.error("文字起こしエラー:", err);
          setError(
            err instanceof Error
              ? err.message
              : "文字起こし中に予期しないエラーが発生しました"
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
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

  function stopRecording(): void {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      setIsMicMuted(false);
      setMicGainNode(null);

      // タイマーを停止
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }

      // システム音声モードのクリーンアップ
      const stream = mediaRecorder.stream;
      if ((stream as any)._micStream) {
        (stream as any)._micStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      if ((stream as any)._systemStream) {
        (stream as any)._systemStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    }
  }

  // マイクミュート切り替え関数
  function toggleMicMute(): void {
    if (micGainNode) {
      const newMutedState = !isMicMuted;
      setIsMicMuted(newMutedState);
      micGainNode.gain.value = newMutedState ? 0 : 1;
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

  // 会議サマリーをテキスト形式で取得
  function getSummaryText(): string {
    if (!result) return "";
    const { summary } = result;
    return `【会議の目的】\n${summary.purpose}\n\n【主な議論内容】\n${summary.discussions.map(d => d).join("\n")}\n\n【決定事項】\n${summary.decisions.map(d => d).join("\n")}`;
  }

  // TODOリストをテキスト形式で取得
  function getTodosText(): string {
    if (!result) return "";
    const sortedTodos = [...result.todos].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    return sortedTodos.map(todo => {
      const priorityLabel = priorityColors[todo.priority].label;
      const deadline = todo.deadline ? ` [期限: ${todo.deadline}]` : "";
      return `[優先度: ${priorityLabel}] [担当: ${todo.assignee}]${deadline} ${todo.task}`;
    }).join("\n");
  }

  async function generateSummary(): Promise<void> {
    if (!transcript.trim()) {
      setError("会議の内容を入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setProcessingTime(null);
    setResult(null);

    // 処理ステージを表示（シンプルなメッセージ）
    const charCount = transcript.trim().length;
    if (charCount > 15000) {
      setProcessingStage("議事録を生成中... (長文のため最大50秒)");
    } else if (charCount > 5000) {
      setProcessingStage("議事録を生成中... (約30秒)");
    } else {
      setProcessingStage("議事録を生成中... (約20秒)");
    }

    try {
      const res = await fetch("/api/meeting-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });

      if (!res.ok) {
        // APIからの詳細エラーメッセージを取得
        let errorMessage = "議事録の生成に失敗しました";
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
          errorMessage = `議事録の生成に失敗 (${res.status}): ${res.statusText}`;
        }

        setError(errorMessage);
        setErrorDetails(details);
        setProcessingTime(timeInfo);
        return;
      }

      const data = await res.json();

      // データ検証
      if (!data || !data.summary || !data.todos || !data.detailedMinutes) {
        setError("議事録データが不完全です。");
        setErrorDetails("もう一度お試しください。");
        return;
      }

      setResult(data);

      // 履歴に追加
      const newHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString("ja-JP"),
        summary: data,
      };
      setHistory((prev) => [newHistoryItem, ...prev].slice(0, 10)); // 最新10件まで保存
    } catch (err) {
      console.error("Meeting Summary Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "予期しないエラーが発生しました。しばらくしてから再度お試しください。"
      );
      setErrorDetails("ネットワーク接続を確認してください。");
    } finally {
      setLoading(false);
      setProcessingStage("");
    }
  }

  const priorityColors = {
    high: { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", label: "高" },
    medium: { bg: "#fef3c7", border: "#fcd34d", text: "#d97706", label: "中" },
    low: { bg: "#f0f9ff", border: "#93c5fd", text: "#2563eb", label: "低" },
  };

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
                background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                flexShrink: 0,
              }}
            >
              <MessageSquare size={24} />
            </div>
            <h1
              style={{
                fontSize: "clamp(18px, 4vw, 24px)",
                fontWeight: 600,
                margin: 0,
                color: "var(--foreground)",
              }}
            >
              会議まとめくん
            </h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: showSettings ? "#667eea" : "var(--card-bg)",
                color: showSettings ? "white" : "var(--text-secondary)",
                border: "1px solid var(--card-border)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap"
              }}
            >
              <Settings style={{ width: 14, height: 14 }} />
              設定
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: showHistory ? "#43e97b" : "var(--card-bg)",
                color: showHistory ? "white" : "var(--text-secondary)",
                border: "1px solid var(--card-border)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <History style={{ width: 14, height: 14 }} />
              履歴 {history.length > 0 && `(${history.length})`}
            </button>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, paddingLeft: 60 }}>
            {loading && processingStage
              ? processingStage
              : loading
              ? "議事録を作成中...（最大60秒程度かかる場合があります）"
              : "議事録とTODOを自動生成"}
          </p>
        </div>

        {/* 設定パネル */}
        {showSettings && (
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "2px solid #667eea",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", margin: "0 0 12px 0" }}>
              ⚙️ 設定
            </h3>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 14,
                color: "var(--foreground)",
              }}
            >
              <input
                type="checkbox"
                checked={autoGenerateSummary}
                onChange={(e) => setAutoGenerateSummary(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span>文字起こし完了後、自動的に議事録を作成する</span>
            </label>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, marginBottom: 0, marginLeft: 26 }}>
              ※ この設定は自動的に保存されます
            </p>
          </div>
        )}

        {/* 履歴パネル */}
        {showHistory && (
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "2px solid #43e97b",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", margin: "0 0 12px 0" }}>
              📜 履歴（最新10件）
            </h3>
            {history.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
                まだ履歴がありません
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setResult(item.summary)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: "var(--background)",
                      border: "1px solid var(--card-border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f1f5f9";
                      e.currentTarget.style.borderColor = "#43e97b";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--background)";
                      e.currentTarget.style.borderColor = "var(--card-border)";
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                      {item.date}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--foreground)", fontWeight: 500 }}>
                      {item.summary.summary.purpose.substring(0, 60)}
                      {item.summary.summary.purpose.length > 60 && "..."}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              会議内容を入力（録音 or テキスト貼り付け） → 「議事録を作成」 → <strong>サマリー・TODO・詳細議事録を出力</strong>
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

            {/* 録音モード選択 */}
            {!isRecording && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => setRecordingMode("microphone")}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: recordingMode === "microphone" ? "#667eea" : "var(--card-bg)",
                    color: recordingMode === "microphone" ? "white" : "var(--text-secondary)",
                    border: `2px solid ${recordingMode === "microphone" ? "#667eea" : "var(--card-border)"}`,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Mic style={{ width: 14, height: 14 }} />
                  マイク
                </button>
                <button
                  onClick={() => setRecordingMode("system")}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: recordingMode === "system" ? "#667eea" : "var(--card-bg)",
                    color: recordingMode === "system" ? "white" : "var(--text-secondary)",
                    border: `2px solid ${recordingMode === "system" ? "#667eea" : "var(--card-border)"}`,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Monitor style={{ width: 14, height: 14 }} />
                  <Mic style={{ width: 14, height: 14 }} />
                  WEB会議
                </button>
              </div>
            )}

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
                  {recordingMode === "microphone" ? (
                    <Mic style={{ width: 16, height: 16 }} />
                  ) : (
                    <>
                      <Monitor style={{ width: 16, height: 16 }} />
                      <Mic style={{ width: 16, height: 16 }} />
                    </>
                  )}
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
                  {recordingMode === "system" && (
                    <button
                      onClick={toggleMicMute}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: isMicMuted ? "#fef3c7" : "#dbeafe",
                        color: isMicMuted ? "#d97706" : "#2563eb",
                        border: `2px solid ${isMicMuted ? "#fcd34d" : "#93c5fd"}`,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {isMicMuted ? (
                        <>
                          <MicOff style={{ width: 14, height: 14 }} />
                          ミュート中
                        </>
                      ) : (
                        <>
                          <Mic style={{ width: 14, height: 14 }} />
                          マイクON
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
            {isTranscribing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <Loader2
                  style={{
                    width: 16,
                    height: 16,
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: 14, color: "#667eea", fontWeight: 600 }}>
                  文字起こし中...
                </span>
              </div>
            )}
            {!isTranscribing && !isRecording && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, marginBottom: 0 }}>
                <p style={{ margin: "0 0 4px 0" }}>
                  <strong>マイク:</strong> マイクから直接録音します（自分の声のみ）
                </p>
                <p style={{ margin: 0 }}>
                  <strong>WEB会議:</strong> システム音声とマイクの両方を録音します（相手＋自分の声）
                  <br />
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    ※ 録音中にミュートボタンで自分の声のON/OFFを切り替えられます
                  </span>
                </p>
              </div>
            )}
            {!isTranscribing && isRecording && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, marginBottom: 0 }}>
                録音停止後、自動的に文字起こしが実行されます
                {autoGenerateSummary && "。その後、議事録を自動作成します"}
              </p>
            )}
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
            会議の内容を入力
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="例: 今日の打ち合わせで、新製品のローンチ日程について話し合いました。田中さんが..."
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
            color: transcript.length > 5000 ? "#d97706" : "var(--text-secondary)"
          }}>
            <span>
              {transcript.length}文字
              {transcript.length > 5000 && " （2段階処理で要約→議事録化します）"}
            </span>
            {transcript.length > 5000 && (
              <span style={{
                padding: "2px 8px",
                background: "#fef3c7",
                color: "#d97706",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 11
              }}>
                2段階処理
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={generateSummary}
              disabled={loading || !transcript.trim()}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background:
                  loading || !transcript.trim()
                    ? "var(--text-tertiary)"
                    : "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
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
              議事録を作成
            </button>

            <button
              onClick={() => {
                setTranscript("");
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
          <>
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
                  📋 会議サマリー
                </h2>
                <button
                  onClick={() => copyToClipboard(getSummaryText(), "summary")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: copiedSection === "summary" ? "#10b981" : "var(--card-bg)",
                    color: copiedSection === "summary" ? "white" : "var(--text-secondary)",
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
                  {copiedSection === "summary" ? (
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

              <div style={{ marginBottom: 16 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  会議の目的
                </h3>
                <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7, margin: 0 }}>
                  {result.summary.purpose}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  主な議論内容
                </h3>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {result.summary.discussions.map((discussion, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 14,
                        color: "var(--foreground)",
                        marginBottom: 6,
                        lineHeight: 1.7,
                      }}
                    >
                      {discussion}
                    </li>
                  ))}
                </ul>
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
                  決定事項
                </h3>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {result.summary.decisions.map((decision, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 14,
                        color: "var(--foreground)",
                        marginBottom: 6,
                        lineHeight: 1.7,
                      }}
                    >
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

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
                  ✅ TODO リスト
                </h2>
                <button
                  onClick={() => copyToClipboard(getTodosText(), "todos")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: copiedSection === "todos" ? "#10b981" : "var(--card-bg)",
                    color: copiedSection === "todos" ? "white" : "var(--text-secondary)",
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
                  {copiedSection === "todos" ? (
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

              <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
                {result.todos
                  .sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                  })
                  .map((todo, i) => {
                    const priority = priorityColors[todo.priority];
                    return (
                      <li
                        key={i}
                        style={{
                          marginBottom: 12,
                          fontSize: 14,
                          color: "var(--foreground)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              background: priority.bg,
                              border: `1px solid ${priority.border}`,
                              color: priority.text,
                              minWidth: 24,
                              textAlign: "center",
                            }}
                          >
                            {priority.label}
                          </span>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 500,
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {todo.assignee}
                          </span>
                          {todo.deadline && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 500,
                                background: "#fef3c7",
                                border: "1px solid #fcd34d",
                                color: "#d97706",
                              }}
                            >
                              {todo.deadline}
                            </span>
                          )}
                        </div>
                        <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                          {todo.task}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>

            <div
              style={{
                background: "var(--card-bg)",
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
                  📝 詳細議事録
                </h2>
                <button
                  onClick={() => copyToClipboard(result.detailedMinutes, "minutes")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: copiedSection === "minutes" ? "#10b981" : "var(--card-bg)",
                    color: copiedSection === "minutes" ? "white" : "var(--text-secondary)",
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
                  {copiedSection === "minutes" ? (
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
                  color: "var(--foreground)",
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {result.detailedMinutes}
              </div>
            </div>
          </>
        )}

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "var(--text-tertiary)",
            textAlign: "center",
          }}
        >
          会議まとめくん - 議事録とTODOを自動生成
        </p>
      </div>
    </div>
  );
}
