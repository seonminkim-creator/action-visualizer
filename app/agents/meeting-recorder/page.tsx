"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Mic, Settings, History, MessageSquare, Cloud, CloudOff
} from "lucide-react";
import BackToHome from "../../components/BackToHome";
import Sidebar from "./_components/Sidebar";
import MainContent from "./_components/MainContent";
import ResultPanel from "./_components/ResultPanel";
import { MeetingSummary, DriveMeeting, Category, DEFAULT_CATEGORIES, HistoryItem } from "./types";



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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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

  // モバイル用タブステート
  const [activeTab, setActiveTab] = useState<"history" | "record" | "preview">("record");

  const handleFilesUpload = async (files: File[]) => {
    if (files.length === 0) return;

    // ステート更新
    setUploadedFiles(prev => [...prev, ...files]);

    for (const file of files) {
      if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        // テキストファイル
        const text = await file.text();
        setTranscript(prev => prev + (prev ? "\n\n" : "") + `【${file.name}】\n` + text);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        // Wordファイル
        setTranscript(prev => prev + (prev ? "\n\n" : "") + `【${file.name}】\n(Wordファイルの内容は現在プレビューできませんが、添付として認識されました)`);
      } else if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
        // 音声・動画ファイル
        setUploadedAudioFile(file); // 最後の音声ファイルをセット（Drive保存用）

        // 文字起こし実行
        try {
          // ファイルサイズ制限 (100MB)
          if (file.size > 100 * 1024 * 1024) {
            setError(`${file.name}はファイルサイズが大きすぎます(100MB制限)`);
            continue;
          }

          const formData = new FormData();
          formData.append("audio", file);
          setProcessingStage(`${file.name} を文字起こし中...`);
          setLoading(true);

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            setTranscript(prev => prev + (prev ? "\n\n" : "") + `【${file.name} (文字起こし)】\n` + data.transcription);
          } else {
            const err = await res.json();
            setError(`${file.name}の文字起こしに失敗: ${err.error || "不明なエラー"}`);
          }
        } catch (err) {
          console.error("ファイル処理エラー:", err);
          setError(`${file.name}の処理に失敗しました`);
        } finally {
          setLoading(false);
          setProcessingStage("");
        }
      }
    }
  };

  // 結果が生成されたら自動的にプレビュータブへ移動（モバイル）
  useEffect(() => {
    if (result && isMobile) {
      setActiveTab("preview");
    }
  }, [result, isMobile]);

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

  const handleDisconnectDrive = async () => {
    if (!confirm("Google Driveとの連携を解除しますか？")) {
      return;
    }

    try {
      const res = await fetch("/api/auth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google-drive" }),
      });

      if (res.ok) {
        setIsDriveConnected(false);
        setDriveMeetings([]);
        console.log("✅ Google Driveの連携を解除しました");
      } else {
        setError("連携解除に失敗しました");
      }
    } catch (err) {
      console.error("連携解除エラー:", err);
      setError("連携解除中にエラーが発生しました");
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
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFilesUpload(files);
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




  // モバイルレイアウト
  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", paddingBottom: 80 }}>
        {/* モバイルヘッダー */}
        <div style={{
          padding: "12px 16px",
          background: "var(--card-bg)",
          borderBottom: "1px solid var(--card-border)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BackToHome />
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>会議まとめくん</h1>
          </div>
          <button
            onClick={() => {
              if (isDriveConnected) {
                handleDisconnectDrive();
              } else {
                window.location.href = "/api/auth/google-drive";
              }
            }}
            style={{
              padding: "6px",
              borderRadius: "50%",
              background: isDriveConnected ? "#dcfce7" : "var(--background)",
              color: isDriveConnected ? "#166534" : "var(--text-secondary)",
              border: `1px solid ${isDriveConnected ? "#86efac" : "var(--card-border)"}`,
              cursor: "pointer",
            }}
          >
            {isDriveConnected ? <Cloud size={16} /> : <CloudOff size={16} />}
          </button>
        </div>

        {/* コンテンツエリア */}
        <div style={{ padding: 16 }}>
          <div style={{ display: activeTab === "history" ? "block" : "none" }}>
            <Sidebar
              history={history}
              driveMeetings={driveMeetings}
              categories={categories}
              isDriveConnected={isDriveConnected}
              loadingFromDrive={loadingFromDrive}
              savedFolderId={savedFolderId}
              onLoadDriveMeetings={loadDriveMeetings}
              onLoadMeetingFromDrive={loadMeetingFromDrive}
              onSetResult={setResult}
              onDeleteHistoryItem={deleteHistoryItem}
              onDeleteMeetingFromDrive={deleteMeetingFromDrive}
              onDeleteCategory={deleteCategory}
              onAddCategory={addCategory}
              style={{ width: "100%", maxHeight: "calc(100vh - 160px)" }}
            />
          </div>
          <div style={{ display: activeTab === "record" ? "block" : "none" }}>
            <MainContent
              loading={loading}
              transcript={transcript}
              onTranscriptChange={setTranscript}
              result={result}
              onSetResult={setResult}
              onError={setError}
              error={error}
              errorDetails={errorDetails}
              isRecording={isRecording}
              recordingMode={recordingMode}
              onSetRecordingMode={setRecordingMode}
              recordingTime={recordingTime}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onToggleMicMute={toggleMicMute}
              isMicMuted={isMicMuted}
              processingSegments={processingSegments}
              onGenerateSummary={generateSummary}
              processingStage={processingStage}
              uploadedFiles={uploadedFiles}
              onFilesUpload={handleFilesUpload}
              onFilesClear={() => setUploadedFiles([])}
              style={{ width: "100%", maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}
            />
          </div>
          <div style={{ display: activeTab === "preview" ? "block" : "none" }}>
            <ResultPanel
              loading={loading}
              result={result}
              processingStage={processingStage}
              isEditMode={isEditMode}
              onSetIsEditMode={setIsEditMode}
              onSetResult={setResult}
              isDriveConnected={isDriveConnected}
              categories={categories}
              selectedCategory={selectedCategory}
              onSetSelectedCategory={setSelectedCategory}
              uploadingToDrive={uploadingToDrive}
              savedFolderId={savedFolderId}
              meetingTitle={meetingTitle}
              onUploadToDrive={uploadToDrive}
              style={{ width: "100%", maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}
            />
          </div>
        </div>

        {/* ボトムナビゲーション */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--card-bg)",
          borderTop: "1px solid var(--card-border)",
          display: "flex",
          justifyContent: "space-around",
          padding: "12px 0",
          zIndex: 50,
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.05)"
        }}>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              background: "transparent",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: activeTab === "history" ? "#667eea" : "var(--text-tertiary)",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              width: "33%"
            }}
          >
            <History size={20} />
            履歴・カレンダー
          </button>

          <button
            onClick={() => setActiveTab("record")}
            style={{
              background: "transparent",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: activeTab === "record" ? "#667eea" : "var(--text-tertiary)",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              width: "33%",
              position: "relative"
            }}
          >
            <div style={{ position: "relative" }}>
              <Mic size={20} />
              {isRecording && (
                <span style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#ef4444",
                  border: "2px solid var(--card-bg)"
                }} />
              )}
            </div>
            録音・入力
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            style={{
              background: "transparent",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: activeTab === "preview" ? "#667eea" : "var(--text-tertiary)",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              width: "33%",
              position: "relative"
            }}
          >
            <div style={{ position: "relative" }}>
              <MessageSquare size={20} />
              {result && (
                <span style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                  border: "2px solid var(--card-bg)"
                }} />
              )}
            </div>
            議事録プレビュー
          </button>
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

  // PCレイアウト（3カラム）
  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
      {/* 上部ヘッダー */}
      {/* 上部ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
        <BackToHome />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flexShrink: 0,
              boxShadow: "0 2px 5px rgba(250, 112, 154, 0.4)"
            }}
          >
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 2px 0", color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              会議まとめくん
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              議事録とTODOを自動生成
            </p>
          </div>
        </div>

        {/* Google Drive連携ボタン */}
        <button
          onClick={() => {
            if (isDriveConnected) {
              handleDisconnectDrive();
            } else {
              // OAuth認証ページへリダイレクト
              window.location.href = "/api/auth/google-drive";
            }
          }}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: isDriveConnected ? "#dcfce7" : "var(--card-bg)",
            color: isDriveConnected ? "#166534" : "var(--text-secondary)",
            border: `1px solid ${isDriveConnected ? "#86efac" : "var(--card-border)"}`,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.2s"
          }}
        >
          {isDriveConnected ? (
            <>
              <Cloud style={{ width: 16, height: 16 }} />
              Drive接続済み
            </>
          ) : (
            <>
              <CloudOff style={{ width: 16, height: 16 }} />
              Drive連携
            </>
          )}
        </button>
        {/* 設定ボタン */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: showSettings ? "#667eea" : "var(--card-bg)",
            color: showSettings ? "white" : "var(--text-secondary)",
            border: "1px solid var(--card-border)",
            cursor: "pointer",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.2s"
          }}
        >
          <Settings style={{ width: 16, height: 16 }} />
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
        <Sidebar
          history={history}
          driveMeetings={driveMeetings}
          categories={categories}
          isDriveConnected={isDriveConnected}
          loadingFromDrive={loadingFromDrive}
          savedFolderId={savedFolderId}
          onLoadDriveMeetings={loadDriveMeetings}
          onLoadMeetingFromDrive={loadMeetingFromDrive}
          onSetResult={setResult}
          onDeleteHistoryItem={deleteHistoryItem}
          onDeleteMeetingFromDrive={deleteMeetingFromDrive}
          onDeleteCategory={deleteCategory}
          onAddCategory={addCategory}
          style={{ width: 280, flexShrink: 0, maxHeight: "calc(100vh - 120px)" }}
        />

        {/* 中央：入力エリア */}
        <MainContent
          loading={loading}
          transcript={transcript}
          onTranscriptChange={setTranscript}
          result={result}
          onSetResult={setResult}
          onError={setError}
          error={error}
          errorDetails={errorDetails}
          isRecording={isRecording}
          recordingMode={recordingMode}
          onSetRecordingMode={setRecordingMode}
          recordingTime={recordingTime}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onToggleMicMute={toggleMicMute}
          isMicMuted={isMicMuted}
          processingSegments={processingSegments}
          onGenerateSummary={generateSummary}
          processingStage={processingStage}
          uploadedFiles={uploadedFiles}
          onFilesUpload={handleFilesUpload}
          onFilesClear={() => setUploadedFiles([])}
          style={{ flex: 1, minWidth: 0, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}
        />

        {/* 右：結果表示（常に表示） */}
        <ResultPanel
          loading={loading}
          result={result}
          processingStage={processingStage}
          isEditMode={isEditMode}
          onSetIsEditMode={setIsEditMode}
          onSetResult={setResult}
          isDriveConnected={isDriveConnected}
          categories={categories}
          selectedCategory={selectedCategory}
          onSetSelectedCategory={setSelectedCategory}
          uploadingToDrive={uploadingToDrive}
          savedFolderId={savedFolderId}
          meetingTitle={meetingTitle}
          onUploadToDrive={uploadToDrive}
          style={{ flex: 1.5, minWidth: 400, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}
        />
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
