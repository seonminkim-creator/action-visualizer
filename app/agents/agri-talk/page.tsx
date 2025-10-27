"use client";
import React, { useState } from "react";
import { Loader2, Sprout } from "lucide-react";
import BackToHome from "../../components/BackToHome";
import ReactMarkdown from "react-markdown";

type AgriTalkInput = {
  region: string;
  crop?: string;
};

export default function AgriTalkAssistant() {
  const [region, setRegion] = useState<string>("");
  const [crop, setCrop] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function searchTopics(): Promise<void> {
    if (!region.trim()) {
      setError("訪問地域を入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setProcessingTime(null);
    setResult(null);

    try {
      const res = await fetch("/api/agri-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: region.trim(),
          crop: crop.trim() || undefined,
        } as AgriTalkInput),
      });

      if (!res.ok) {
        // APIからの詳細なエラーメッセージを取得
        let errorMessage = "情報の取得に失敗しました";
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
          // JSONのパースに失敗した場合はステータステキストを使用
          errorMessage = `エラー (${res.status}): ${res.statusText}`;
        }

        setError(errorMessage);
        setErrorDetails(details);
        setProcessingTime(timeInfo);
        return;
      }

      const data = await res.json();

      // データが空の場合の処理
      if (!data.content || data.content.trim() === "") {
        setError("情報の取得に成功しましたが、データが空でした。");
        setErrorDetails("条件を変えて再度お試しください。");
        return;
      }

      setResult(data.content);
    } catch (err) {
      console.error("AgriTalk Error:", err);
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
    <div style={{ minHeight: "100vh", padding: "16px", background: "#f8fafc" }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .markdown-content {
          font-size: 14px;
          line-height: 1.8;
          color: #1e293b;
        }
        .markdown-content h2 {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 20px 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        .markdown-content h3 {
          font-size: 15px;
          font-weight: 600;
          color: #334155;
          margin: 12px 0 6px 0;
        }
        .markdown-content ul {
          padding-left: 0;
          margin: 12px 0;
          list-style: none;
        }
        .markdown-content li {
          margin-bottom: 10px;
          padding-left: 20px;
          position: relative;
          color: #334155;
          line-height: 1.7;
        }
        .markdown-content li:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #43e97b;
          font-weight: bold;
          font-size: 18px;
        }
        .markdown-content hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 24px 0;
        }
        .markdown-content strong {
          font-weight: 600;
          color: #0f172a;
        }
        .markdown-content p {
          margin: 10px 0;
          line-height: 1.8;
        }
        /* 会話ヒント専用スタイル */
        .markdown-content p:has(strong:contains("会話のきっかけ")) {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-left: 4px solid #43e97b;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 12px 0;
          font-size: 15px;
          color: #065f46;
          font-weight: 500;
        }
        .markdown-content p strong {
          color: #059669;
          font-size: 16px;
        }
        .markdown-content blockquote {
          border-left: 4px solid #43e97b;
          padding-left: 16px;
          margin: 16px 0;
          color: #334155;
          font-style: normal;
        }
      `}</style>

      <div style={{ margin: "0 auto", maxWidth: 960 }}>
        <div style={{ marginBottom: 16 }}>
          <BackToHome />
        </div>

        {/* ヘッダー */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Sprout size={24} />
            </div>
            <h1
              style={{
                fontSize: "clamp(18px, 4vw, 24px)",
                fontWeight: 600,
                margin: 0,
              }}
            >
              話題提案くん
            </h1>
          </div>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0, paddingLeft: 60 }}>
            {loading
              ? "🔍 直近3週間の旬な話題を検索中...（最大60秒程度かかる場合があります）"
              : "農家さんとの会話のきっかけになる旬な話題を提供"}
          </p>
        </div>

        {/* 利用シーン説明 */}
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
            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                lineHeight: 1.7,
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>🌾 訪問前準備</span>
                　地域の天気・市況・安全情報などをまとめて確認
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#475569" }}>💬 アイスブレイク</span>
                　地域の話題や会話ヒントで関係構築をサポート
              </div>
            </div>
          </div>
        )}

        {/* 入力フォーム */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 6,
                }}
              >
                訪問地域 <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="例: 浜松市、静岡県西部"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 6,
                }}
              >
                主要作物（任意）
              </label>
              <input
                type="text"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="例: みかん、お茶、レタス"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={searchTopics}
                disabled={loading || !region.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background:
                    loading || !region.trim()
                      ? "#94a3b8"
                      : "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                  color: "white",
                  border: "none",
                  cursor: loading || !region.trim() ? "not-allowed" : "pointer",
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
                旬な話題を検索
              </button>

              <button
                onClick={() => {
                  setRegion("");
                  setCrop("");
                  setResult(null);
                  setError(null);
                  setErrorDetails(null);
                  setProcessingTime(null);
                }}
                disabled={loading}
                style={{
                  fontSize: 13,
                  color: "#475569",
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
        </div>

        {/* エラー表示 */}
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

        {/* 結果表示 */}
        {result && !loading && (
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div className="markdown-content">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* フッター */}
        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          話題提案くん - 農家さんとの会話のきっかけを提供
        </p>
      </div>
    </div>
  );
}
