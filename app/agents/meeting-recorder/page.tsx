"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Mic, MicOff, Square, Monitor, Settings, History, Copy, Check, MessageSquare,
  Cloud, CloudOff, Upload, X, FileUp, Plus, Search, ChevronLeft, ChevronRight, ExternalLink, Edit3, Save, RefreshCw
} from "lucide-react";
import BackToHome from "../../components/BackToHome";

// Google Drive関連の型定義
type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
};

type DriveMeeting = {
  folderId: string;
  title: string;
  date: string;
  category?: string;
  files: {
    audio?: DriveFile;
    transcript?: DriveFile;
    minutes?: DriveFile;
    metadata?: DriveFile;
  };
  minutesContent?: string;
  transcriptContent?: string;
};

type Category = {
  id: string;
  name: string;
  color: string;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "all", name: "すべて", color: "#10b981" },
  { id: "general", name: "一般", color: "#6b7280" },
  { id: "basf", name: "BASF", color: "#3b82f6" },
  { id: "sales", name: "営業代行", color: "#f97316" },
  { id: "petline", name: "ペットライン", color: "#8b5cf6" },
];

type MeetingSummary = {
  title?: string; // AIが自動生成するタイトル
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

// カテゴリー追加フォームコンポーネント（パフォーマンス最適化のため分離）
const CategoryAddForm = React.memo(({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) => {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div style={{ display: "flex", gap: 4, width: "100%", marginTop: 4 }}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="カテゴリー名"
        autoFocus
        style={{
          flex: 1,
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid var(--card-border)",
          fontSize: 11,
          background: "var(--background)",
          color: "var(--foreground)",
        }}
        onKeyDown={(e) => {
          // Escapeでキャンセル（Enterでは保存しない）
          if (e.key === "Escape") {
            onCancel();
          }
        }}
      />
      <button
        onClick={handleAdd}
        style={{ padding: "4px 8px", borderRadius: 4, background: "#10b981", color: "white", border: "none", cursor: "pointer", fontSize: 11 }}
      >
        追加
      </button>
      <button
        onClick={onCancel}
        style={{ padding: "4px 6px", borderRadius: 4, background: "var(--background)", color: "var(--text-secondary)", border: "1px solid var(--card-border)", cursor: "pointer" }}
      >
        <X style={{ width: 10, height: 10 }} />
      </button>
    </div>
  );
});
CategoryAddForm.displayName = "CategoryAddForm";

// セクションヘッダーコンポーネント
const SectionHeader = ({ icon, title, count, action }: { icon: React.ReactNode; title: string; count?: number; action?: React.ReactNode }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid var(--card-border)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
      {count !== undefined && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--background)", padding: "2px 8px", borderRadius: 10 }}>
          {count}件
        </span>
      )}
    </div>
    {action}
  </div>
);

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
  const [, setProcessingTime] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingSummary | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_audioChunks, _setAudioChunks] = useState<Blob[]>([]);
  const [recordingMode, setRecordingMode] = useState<"microphone" | "system">("microphone");
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [micGainNode, setMicGainNode] = useState<GainNode | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [autoGenerateSummary, setAutoGenerateSummary] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; date: string; title?: string; summary: MeetingSummary; category?: string; highlight?: string }>>([]);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [, setSegmentNumber] = useState<number>(0);
  const [, setActiveStream] = useState<MediaStream | null>(null);
  const [currentAudioChunks, setCurrentAudioChunks] = useState<Blob[]>([]);
  const [processingSegments, setProcessingSegments] = useState<Set<number>>(new Set());
  const [recommendedWaitMs, setRecommendedWaitMs] = useState<number>(15000);
  const isManualStopRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Google Drive連携用state
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
  const [, setDriveLoading] = useState<boolean>(false);
  const [driveMeetings, setDriveMeetings] = useState<DriveMeeting[]>([]);
  const [uploadingToDrive, setUploadingToDrive] = useState<boolean>(false);
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);
  const [loadingFromDrive, setLoadingFromDrive] = useState<boolean>(false);

  // カテゴリー用state
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAddCategory, setShowAddCategory] = useState<boolean>(false);

  // ファイルアップロード用state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 編集モード用state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // PC/モバイル判定
  const [isMobile, setIsMobile] = useState<boolean>(true);

  // 検索用state
  const [searchQuery, setSearchQuery] = useState<string>("");

  // カレンダー用state
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

    const savedCategories = localStorage.getItem("meetingCategories");
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories));
      } catch (e) {
        console.error("カテゴリーの読み込みに失敗:", e);
      }
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isRecording && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('🔒 Wake Lock 再取得（画面復帰）');
        } catch (err) {
          console.warn('⚠️ Wake Lock 再取得失敗:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecording]);

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

  // カテゴリーをLocalStorageに保存
  useEffect(() => {
    localStorage.setItem("meetingCategories", JSON.stringify(categories));
  }, [categories]);

  // transcriptが変更されたら前回の結果をクリア
  useEffect(() => {
    if (result !== null) {
      setResult(null);
      setError(null);
      setErrorDetails(null);
      setProcessingTime(null);
    }
  }, [transcript]);

  // セグメントを文字起こしする関数
  async function transcribeSegment(audioBlob: Blob, segmentNum: number): Promise<void> {
    console.log(`🎤 セグメント ${segmentNum} の文字起こし開始 (${audioBlob.size} bytes, type: ${audioBlob.type})`);

    setProcessingSegments(prev => new Set(prev).add(segmentNum));

    const maxRetries = 5;
    let lastError: Error | null = null;

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob);

          console.log(`📤 セグメント ${segmentNum} を送信中... (試行${attempt}/${maxRetries}, ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`);

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          console.log(`📥 セグメント ${segmentNum} のレスポンス: status=${response.status}, ok=${response.ok} (試行${attempt}/${maxRetries})`);

          if (!response.ok) {
            let errorMessage = "文字起こしに失敗しました";
            let errorDetails = "";
            try {
              const errorData = await response.json();
              console.error(`❌ セグメント ${segmentNum} エラーレスポンス (試行${attempt}/${maxRetries}):`, errorData);
              if (errorData.error) {
                const detailsMsg = errorData.details ? ` [詳細: ${errorData.details}]` : '';
                errorMessage = `セグメント ${segmentNum} の文字起こしエラー: ${errorData.error}${detailsMsg}`;
                errorDetails = JSON.stringify(errorData);
              }
              if (errorData.recommendedWaitMs) {
                setRecommendedWaitMs(errorData.recommendedWaitMs);
                console.log(`⚠️ エラー後の推奨待機時間: ${errorData.recommendedWaitMs}ms`);
              }
            } catch (parseError) {
              console.error(`❌ セグメント ${segmentNum} エラーレスポンスのパース失敗 (試行${attempt}/${maxRetries}):`, parseError);
              errorMessage = `セグメント ${segmentNum} の文字起こしに失敗 (${response.status})`;
            }
            const error = new Error(errorMessage);
            (error as any).details = errorDetails;
            lastError = error;

            if (response.status >= 500 && attempt < maxRetries) {
              const backoffSeconds = Math.min(10 * Math.pow(2, attempt - 1), 60);
              console.log(`⏳ セグメント ${segmentNum} をリトライ中... (${attempt}/${maxRetries}、${backoffSeconds}秒後に再試行)`);
              await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
              continue;
            }

            throw error;
          }

          const data = await response.json();

          if (data.recommendedWaitMs) {
            setRecommendedWaitMs(data.recommendedWaitMs);
            console.log(`⏱️ 次回推奨待機時間: ${data.recommendedWaitMs}ms`);
          }

          if (!data.transcription || data.transcription.trim() === "") {
            console.warn(`⚠️ セグメント ${segmentNum} は音声が認識できませんでした`);
            return;
          }

          const newTranscript = data.transcription;
          setTranscript((prev) => {
            const separator = prev ? "\n\n" : "";
            return prev + separator + `[セグメント ${segmentNum}]\n${newTranscript}`;
          });

          console.log(`✅ セグメント ${segmentNum} の文字起こし完了 (試行${attempt}回目で成功)`);

          setProcessingSegments(prev => {
            const newSet = new Set(prev);
            newSet.delete(segmentNum);
            return newSet;
          });

          return;
        } catch (err) {
          console.error(`❌ セグメント ${segmentNum} の文字起こしエラー (試行${attempt}/${maxRetries}):`, err);
          lastError = err instanceof Error ? err : new Error(`セグメント ${segmentNum} の文字起こし中にエラーが発生しました`);

          if (attempt < maxRetries) {
            const backoffSeconds = Math.min(10 * Math.pow(2, attempt - 1), 60);
            console.log(`⏳ セグメント ${segmentNum} をリトライ中... (${attempt}/${maxRetries}、${backoffSeconds}秒後に再試行)`);
            await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
            continue;
          }
        }
      }

      console.error(`❌ セグメント ${segmentNum} の文字起こしに失敗しました (${maxRetries}回試行)`);
      setError(
        lastError instanceof Error
          ? lastError.message
          : `セグメント ${segmentNum} の文字起こし中にエラーが発生しました`
      );
    } catch (err) {
      console.error(`❌ セグメント ${segmentNum} で予期しないエラー:`, err);
    } finally {
      setProcessingSegments(prev => {
        const newSet = new Set(prev);
        newSet.delete(segmentNum);
        return newSet;
      });
    }
  }

  async function startRecording(): Promise<void> {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

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

      let stream: MediaStream;

      if (recordingMode === "microphone") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const systemStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        const videoTracks = systemStream.getVideoTracks();
        videoTracks.forEach((track: MediaStreamTrack) => track.stop());

        const systemAudioTracks = systemStream.getAudioTracks();
        if (systemAudioTracks.length === 0) {
          console.warn('⚠️ システム音声が含まれていません。画面共有時に「システム音声を共有」を選択してください。');
          setError('システム音声が取得できませんでした。画面共有時に「システム音声を共有」にチェックを入れてください。');
          micStream.getTracks().forEach(track => track.stop());
          return;
        }
        console.log(`✅ システム音声トラック取得: ${systemAudioTracks.length}個`);

        const audioContext = new AudioContext();
        const systemSource = audioContext.createMediaStreamSource(systemStream);
        const destination = audioContext.createMediaStreamDestination();

        systemSource.connect(destination);

        const micSource = audioContext.createMediaStreamSource(micStream);
        const micGain = audioContext.createGain();
        micSource.connect(micGain);
        micGain.connect(destination);

        setMicGainNode(micGain);

        (destination.stream as any)._micStream = micStream;
        (destination.stream as any)._systemStream = systemStream;

        stream = destination.stream;
      }

      setActiveStream(stream);
      setSegmentNumber(0);
      setCurrentAudioChunks([]);

      let currentRecorder: MediaRecorder | null = null;
      let allChunks: Blob[] = [];
      let currentSegmentNum = 0;

      const initRecorder = () => {
        const newRecorder = new MediaRecorder(stream);
        const segmentChunks: Blob[] = [];

        newRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            console.log(`📊 データ受信: ${e.data.size} bytes (${(e.data.size / 1024 / 1024).toFixed(2)} MB)`);
            segmentChunks.push(e.data);
            allChunks.push(e.data);
            setCurrentAudioChunks([...allChunks]);
          }
        };

        newRecorder.onstop = async () => {
          if (isManualStopRef.current) {
            console.log(`🛑 録音停止 - 最終処理開始`);

            if (segmentChunks.length > 0) {
              currentSegmentNum += 1;
              const audioBlob = new Blob(segmentChunks, { type: "audio/webm" });
              console.log(`🎬 最終セグメント ${currentSegmentNum} を文字起こし開始 (${audioBlob.size} bytes)`);

              if (currentSegmentNum > 1) {
                const waitMs = Math.max(recommendedWaitMs, 15000);
                console.log(`⏱️  最終セグメント: Rate limit対策で${waitMs / 1000}秒待機`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
              }

              await transcribeSegment(audioBlob, currentSegmentNum);
            }

            stream.getTracks().forEach((track) => track.stop());
            setActiveStream(null);

            if (autoGenerateSummary) {
              setTimeout(() => {
                generateSummary();
              }, 3000);
            }
          } else {
            console.log(`🔄 セグメント完了 - 文字起こしして再起動`);

            if (segmentChunks.length > 0 && stream.active) {
              currentSegmentNum += 1;
              const audioBlob = new Blob(segmentChunks, { type: "audio/webm" });
              console.log(`🎬 セグメント ${currentSegmentNum} を文字起こし開始 (${audioBlob.size} bytes, ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`);

              if (currentSegmentNum > 1) {
                const waitMs = Math.max(recommendedWaitMs, 15000);
                console.log(`⏱️  セグメント ${currentSegmentNum}: Rate limit対策で${waitMs / 1000}秒待機`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
              }

              transcribeSegment(audioBlob, currentSegmentNum);
              setSegmentNumber(currentSegmentNum);

              if (stream.active) {
                console.log(`▶️  セグメント ${currentSegmentNum + 1} の録音開始`);
                currentRecorder = initRecorder();
                currentRecorder.start();
                setMediaRecorder(currentRecorder);
              }
            }
          }
        };

        return newRecorder;
      };

      isManualStopRef.current = false;
      currentRecorder = initRecorder();
      currentRecorder.start();
      setMediaRecorder(currentRecorder);
      setIsRecording(true);
      setError(null);

      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;

          if (newTime > 0 && newTime % 150 === 0 && currentRecorder?.state === "recording") {
            console.log(`⏰ ${(newTime / 60).toFixed(1)}分経過 - セグメント区切り`);
            isManualStopRef.current = false;
            currentRecorder.stop();
          }

          return newTime;
        });
      }, 1000);
      setRecordingInterval(interval);
    } catch (err) {
      setError("マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。");
      console.error(err);
    }
  }

  function stopRecording(): void {
    if (mediaRecorder && isRecording) {
      isManualStopRef.current = true;

      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      setIsMicMuted(false);
      setMicGainNode(null);

      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }

      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          console.log('🔓 Wake Lock 手動解除');
          wakeLockRef.current = null;
        });
      }

      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
        console.log('🔇 無音オーディオ停止');
      }

      const stream = mediaRecorder.stream;
      if ((stream as any)._micStream) {
        (stream as any)._micStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      if ((stream as any)._systemStream) {
        (stream as any)._systemStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    }
  }

  function toggleMicMute(): void {
    if (micGainNode) {
      const newMutedState = !isMicMuted;
      setIsMicMuted(newMutedState);
      micGainNode.gain.value = newMutedState ? 0 : 1;
      console.log(`🎤 マイク ${newMutedState ? 'ミュート' : 'オン'}（システム音声は録音継続中）`);
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
    } catch (err) {
      console.error("コピーに失敗:", err);
    }
  }

  function getSummaryText(): string {
    if (!result) return "";
    const { summary } = result;
    return `【会議の目的】\n${summary.purpose}\n\n【主な議論内容】\n${summary.discussions.map(d => d).join("\n")}\n\n【決定事項】\n${summary.decisions.map(d => d).join("\n")}`;
  }

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

  const checkDriveConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/drive/list?limit=1");
      if (res.ok) {
        setIsDriveConnected(true);
        return true;
      }
      setIsDriveConnected(false);
      return false;
    } catch {
      setIsDriveConnected(false);
      return false;
    }
  }, []);

  const loadDriveMeetings = useCallback(async () => {
    setDriveLoading(true);
    try {
      const res = await fetch("/api/drive/list?limit=50");
      if (res.ok) {
        const data = await res.json();
        const meetings = data.meetings || [];
        setDriveMeetings(meetings);
        setIsDriveConnected(true);
      } else {
        const errorData = await res.json();
        if (errorData.needsAuth) {
          setIsDriveConnected(false);
        }
      }
    } catch (err) {
      console.error("Drive一覧取得エラー:", err);
    } finally {
      setDriveLoading(false);
    }
  }, []);

  // Driveから議事録を読み込む関数
  const loadMeetingFromDrive = async (folderId: string) => {
    setLoadingFromDrive(true);
    try {
      const res = await fetch(`/api/drive/list?folderId=${folderId}`);
      if (res.ok) {
        const data = await res.json();
        const meeting = data.meeting;
        if (meeting) {
          // メタデータから議事録を復元
          if (meeting.metadata) {
            const metadata = meeting.metadata;
            setResult({
              title: meeting.title || "",
              summary: metadata.summary || { purpose: "", discussions: [], decisions: [] },
              todos: metadata.todos || [],
              detailedMinutes: meeting.minutes || "",
            });
            if (metadata.category) {
              setSelectedCategory(metadata.category);
            }
          }
          // トランスクリプトを復元
          if (meeting.transcript) {
            setTranscript(meeting.transcript);
          }
          // フォルダIDを保存（更新用）
          setSavedFolderId(folderId);
          console.log("✅ Driveから議事録を読み込みました:", meeting.title);
        }
      }
    } catch (err) {
      console.error("Drive読み込みエラー:", err);
      setError("Driveからの読み込みに失敗しました");
    } finally {
      setLoadingFromDrive(false);
    }
  };

  // Driveから会議を削除する関数
  const deleteMeetingFromDrive = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("この会議をGoogle Driveから削除しますか？\n（ゴミ箱に移動されます）")) {
      return;
    }

    try {
      const res = await fetch("/api/drive/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });

      if (res.ok) {
        // リストから削除
        setDriveMeetings(prev => prev.filter(m => m.folderId !== folderId));
        // 現在表示中の会議だった場合はクリア
        if (savedFolderId === folderId) {
          setSavedFolderId(null);
        }
        console.log("✅ Driveから会議を削除しました");
      } else {
        const data = await res.json();
        setError(data.error || "削除に失敗しました");
      }
    } catch (err) {
      console.error("Drive削除エラー:", err);
      setError("削除に失敗しました");
    }
  };

  const uploadToDrive = async (title: string, category: string, summaryData?: MeetingSummary) => {
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }

    // summaryDataが渡されればそちらを使用、なければresultを使用
    const dataToUpload = summaryData || result;

    setUploadingToDrive(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("transcript", transcript);

      if (dataToUpload) {
        formData.append("minutes", dataToUpload.detailedMinutes);
        formData.append("metadata", JSON.stringify({
          category,
          summary: dataToUpload.summary,
          todos: dataToUpload.todos,
          createdAt: new Date().toISOString(),
        }));
      }

      // 録音した音声があればそちらを優先、なければアップロードした音声ファイル
      if (currentAudioChunks.length > 0) {
        const audioBlob = new Blob(currentAudioChunks, { type: "audio/webm" });
        formData.append("audio", audioBlob, "recording.webm");
      } else if (uploadedAudioFile) {
        formData.append("audio", uploadedAudioFile, uploadedAudioFile.name);
      }

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Google Driveにアップロード完了:", data.folderId);
        setSavedFolderId(data.folderId);
        await loadDriveMeetings();
        // ローカル履歴（下書き）をクリア
        setHistory([]);
        setMeetingTitle("");
        setSelectedCategory("general");
      } else {
        const errorData = await res.json();
        setError(errorData.error || "アップロードに失敗しました");
      }
    } catch (err) {
      console.error("アップロードエラー:", err);
      setError("アップロード中にエラーが発生しました");
    } finally {
      setUploadingToDrive(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileName = file.name.toLowerCase();
    setUploadedFileName(file.name);

    try {
      if (fileName.endsWith(".txt")) {
        const text = await file.text();
        setTranscript(prev => prev + (prev ? "\n\n" : "") + text);
      } else if (fileName.endsWith(".docx")) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setTranscript(prev => prev + (prev ? "\n\n" : "") + data.text);
        }
      } else if (fileName.endsWith(".mp3") || fileName.endsWith(".wav") || fileName.endsWith(".m4a") || fileName.endsWith(".webm")) {
        // アップロードした音声ファイルを保存（Drive連携用）
        setUploadedAudioFile(file);

        const formData = new FormData();
        formData.append("audio", file);
        setProcessingStage("音声ファイルを文字起こし中...");
        setLoading(true);
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setTranscript(prev => prev + (prev ? "\n\n" : "") + data.transcription);
        }
        setLoading(false);
        setProcessingStage("");
      }
    } catch (err) {
      console.error("ファイル処理エラー:", err);
      setError("ファイルの処理に失敗しました");
    }
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
      await handleFileUpload(files[0]);
    }
  };

  const addCategory = useCallback((name: string) => {
    if (!name.trim()) return;
    const colors = ["#667eea", "#43e97b", "#fa709a", "#f59e0b", "#06b6d4", "#8b5cf6"];
    const newCategory: Category = {
      id: Date.now().toString(),
      name: name.trim(),
      color: colors[categories.length % colors.length],
    };
    setCategories(prev => [...prev, newCategory]);
    setShowAddCategory(false);
  }, [categories.length]);

  // PC/モバイル判定用useEffect
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Drive接続チェック＆自動読み込み用useEffect
  useEffect(() => {
    const initializeDrive = async () => {
      const connected = await checkDriveConnection();
      if (connected) {
        // Drive一覧を取得
        await loadDriveMeetings();
      }
    };
    initializeDrive();
  }, [checkDriveConnection, loadDriveMeetings]);

  // カレンダーヘルパー関数
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatCalendarDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

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

      if (!data || !data.summary || !data.todos || !data.detailedMinutes) {
        setError("議事録データが不完全です。");
        setErrorDetails("もう一度お試しください。");
        return;
      }

      setResult(data);

      // ハイライトを生成（会議の目的の最初の50文字）
      const highlight = data.summary?.purpose?.substring(0, 50) + (data.summary?.purpose?.length > 50 ? "..." : "") || "";

      const newHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString("ja-JP"),
        title: data.title || meetingTitle || undefined,
        summary: data,
        category: selectedCategory,
        highlight,
      };
      setHistory((prev) => [newHistoryItem, ...prev].slice(0, 10));

      // Drive接続済みの場合、保存準備完了をログ出力（手動保存に変更）
      if (isDriveConnected && data.title) {
        console.log("📋 議事録作成完了。Driveへの保存準備OK:", data.title);
        console.log("📁 音声ファイル:", currentAudioChunks.length > 0 ? "録音あり" : uploadedAudioFile ? "アップロードあり" : "なし");
        // カテゴリーを選択してから「Driveに保存」ボタンで保存
      }
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

  // 履歴アイテムを削除
  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  // カテゴリー削除関数
  const deleteCategory = (categoryId: string) => {
    // デフォルトカテゴリー（all, general）は削除不可
    if (categoryId === "all" || categoryId === "general") return;
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    // 削除したカテゴリーで絞り込んでいた場合はリセット
    if (filterCategory === categoryId) {
      setFilterCategory("all");
    }
  };

  // 統合された履歴リスト（Drive + ローカル）
  const combinedHistory = React.useMemo(() => {
    // Drive会議をリストアイテム形式に変換
    const driveItems = driveMeetings.map(meeting => ({
      id: `drive-${meeting.folderId}`,
      folderId: meeting.folderId,
      date: meeting.date,
      title: meeting.title,
      category: meeting.category,
      isDrive: true,
      summary: null as MeetingSummary | null,
    }));

    // ローカル履歴をリストアイテム形式に変換
    const localItems = history.map(item => ({
      id: item.id,
      folderId: null as string | null,
      date: item.date,
      title: item.title || item.summary.title || "無題",
      category: item.category,
      isDrive: false,
      summary: item.summary,
      highlight: item.highlight,
    }));

    // 両方を結合して日付でソート
    return [...driveItems, ...localItems].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [driveMeetings, history]);

  // フィルターされた統合履歴
  const filteredCombinedHistory = combinedHistory.filter(item => {
    const matchesSearch = !searchQuery ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === "all" || item.category === filterCategory;

    const matchesDate = !selectedDate || (() => {
      const itemDate = new Date(item.date);
      return itemDate.toDateString() === selectedDate.toDateString();
    })();

    return matchesSearch && matchesCategory && matchesDate;
  });

  // 履歴の日付マーカー用（統合版）
  const combinedHistoryDates = new Set(combinedHistory.map(item => new Date(item.date).toDateString()));

  // サイドバーコンポーネント
  const Sidebar = () => (
    <div style={{
      width: 280,
      flexShrink: 0,
      background: "var(--card-bg)",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      maxHeight: "calc(100vh - 120px)",
    }}>
      {/* 履歴セクション（スクロール可能エリア） */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <SectionHeader
          icon={<History style={{ width: 16, height: 16, color: "#667eea" }} />}
          title="履歴"
          count={filteredCombinedHistory.length}
          action={
            isDriveConnected && (
              <button
                onClick={() => loadDriveMeetings()}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "1px solid var(--card-border)",
                  background: "var(--background)",
                  color: "var(--text-secondary)",
                  fontSize: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <RefreshCw style={{ width: 10, height: 10 }} />
                更新
              </button>
            )
          }
        />

        {/* 検索 */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search style={{
            width: 14,
            height: 14,
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-tertiary)"
          }} />
          <input
            type="text"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 8px 8px 32px",
              borderRadius: 6,
              border: "1px solid var(--card-border)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: 13,
            }}
          />
        </div>

        {/* カテゴリーフィルター */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              style={{
                position: "relative",
                display: "inline-flex",
              }}
            >
              <button
                onClick={() => setFilterCategory(cat.id)}
                style={{
                  padding: "4px 8px",
                  paddingRight: cat.id !== "all" && cat.id !== "general" ? 20 : 8,
                  borderRadius: 4,
                  background: filterCategory === cat.id ? cat.color : "var(--background)",
                  color: filterCategory === cat.id ? "white" : "var(--text-secondary)",
                  border: "1px solid var(--card-border)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {cat.name}
              </button>
              {cat.id !== "all" && cat.id !== "general" && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                  style={{
                    position: "absolute",
                    right: 2,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 14,
                    height: 14,
                    padding: 0,
                    borderRadius: "50%",
                    background: filterCategory === cat.id ? "rgba(255,255,255,0.3)" : "var(--card-border)",
                    color: filterCategory === cat.id ? "white" : "var(--text-tertiary)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                  }}
                  title="カテゴリーを削除"
                >
                  <X style={{ width: 8, height: 8 }} />
                </button>
              )}
            </div>
          ))}
          {!showAddCategory ? (
            <button
              onClick={() => setShowAddCategory(true)}
              style={{
                padding: "4px 6px",
                borderRadius: 4,
                background: "var(--background)",
                color: "var(--text-secondary)",
                border: "1px dashed var(--card-border)",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              <Plus style={{ width: 10, height: 10 }} />
            </button>
          ) : (
            <CategoryAddForm
              onAdd={addCategory}
              onCancel={() => setShowAddCategory(false)}
            />
          )}
        </div>

        {/* 統合履歴リスト */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", minHeight: 0 }}>
          {filteredCombinedHistory.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, textAlign: "center", padding: 8 }}>
              履歴がありません
            </p>
          ) : (
            filteredCombinedHistory.map((item) => {
              const itemCategory = categories.find(c => c.id === item.category) || categories.find(c => c.id === "general");
              const categoryColor = itemCategory?.color || "#6b7280";
              const isActive = item.isDrive ? savedFolderId === item.folderId : false;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.isDrive && item.folderId) {
                      loadMeetingFromDrive(item.folderId);
                    } else if (item.summary) {
                      setResult(item.summary);
                    }
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: isActive ? "rgba(66, 133, 244, 0.1)" : "var(--background)",
                    borderLeft: `4px solid ${categoryColor}`,
                    border: "1px solid var(--card-border)",
                    borderLeftWidth: 4,
                    borderLeftColor: categoryColor,
                    cursor: loadingFromDrive ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {item.isDrive && (
                        <Cloud style={{ width: 12, height: 12, color: "#4285f4", flexShrink: 0 }} />
                      )}
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {item.date}
                      </div>
                      {itemCategory && itemCategory.id !== "all" && (
                        <span style={{
                          fontSize: 9,
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: categoryColor,
                          color: "white",
                          fontWeight: 500,
                        }}>
                          {itemCategory.name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                      {item.title || "無題"}
                    </div>
                  </div>
                  {isActive && (
                    <Check style={{ width: 14, height: 14, color: "#10b981", flexShrink: 0 }} />
                  )}
                  <button
                    onClick={(e) => {
                      if (item.isDrive && item.folderId) {
                        deleteMeetingFromDrive(item.folderId, e);
                      } else {
                        e.stopPropagation();
                        deleteHistoryItem(item.id);
                      }
                    }}
                    style={{
                      padding: 4,
                      borderRadius: 4,
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                    title={item.isDrive ? "Driveから削除" : "履歴から削除"}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* カレンダー（固定位置） */}
      <div style={{
        borderTop: "1px solid var(--card-border)",
        paddingTop: 16,
        marginTop: 16,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button
            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
            style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            {formatCalendarDate(calendarDate)}
          </span>
          <button
            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
            style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {["日", "月", "火", "水", "木", "金", "土"].map(day => (
            <div key={day} style={{
              textAlign: "center",
              fontSize: 10,
              color: day === "日" ? "#ef4444" : day === "土" ? "#3b82f6" : "var(--text-secondary)",
              padding: "4px 0"
            }}>
              {day}
            </div>
          ))}
          {Array.from({ length: getFirstDayOfMonth(calendarDate.getFullYear(), calendarDate.getMonth()) }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth()) }).map((_, i) => {
            const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i + 1);
            const hasHistory = combinedHistoryDates.has(date.toDateString());
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();
            const dayOfWeek = date.getDay();

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                style={{
                  padding: "4px 0",
                  borderRadius: 4,
                  background: isSelected ? "#667eea" : isToday ? "#f1f5f9" : "transparent",
                  color: isSelected ? "white" : dayOfWeek === 0 ? "#ef4444" : dayOfWeek === 6 ? "#3b82f6" : "var(--foreground)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: isToday ? 600 : 400,
                  position: "relative",
                }}
              >
                {i + 1}
                {hasHistory && !isSelected && (
                  <div style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#10b981",
                  }} />
                )}
              </button>
            );
          })}
        </div>
        {selectedDate && (
          <button
            onClick={() => setSelectedDate(null)}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "4px 8px",
              borderRadius: 4,
              background: "var(--background)",
              color: "var(--text-secondary)",
              border: "1px solid var(--card-border)",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            日付フィルタをクリア
          </button>
        )}
      </div>
    </div>
  );

  // メインコンテンツ（入力部分）
  const MainContent = () => (
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
                  onClick={() => setRecordingMode("microphone")}
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
                  onClick={() => setRecordingMode("system")}
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
              onClick={startRecording}
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
                onClick={stopRecording}
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
                  onClick={toggleMicMute}
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
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
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
            onChange={(e) => setTranscript(e.target.value)}
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
            onClick={generateSummary}
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
            onClick={() => { setTranscript(""); setResult(null); setError(null); }}
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

  // 結果表示コンポーネント
  const ResultPanel = () => {
    return (
      <div style={{
        flex: 1.5,
        minWidth: 450,
        background: "var(--card-bg)",
        borderRadius: 12,
        padding: 16,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}>
        {/* セクションヘッダー（常に表示） */}
        <SectionHeader
          icon={<MessageSquare style={{ width: 16, height: 16, color: "#fa709a" }} />}
          title="議事録"
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", color: "#667eea", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{processingStage || "処理中..."}</p>
          </div>
        ) : !result ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>
            <MessageSquare style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>議事録がここに表示されます</p>
            <p style={{ fontSize: 12, margin: "8px 0 0 0" }}>音声を録音するか、テキストを入力して<br />「議事録を作成」をクリックしてください</p>
          </div>
        ) : (
          <>
            {/* タイトルとハイライト表示（編集モード対応） */}
            <div style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(254, 225, 64, 0.1) 100%)",
              borderRadius: 8,
              border: "1px solid rgba(250, 112, 154, 0.2)",
            }}>
              {isEditMode ? (
                <input
                  type="text"
                  value={result.title || ""}
                  onChange={(e) => setResult({ ...result, title: e.target.value })}
                  placeholder="会議タイトルを入力"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    background: "var(--background)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--foreground)",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  {result.title || "会議議事録"}
                </h2>
              )}
              {result.summary?.purpose && !isEditMode && (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0 0", lineHeight: 1.4 }}>
                  {result.summary.purpose.substring(0, 80)}{result.summary.purpose.length > 80 ? "..." : ""}
                </p>
              )}
            </div>

            {/* アクションボタンバー（統合） */}
            <div style={{
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: "1px solid var(--card-border)",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}>
              {/* 編集/保存モード切替 */}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  background: isEditMode ? "#10b981" : "var(--background)",
                  color: isEditMode ? "white" : "var(--text-secondary)",
                  border: "1px solid var(--card-border)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isEditMode ? (
                  <>
                    <Save style={{ width: 14, height: 14 }} />
                    内容を保存
                  </>
                ) : (
                  <>
                    <Edit3 style={{ width: 14, height: 14 }} />
                    編集モード
                  </>
                )}
              </button>

              {/* すべてコピー */}
              <button
                onClick={() => {
                  const allText = `【会議タイトル】\n${result.title || "無題"}\n\n${getSummaryText()}\n\n【TODOリスト】\n${getTodosText()}\n\n【詳細議事録】\n${result.detailedMinutes}`;
                  copyToClipboard(allText, "all");
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  background: copiedSection === "all" ? "#10b981" : "var(--background)",
                  color: copiedSection === "all" ? "white" : "var(--text-secondary)",
                  border: "1px solid var(--card-border)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {copiedSection === "all" ? (
                  <>
                    <Check style={{ width: 14, height: 14 }} />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy style={{ width: 14, height: 14 }} />
                    すべてコピー
                  </>
                )}
              </button>

              {/* Drive保存（接続時のみ） */}
              {isDriveConnected && (
                <>
                  {/* カテゴリー選択 */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--card-border)",
                      background: "var(--background)",
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  >
                    {categories.filter(c => c.id !== "all").map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  {/* Drive保存/更新ボタン */}
                  <button
                    onClick={() => uploadToDrive(result.title || meetingTitle || "", selectedCategory, result)}
                    disabled={uploadingToDrive || !result.title}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 6,
                      background: uploadingToDrive || !result.title
                        ? "var(--text-tertiary)"
                        : savedFolderId ? "#10b981" : "#4285f4",
                      color: "white",
                      border: "none",
                      cursor: uploadingToDrive || !result.title ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {uploadingToDrive ? (
                      <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    ) : (
                      <Cloud style={{ width: 14, height: 14 }} />
                    )}
                    {uploadingToDrive ? "保存中..." : savedFolderId ? "Driveを更新" : "Driveに保存"}
                  </button>

                  {/* フォルダーを開く（保存済みの場合） */}
                  {savedFolderId && (
                    <button
                      onClick={() => window.open(`https://drive.google.com/drive/folders/${savedFolderId}`, "_blank")}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 6,
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <ExternalLink style={{ width: 14, height: 14 }} />
                      フォルダーを開く
                    </button>
                  )}
                </>
              )}
            </div>

            {/* 会議の目的 */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>会議の目的</h3>
              {isEditMode ? (
                <textarea
                  value={result.summary.purpose}
                  onChange={(e) => setResult({
                    ...result,
                    summary: { ...result.summary, purpose: e.target.value }
                  })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    background: "var(--background)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    minHeight: 60,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>
                  {result.summary.purpose}
                </p>
              )}
            </div>

            {/* 主な議論内容 */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>主な議論内容</h3>
              {isEditMode ? (
                <textarea
                  value={result.summary.discussions.join("\n")}
                  onChange={(e) => setResult({
                    ...result,
                    summary: { ...result.summary, discussions: e.target.value.split("\n").filter(d => d.trim()) }
                  })}
                  placeholder="1行に1項目ずつ入力"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    background: "var(--background)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    minHeight: 80,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {result.summary.discussions.map((d, i) => (
                    <li key={i} style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 4, lineHeight: 1.6 }}>{d}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* 決定事項 */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>決定事項</h3>
              {isEditMode ? (
                <textarea
                  value={result.summary.decisions.join("\n")}
                  onChange={(e) => setResult({
                    ...result,
                    summary: { ...result.summary, decisions: e.target.value.split("\n").filter(d => d.trim()) }
                  })}
                  placeholder="1行に1項目ずつ入力"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    background: "var(--background)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    minHeight: 80,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {result.summary.decisions.map((d, i) => (
                    <li key={i} style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 4, lineHeight: 1.6 }}>{d}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* TODOリスト */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>TODOリスト</h3>
              {isEditMode ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.todos.sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return order[a.priority] - order[b.priority];
                  }).map((todo, i) => {
                    const p = priorityColors[todo.priority];
                    return (
                      <div key={i} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px",
                        background: "var(--background)",
                        borderRadius: 6,
                        border: "1px solid var(--card-border)",
                      }}>
                        <select
                          value={todo.priority}
                          onChange={(e) => {
                            const newTodos = [...result.todos];
                            newTodos[i] = { ...todo, priority: e.target.value as "high" | "medium" | "low" };
                            setResult({ ...result, todos: newTodos });
                          }}
                          style={{
                            padding: "4px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            background: p.bg,
                            border: `1px solid ${p.border}`,
                            color: p.text,
                            cursor: "pointer",
                          }}
                        >
                          <option value="high">高</option>
                          <option value="medium">中</option>
                          <option value="low">低</option>
                        </select>
                        <input
                          type="text"
                          value={todo.assignee}
                          onChange={(e) => {
                            const newTodos = [...result.todos];
                            newTodos[i] = { ...todo, assignee: e.target.value };
                            setResult({ ...result, todos: newTodos });
                          }}
                          placeholder="担当者"
                          style={{
                            width: 70,
                            padding: "4px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            background: "#f1f5f9",
                            border: "1px solid var(--card-border)",
                            color: "var(--text-secondary)",
                          }}
                        />
                        <input
                          type="text"
                          value={todo.deadline || ""}
                          onChange={(e) => {
                            const newTodos = [...result.todos];
                            newTodos[i] = { ...todo, deadline: e.target.value || undefined };
                            setResult({ ...result, todos: newTodos });
                          }}
                          placeholder="期限"
                          style={{
                            width: 80,
                            padding: "4px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            background: "#fef3c7",
                            border: "1px solid #fcd34d",
                            color: "#d97706",
                          }}
                        />
                        <input
                          type="text"
                          value={todo.task}
                          onChange={(e) => {
                            const newTodos = [...result.todos];
                            newTodos[i] = { ...todo, task: e.target.value };
                            setResult({ ...result, todos: newTodos });
                          }}
                          placeholder="タスク内容"
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            border: "1px solid var(--card-border)",
                            background: "white",
                          }}
                        />
                        <button
                          onClick={() => {
                            const newTodos = result.todos.filter((_, idx) => idx !== i);
                            setResult({ ...result, todos: newTodos });
                          }}
                          style={{
                            padding: "4px 6px",
                            borderRadius: 4,
                            background: "transparent",
                            border: "none",
                            color: "var(--text-tertiary)",
                            cursor: "pointer",
                          }}
                        >
                          <X style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      const newTodo = { task: "", assignee: "未定", priority: "medium" as const };
                      setResult({ ...result, todos: [...result.todos, newTodo] });
                    }}
                    style={{
                      padding: "8px",
                      borderRadius: 6,
                      background: "var(--background)",
                      border: "1px dashed var(--card-border)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    TODOを追加
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.todos.sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return order[a.priority] - order[b.priority];
                  }).map((todo, i) => {
                    const p = priorityColors[todo.priority];
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13 }}>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          background: p.bg,
                          border: `1px solid ${p.border}`,
                          color: p.text,
                          flexShrink: 0,
                        }}>
                          {p.label}
                        </span>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          background: "#f1f5f9",
                          color: "var(--text-secondary)",
                          flexShrink: 0,
                        }}>
                          {todo.assignee}
                        </span>
                        {todo.deadline && (
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            background: "#fef3c7",
                            color: "#d97706",
                            flexShrink: 0,
                          }}>
                            {todo.deadline}
                          </span>
                        )}
                        <span style={{ flex: 1 }}>{todo.task}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 詳細議事録 */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>詳細議事録</h3>
              {isEditMode ? (
                <textarea
                  value={result.detailedMinutes}
                  onChange={(e) => setResult({ ...result, detailedMinutes: e.target.value })}
                  placeholder="Markdown形式で入力できます"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    background: "var(--background)",
                    fontSize: 13,
                    lineHeight: 1.7,
                    minHeight: 200,
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              ) : (
                <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {result.detailedMinutes}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // モバイルレイアウト
  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
        <div style={{ marginBottom: 16 }}>
          <BackToHome />
        </div>

        <MainContent />

        {(result || loading) && <div style={{ marginTop: 16 }}><ResultPanel /></div>}

        <style jsx global>{`
          .markdown-content h1 { font-size: 1.4em; font-weight: 600; margin: 1em 0 0.5em; }
          .markdown-content h2 { font-size: 1.2em; font-weight: 600; margin: 1em 0 0.5em; }
          .markdown-content h3 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.5em; }
          .markdown-content p { margin: 0.5em 0; }
          .markdown-content ul, .markdown-content ol { padding-left: 1.5em; margin: 0.5em 0; }
          .markdown-content li { margin: 0.25em 0; }
          .markdown-content strong { font-weight: 600; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        `}</style>
      </div>
    );
  }

  // PCレイアウト（3カラム）
  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
      {/* 上部ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <BackToHome />
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            flexShrink: 0,
          }}
        >
          <MessageSquare size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>
            会議まとめくん
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
            議事録とTODOを自動生成
          </p>
        </div>
        {/* Google Drive連携ボタン */}
        <button
          onClick={() => {
            if (isDriveConnected) {
              loadDriveMeetings();
            } else {
              // OAuth認証ページへリダイレクト
              window.location.href = "/api/auth/google-drive";
            }
          }}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            background: isDriveConnected ? "#dcfce7" : "var(--card-bg)",
            color: isDriveConnected ? "#166534" : "var(--text-secondary)",
            border: `1px solid ${isDriveConnected ? "#86efac" : "var(--card-border)"}`,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isDriveConnected ? (
            <>
              <Cloud style={{ width: 14, height: 14 }} />
              Drive接続済み
            </>
          ) : (
            <>
              <CloudOff style={{ width: 14, height: 14 }} />
              Drive連携
            </>
          )}
        </button>
        {/* 設定ボタン */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            background: showSettings ? "#667eea" : "var(--card-bg)",
            color: showSettings ? "white" : "var(--text-secondary)",
            border: "1px solid var(--card-border)",
            cursor: "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Settings style={{ width: 14, height: 14 }} />
          設定
        </button>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            border: "1px solid #667eea",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={autoGenerateSummary}
              onChange={(e) => setAutoGenerateSummary(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            文字起こし完了後、自動的に議事録を作成する
          </label>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "stretch", minHeight: "calc(100vh - 120px)" }}>
        {/* 左サイドバー */}
        <Sidebar />

        {/* 中央：入力エリア */}
        <MainContent />

        {/* 右：結果表示（常に表示） */}
        <ResultPanel />
      </div>

      <style jsx global>{`
        .markdown-content h1 { font-size: 1.4em; font-weight: 600; margin: 1em 0 0.5em; }
        .markdown-content h2 { font-size: 1.2em; font-weight: 600; margin: 1em 0 0.5em; }
        .markdown-content h3 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.5em; }
        .markdown-content p { margin: 0.5em 0; }
        .markdown-content ul, .markdown-content ol { padding-left: 1.5em; margin: 0.5em 0; }
        .markdown-content li { margin: 0.25em 0; }
        .markdown-content strong { font-weight: 600; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
}
