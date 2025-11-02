"use client";

import { useState, useEffect } from "react";
import { UsageLog, UsageStats, DailyStats } from "@/lib/types/admin";

export default function AdminUsagePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Basic認証情報を保存
  const [authCredentials, setAuthCredentials] = useState("");

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const authHeader = `Bearer ${data.token}`;
        setAuthCredentials(authHeader);
        setIsAuthenticated(true);
        loadData(authHeader);
      } else {
        setLoginError(data.error || "ユーザー名またはパスワードが正しくありません");
      }
    } catch (error) {
      setLoginError("ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // データ読み込み
  const loadData = async (authHeader: string) => {
    setLogsLoading(true);

    try {
      // 統計データ取得
      const statsResponse = await fetch("/api/admin/stats", {
        headers: { Authorization: authHeader },
      });
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data.stats);
        setDailyStats(data.dailyStats);
      }

      // ログデータ取得（最新50件）
      const logsResponse = await fetch("/api/admin/logs?limit=50", {
        headers: { Authorization: authHeader },
      });
      if (logsResponse.ok) {
        const data = await logsResponse.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  // ログアウト
  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthCredentials("");
    setUsername("");
    setPassword("");
    setStats(null);
    setDailyStats([]);
    setLogs([]);
  };

  // ログイン画面
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            maxWidth: "400px",
            width: "100%",
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#1a202c",
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            🔐 管理者ログイン
          </h1>
          <p
            style={{
              color: "#718096",
              fontSize: "14px",
              marginBottom: "32px",
              textAlign: "center",
            }}
          >
            使用状況を確認するにはログインしてください
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#2d3748",
                  marginBottom: "8px",
                }}
              >
                ユーザー名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  border: "1px solid #cbd5e0",
                  borderRadius: "8px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#2d3748",
                  marginBottom: "8px",
                }}
              >
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  border: "1px solid #cbd5e0",
                  borderRadius: "8px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {loginError && (
              <div
                style={{
                  padding: "12px",
                  background: "#fff5f5",
                  border: "1px solid #fc8181",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  color: "#742a2a",
                }}
              >
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "12px",
                background: isLoading ? "#cbd5e0" : "#667eea",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ダッシュボード画面
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7fafc",
        padding: "40px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#1a202c",
                marginBottom: "8px",
              }}
            >
              📊 使用状況ダッシュボード
            </h1>
            <p style={{ color: "#718096", fontSize: "14px", margin: 0 }}>
              会議まとめくんの使用統計とログ
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "#e53e3e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ログアウト
          </button>
        </div>

        {/* 統計カード */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
              marginBottom: "32px",
            }}
          >
            <StatCard
              title="総ユーザー数"
              value={stats.totalUsers}
              icon="👥"
              color="#667eea"
            />
            <StatCard
              title="文字起こし数"
              value={stats.totalTranscriptions}
              icon="🎤"
              color="#48bb78"
            />
            <StatCard
              title="議事録生成数"
              value={stats.totalMeetingSummaries}
              icon="📝"
              color="#4299e1"
            />
            <StatCard
              title="エラー数"
              value={stats.totalErrors}
              icon="❌"
              color="#f56565"
            />
            <StatCard
              title="平均処理時間"
              value={`${(stats.averageProcessingTime / 1000).toFixed(1)}秒`}
              icon="⏱️"
              color="#ed8936"
            />
            <StatCard
              title="API呼び出し数"
              value={stats.apiCallCount}
              icon="🔌"
              color="#9f7aea"
            />
          </div>
        )}

        {/* 日次統計テーブル */}
        {dailyStats.length > 0 && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#2d3748",
                marginBottom: "20px",
              }}
            >
              📈 過去7日間の統計
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f7fafc" }}>
                    <th style={tableHeaderStyle}>日付</th>
                    <th style={tableHeaderStyle}>ユーザー数</th>
                    <th style={tableHeaderStyle}>文字起こし</th>
                    <th style={tableHeaderStyle}>議事録生成</th>
                    <th style={tableHeaderStyle}>エラー</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.map((day, index) => (
                    <tr
                      key={day.date}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <td style={tableCellStyle}>{day.date}</td>
                      <td style={tableCellStyle}>{day.uniqueUsers}</td>
                      <td style={tableCellStyle}>{day.transcriptions}</td>
                      <td style={tableCellStyle}>{day.meetingSummaries}</td>
                      <td style={tableCellStyle}>{day.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ログテーブル */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#2d3748",
              marginBottom: "20px",
            }}
          >
            📋 最新のログ（50件）
          </h2>

          {logsLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#718096" }}>
              読み込み中...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#718096" }}>
              ログがありません
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f7fafc" }}>
                    <th style={tableHeaderStyle}>日時</th>
                    <th style={tableHeaderStyle}>ユーザーID</th>
                    <th style={tableHeaderStyle}>アクション</th>
                    <th style={tableHeaderStyle}>ステータス</th>
                    <th style={tableHeaderStyle}>文字数</th>
                    <th style={tableHeaderStyle}>処理時間</th>
                    <th style={tableHeaderStyle}>エラー</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <td style={tableCellStyle}>
                        {new Date(log.timestamp).toLocaleString("ja-JP")}
                      </td>
                      <td style={tableCellStyle}>{log.userId}</td>
                      <td style={tableCellStyle}>
                        {log.action === "transcribe" ? "文字起こし" : "議事録生成"}
                      </td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background:
                              log.status === "success" ? "#c6f6d5" : "#fed7d7",
                            color: log.status === "success" ? "#22543d" : "#742a2a",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          {log.status === "success" ? "成功" : "失敗"}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        {log.characterCount?.toLocaleString() || "-"}
                      </td>
                      <td style={tableCellStyle}>
                        {(log.processingTime / 1000).toFixed(1)}秒
                      </td>
                      <td
                        style={{
                          ...tableCellStyle,
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.errorMessage || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "28px" }}>{icon}</span>
      </div>
      <div style={{ fontSize: "14px", color: "#718096", marginBottom: "8px" }}>
        {title}
      </div>
      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#1a202c" }}>
        {value}
      </div>
    </div>
  );
}

// テーブルスタイル
const tableHeaderStyle: React.CSSProperties = {
  padding: "12px",
  textAlign: "left",
  fontWeight: "600",
  color: "#2d3748",
  borderBottom: "2px solid #e2e8f0",
};

const tableCellStyle: React.CSSProperties = {
  padding: "12px",
  color: "#4a5568",
};
