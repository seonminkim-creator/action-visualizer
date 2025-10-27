"use client";

import { useState } from "react";
import Link from "next/link";
import { useAutoRefresh } from "../hooks/useAutoRefresh";

export default function AdminPage() {
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string>("");
  const [showResult, setShowResult] = useState(false);

  const { config, updateConfig, lastCheck, currentVersion } = useAutoRefresh();

  async function handleClearCache() {
    setIsClearing(true);
    setClearResult("");
    setShowResult(false);

    try {
      const response = await fetch("/api/admin/clear-cache", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.manual) {
        setClearResult(data.message);
        setShowResult(true);
      } else if (response.ok) {
        setClearResult("✅ " + data.message);
        setShowResult(true);
      } else {
        setClearResult(`❌ エラー: ${data.error || "エラーが発生しました"}`);
        setShowResult(true);
      }
    } catch (error) {
      console.error("Clear cache error:", error);
      setClearResult(`❌ エラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
      setShowResult(true);
    } finally {
      setIsClearing(false);
    }
  }

  function handleReloadPage() {
    window.location.reload();
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "40px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        background: "white",
        borderRadius: "16px",
        padding: "40px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "40px" }}>
          <Link
            href="/"
            style={{
              display: "inline-block",
              color: "#667eea",
              textDecoration: "none",
              fontSize: "14px",
              marginBottom: "20px"
            }}
          >
            ← ホームに戻る
          </Link>
          <h1 style={{
            fontSize: "32px",
            fontWeight: "bold",
            color: "#1a202c",
            margin: "0 0 8px 0"
          }}>
            ⚙️ システム管理
          </h1>
          <p style={{ color: "#718096", fontSize: "14px", margin: 0 }}>
            営業AIポータルの管理画面
          </p>
        </div>

        {/* キャッシュクリアセクション */}
        <div style={{
          background: "#f7fafc",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#2d3748",
            marginTop: 0,
            marginBottom: "12px"
          }}>
            🗑️ ビルドキャッシュクリア
          </h2>
          <p style={{
            color: "#4a5568",
            fontSize: "14px",
            marginBottom: "16px",
            lineHeight: "1.6"
          }}>
            コード変更が反映されない場合や、APIエラーが頻発する場合にビルドキャッシュをクリアします。
            <br/>
            下記のボタンをクリックすると、手動でのキャッシュクリア手順が表示されます。
          </p>

          <div style={{
            background: "#edf2f7",
            borderLeft: "4px solid #4299e1",
            padding: "12px 16px",
            marginBottom: "20px",
            borderRadius: "4px"
          }}>
            <p style={{
              margin: 0,
              fontSize: "13px",
              color: "#2c5282",
              lineHeight: "1.5"
            }}>
              <strong>保持されるデータ:</strong><br/>
              ✅ 会議録音履歴<br/>
              ✅ 自動生成設定<br/>
              ✅ その他のユーザー設定（localStorage）
            </p>
          </div>

          <button
            onClick={handleClearCache}
            disabled={isClearing}
            style={{
              background: isClearing ? "#cbd5e0" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: isClearing ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: isClearing ? 0.6 : 1
            }}
          >
            {isClearing ? "処理中..." : "キャッシュクリア手順を表示"}
          </button>

          {/* 結果表示 */}
          {showResult && (
            <div style={{
              marginTop: "20px",
              padding: "16px",
              background: clearResult.startsWith("✅") ? "#f0fff4" : "#fff5f5",
              border: `1px solid ${clearResult.startsWith("✅") ? "#9ae6b4" : "#fc8181"}`,
              borderRadius: "8px"
            }}>
              <p style={{
                margin: 0,
                color: clearResult.startsWith("✅") ? "#22543d" : "#742a2a",
                fontSize: "14px",
                whiteSpace: "pre-line",
                lineHeight: "1.6"
              }}>
                {clearResult}
              </p>
            </div>
          )}
        </div>

        {/* 自動リフレッシュ設定 */}
        <div style={{
          background: "#f7fafc",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#2d3748",
            marginTop: 0,
            marginBottom: "12px"
          }}>
            🔄 自動リフレッシュ設定
          </h2>
          <p style={{
            color: "#4a5568",
            fontSize: "14px",
            marginBottom: "16px",
            lineHeight: "1.6"
          }}>
            定期的にアプリケーションのバージョンをチェックし、更新があれば自動でリロードします。
            <br/>
            履歴データ（localStorage）は保持されます。
          </p>

          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              marginBottom: "16px"
            }}>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                style={{
                  width: "18px",
                  height: "18px",
                  marginRight: "10px",
                  cursor: "pointer"
                }}
              />
              <span style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#2d3748"
              }}>
                自動リフレッシュを有効化
              </span>
            </label>

            {config.enabled && (
              <div style={{ marginLeft: "28px" }}>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#4a5568",
                  marginBottom: "8px"
                }}>
                  チェック間隔（分）
                </label>
                <select
                  value={config.intervalMinutes}
                  onChange={(e) => updateConfig({ intervalMinutes: Number(e.target.value) })}
                  style={{
                    padding: "8px 12px",
                    fontSize: "14px",
                    border: "1px solid #cbd5e0",
                    borderRadius: "6px",
                    background: "white",
                    cursor: "pointer"
                  }}
                >
                  <option value={5}>5分</option>
                  <option value={10}>10分</option>
                  <option value={15}>15分</option>
                  <option value={30}>30分</option>
                  <option value={60}>60分</option>
                </select>

                {lastCheck && (
                  <p style={{
                    marginTop: "12px",
                    fontSize: "12px",
                    color: "#718096"
                  }}>
                    最終チェック: {lastCheck.toLocaleTimeString("ja-JP")}
                  </p>
                )}
              </div>
            )}
          </div>

          {currentVersion && (
            <div style={{
              padding: "12px",
              background: "#edf2f7",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#4a5568"
            }}>
              <strong>現在のバージョン:</strong> {currentVersion.slice(0, 13)}
            </div>
          )}
        </div>

        {/* システム情報 */}
        <div style={{
          background: "#f7fafc",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#2d3748",
            marginTop: 0,
            marginBottom: "12px"
          }}>
            📊 システム情報
          </h2>
          <table style={{
            width: "100%",
            fontSize: "14px",
            borderCollapse: "collapse"
          }}>
            <tbody>
              <tr>
                <td style={{
                  padding: "8px 0",
                  color: "#4a5568",
                  fontWeight: "500"
                }}>
                  環境
                </td>
                <td style={{
                  padding: "8px 0",
                  color: "#2d3748",
                  textAlign: "right"
                }}>
                  {process.env.NODE_ENV || "development"}
                </td>
              </tr>
              <tr>
                <td style={{
                  padding: "8px 0",
                  color: "#4a5568",
                  fontWeight: "500"
                }}>
                  Next.js バージョン
                </td>
                <td style={{
                  padding: "8px 0",
                  color: "#2d3748",
                  textAlign: "right"
                }}>
                  16.0.0
                </td>
              </tr>
              <tr>
                <td style={{
                  padding: "8px 0",
                  color: "#4a5568",
                  fontWeight: "500"
                }}>
                  ビルドタイム
                </td>
                <td style={{
                  padding: "8px 0",
                  color: "#2d3748",
                  textAlign: "right"
                }}>
                  {new Date().toLocaleString("ja-JP")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 注意事項 */}
        <div style={{
          marginTop: "24px",
          padding: "16px",
          background: "#fffaf0",
          border: "1px solid #fbd38d",
          borderRadius: "8px"
        }}>
          <p style={{
            margin: 0,
            fontSize: "13px",
            color: "#744210",
            lineHeight: "1.6"
          }}>
            ⚠️ <strong>注意:</strong> キャッシュクリアには開発サーバーの再起動が必要です。
            手順に従ってターミナルで操作してください。
          </p>
        </div>
      </div>
    </div>
  );
}
