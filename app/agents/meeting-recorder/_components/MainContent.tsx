import React, { useRef, useState } from "react";
import { Mic, Monitor, MicOff, Square, MessageSquare, FileUp, Upload, Loader2 } from "lucide-react";
import SectionHeader from "./SectionHeader";
import { MeetingSummary } from "../types";

type Props = {
  loading: boolean;
  transcript: string;
  onTranscriptChange: (text: string) => void;
  result: MeetingSummary | null;
  onSetResult: (result: MeetingSummary | null) => void;
  onError: (error: string | null) => void;
  error: string | null;
  errorDetails: string | null;
  isRecording: boolean;
  recordingMode: "microphone" | "system";
  onSetRecordingMode: (mode: "microphone" | "system") => void;
  recordingTime: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleMicMute: () => void;
  isMicMuted: boolean;
  processingSegments: Set<number>;
  onGenerateSummary: () => void;
  processingStage: string;
  uploadedFileName: string;
  onFileUpload: (file: File) => Promise<void>;
};

const MainContent = ({
  loading,
  transcript,
  onTranscriptChange,
  result,
  onSetResult,
  onError,
  error,
  errorDetails,
  isRecording,
  recordingMode,
  onSetRecordingMode,
  recordingTime,
  onStartRecording,
  onStopRecording,
  onToggleMicMute,
  isMicMuted,
  processingSegments,
  onGenerateSummary,
  processingStage,
  uploadedFileName,
  onFileUpload,
}: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await onFileUpload(files[0]);
    }
  };

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      maxHeight: "calc(100vh - 120px)",
      overflowY: "auto",
    }}>
      {/* 録音セクション */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <SectionHeader
          icon={<Mic style={{ width: 16, height: 16, color: "#ef4444" }} />}
          title="音声録音"
        />

        {!isRecording ? (
          <>
            {/* 録音モード選択 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>録音モードを選択</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onSetRecordingMode("microphone")}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: recordingMode === "microphone" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "var(--background)",
                    color: recordingMode === "microphone" ? "white" : "var(--text-secondary)",
                    border: `2px solid ${recordingMode === "microphone" ? "#667eea" : "var(--card-border)"}`,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s ease",
                  }}
                >
                  <Mic style={{ width: 20, height: 20 }} />
                  <span>マイクのみ</span>
                  <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 400 }}>対面会議・メモ録音</span>
                </button>
                <button
                  onClick={() => onSetRecordingMode("system")}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: recordingMode === "system" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "var(--background)",
                    color: recordingMode === "system" ? "white" : "var(--text-secondary)",
                    border: `2px solid ${recordingMode === "system" ? "#667eea" : "var(--card-border)"}`,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    <Monitor style={{ width: 20, height: 20 }} />
                    <Mic style={{ width: 20, height: 20 }} />
                  </div>
                  <span>WEB会議</span>
                  <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 400 }}>Zoom・Teams・Meet</span>
                </button>
              </div>
            </div>

            {/* 録音開始ボタン */}
            <button
              onClick={onStartRecording}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 10,
                background: loading ? "var(--text-tertiary)" : "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                color: "white",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 15,
                boxShadow: loading ? "none" : "0 4px 12px rgba(239, 68, 68, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <Mic style={{ width: 18, height: 18 }} />
              録音を開始
            </button>
          </>
        ) : (
          <div style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)",
            borderRadius: 10,
            padding: 16,
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}>
            {/* 録音中表示 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ef4444",
                animation: "pulse 1s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: "#ef4444" }}>
                {formatTime(recordingTime)}
              </span>
              <span style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 4,
                background: "#fef2f2",
                color: "#dc2626",
                fontWeight: 600,
              }}>
                録音中
              </span>
            </div>

            {/* コントロールボタン */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                onClick={onStopRecording}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                }}
              >
                <Square style={{ width: 14, height: 14 }} />
                停止して保存
              </button>
              {recordingMode === "system" && (
                <button
                  onClick={onToggleMicMute}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: isMicMuted ? "#fef3c7" : "#dbeafe",
                    color: isMicMuted ? "#d97706" : "#2563eb",
                    border: `1px solid ${isMicMuted ? "#fcd34d" : "#93c5fd"}`,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {isMicMuted ? <MicOff style={{ width: 14, height: 14 }} /> : <Mic style={{ width: 14, height: 14 }} />}
                  {isMicMuted ? "マイクOFF" : "マイクON"}
                </button>
              )}
            </div>

            {/* 処理中表示 */}
            {processingSegments.size > 0 && (
              <div style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 6,
                background: "rgba(14, 165, 233, 0.1)",
                border: "1px solid rgba(14, 165, 233, 0.2)",
                textAlign: "center",
              }}>
                <span style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 500 }}>
                  文字起こし処理中... (セグメント: {Array.from(processingSegments).join(', ')})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* テキスト入力セクション */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: 12,
          padding: 16,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
          accept=".txt,.docx,.mp3,.wav,.m4a,.webm"
          style={{ display: "none" }}
        />
        <SectionHeader
          icon={<MessageSquare style={{ width: 16, height: 16, color: "#10b981" }} />}
          title="会議の内容"
          action={
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                background: "var(--background)",
                color: "var(--text-secondary)",
                border: "1px solid var(--card-border)",
                cursor: "pointer",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <FileUp style={{ width: 12, height: 12 }} />
              ファイル読込
            </button>
          }
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            position: "relative",
            border: isDragging ? "3px dashed #667eea" : "1px solid var(--card-border)",
            borderRadius: 8,
            background: isDragging ? "rgba(102, 126, 234, 0.15)" : "var(--background)",
            flex: 1,
            minHeight: 200,
            transition: "all 0.2s ease",
          }}
        >
          {isDragging && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(102, 126, 234, 0.2)",
              borderRadius: 6,
              zIndex: 10,
            }}>
              <div style={{ textAlign: "center", color: "#667eea" }}>
                <Upload style={{ width: 48, height: 48, marginBottom: 12 }} />
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>ここにファイルをドロップ</p>
                <p style={{ margin: "8px 0 0 0", fontSize: 12, opacity: 0.8 }}>
                  音声ファイル(.mp3, .wav, .m4a) → 自動文字起こし<br />
                  テキストファイル(.txt, .docx) → 内容を自動反映
                </p>
              </div>
            </div>
          )}
          <textarea
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            placeholder={`会議の内容をここに入力または貼り付けてください

ヒント:
  • ファイルをドラッグ＆ドロップできます
  • 音声ファイル(.mp3, .wav, .m4a)
    → 自動で文字起こし
  • テキストファイル(.txt, .docx)
    → 内容を自動反映`}
            style={{
              width: "100%",
              height: "100%",
              minHeight: 200,
              padding: 12,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "var(--foreground)",
              fontSize: 13,
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </div>

        {uploadedFileName && (
          <p style={{ fontSize: 11, color: "#10b981", marginTop: 4, marginBottom: 0 }}>
            ✅ {uploadedFileName} を読み込みました
          </p>
        )}

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          fontSize: 11,
          color: transcript.length > 35000 ? "#dc2626" : "var(--text-secondary)"
        }}>
          <span>{transcript.length.toLocaleString()}文字</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={onGenerateSummary}
            disabled={loading || !transcript.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: loading || !transcript.trim() ? "var(--text-tertiary)" : "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
              color: "white",
              border: "none",
              cursor: loading || !transcript.trim() ? "not-allowed" : "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
            }}
          >
            {loading && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
            議事録を作成
          </button>
          <button
            onClick={() => { onTranscriptChange(""); onSetResult(null); onError(null); }}
            disabled={loading}
            style={{
              fontSize: 12,
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
        <div style={{
          color: "#dc2626",
          fontSize: 13,
          padding: 12,
          background: "#fee2e2",
          borderRadius: 8,
          marginTop: 12,
          border: "1px solid #fecaca",
        }}>
          <div style={{ fontWeight: 600 }}>{error}</div>
          {errorDetails && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 4 }}>{errorDetails}</div>}
        </div>
      )}
    </div>
  );
};

export default MainContent;
