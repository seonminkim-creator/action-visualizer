"use client";
import Link from "next/link";
import { CheckSquare, Calendar, Mail, MessageSquare, Sprout, Settings, User, FileText } from "lucide-react";
import { useState, useEffect } from "react";

type Agent = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  gradient: string;
  status: "active" | "coming-soon";
  badge?: string;
};

const agents: Agent[] = [
  {
    id: "calendar-finder",
    title: "空き時間検索くん",
    description: "空き時間をすぐ可視化",
    icon: <Calendar size={32} />,
    path: "/agents/calendar-finder",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    status: "coming-soon"
  },
  {
    id: "agri-talk",
    title: "話題提案くん",
    description: "農家さんとの会話ネタを提供",
    icon: <Sprout size={32} />,
    path: "/agents/agri-talk",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    status: "active",
    badge: "New!"
  },
  {
    id: "meeting-recorder",
    title: "会議まとめくん",
    description: "議事録とTODOを自動生成",
    icon: <MessageSquare size={32} />,
    path: "/agents/meeting-recorder",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    status: "active",
    badge: "New!"
  },
  {
    id: "daily-reporter",
    title: "営業日報くん",
    description: "商談内容から日報を自動生成",
    icon: <FileText size={32} />,
    path: "/agents/daily-reporter",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    status: "active",
    badge: "New!"
  },
  {
    id: "email-composer",
    title: "メール返信叩きくん",
    description: "メールの作成・返信",
    icon: <Mail size={32} />,
    path: "/agents/email-composer",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    status: "active",
    badge: "New!"
  },
  {
    id: "task-visualizer",
    title: "タスク整理くん",
    description: "やるべきことを可視化",
    icon: <CheckSquare size={32} />,
    path: "/agents/task-visualizer",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    status: "coming-soon"
  }
];

export default function Home() {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [hasSettings, setHasSettings] = useState<boolean>(true);

  // 初回起動時にlocalStorageをチェック
  useEffect(() => {
    const savedUserName = localStorage.getItem("globalUserName");
    const savedCompanyName = localStorage.getItem("globalCompanyName");

    if (savedUserName && savedCompanyName) {
      setUserName(savedUserName);
      setCompanyName(savedCompanyName);
      setHasSettings(true);
    } else {
      // 設定がない場合はモーダルを表示
      setShowModal(true);
      setHasSettings(false);
    }
  }, []);

  function saveSettings() {
    if (!userName.trim() || !companyName.trim()) {
      alert("名前と会社名の両方を入力してください");
      return;
    }
    localStorage.setItem("globalUserName", userName.trim());
    localStorage.setItem("globalCompanyName", companyName.trim());

    // 既存のemail-composer用の設定も更新（互換性のため）
    localStorage.setItem("emailUserName", userName.trim());
    localStorage.setItem("emailCompanyName", companyName.trim());

    setHasSettings(true);
    setShowModal(false);
    alert("✅ ユーザー設定を保存しました");
  }

  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .agent-card {
          animation: fadeIn 0.5s ease-out;
        }

        /* モバイル: 2列表示、アイコンのみ表示 */
        .agents-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .mobile-user-button {
          display: flex !important;
        }
        .desktop-user-button {
          display: none !important;
        }

        /* タブレット: 3列 */
        @media (min-width: 640px) {
          .agents-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .mobile-user-button {
            display: none !important;
          }
          .desktop-user-button {
            display: flex !important;
          }
        }

        /* デスクトップ: 4列 */
        @media (min-width: 1024px) {
          .agents-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>

      <div style={{ margin: "0 auto", maxWidth: 1200, paddingTop: "40px" }}>
        {/* ヘッダー */}
        <div style={{ position: "relative", textAlign: "center", marginBottom: 48 }}>
          {/* 設定ボタン（モバイルではアイコンのみ） */}
          {hasSettings && (
            <>
              {/* デスクトップ版: ユーザー名付き */}
              <button
                onClick={() => setShowModal(true)}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  cursor: "pointer",
                  display: "none",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.color = "#667eea";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.color = "#475569";
                }}
                className="desktop-user-button"
              >
                <User size={16} />
                {userName}
              </button>

              {/* モバイル版: アイコンのみ */}
              <button
                onClick={() => setShowModal(true)}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.color = "#667eea";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.color = "#475569";
                }}
                className="mobile-user-button"
              >
                <User size={20} />
              </button>
            </>
          )}

          <h1 style={{
            fontSize: "clamp(24px, 5vw, 40px)",
            fontWeight: 700,
            margin: 0,
            marginBottom: 12,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            営業AIポータル
          </h1>
          <p style={{
            fontSize: "clamp(14px, 3vw, 18px)",
            color: "var(--text-secondary)",
            margin: 0,
            fontWeight: 500
          }}>
            営業活動をアシスタントする専門AIエージェント
          </p>
        </div>

        {/* 公開済みエージェント */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20
          }}>
            <div style={{
              width: 4,
              height: 24,
              background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
              borderRadius: 2
            }} />
            <h2 style={{
              fontSize: "clamp(18px, 4vw, 24px)",
              fontWeight: 700,
              color: "var(--foreground)",
              margin: 0
            }}>
              公開済み
            </h2>
            <span style={{
              padding: "4px 12px",
              borderRadius: 20,
              background: "#dcfce7",
              color: "#16a34a",
              fontSize: "clamp(11px, 2.5vw, 13px)",
              fontWeight: 600
            }}>
              {agents.filter(a => a.status === "active").length}個
            </span>
          </div>

          <div
            className="agents-grid"
            style={{
              display: "grid",
              gap: 16
            }}
          >
            {agents.filter(agent => agent.status === "active").map((agent, index) => {
              const cardContent = (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  textAlign: "center",
                  position: "relative"
                }}>
                  {agent.badge && (
                    <span style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      padding: "clamp(2px, 1vw, 4px) clamp(6px, 2vw, 10px)",
                      borderRadius: 12,
                      background: "#dcfce7",
                      color: "#16a34a",
                      fontSize: "clamp(9px, 2vw, 11px)",
                      fontWeight: 600
                    }}>
                      {agent.badge}
                    </span>
                  )}

                  {/* アイコン */}
                  <div
                    style={{
                      width: "clamp(48px, 12vw, 56px)",
                      height: "clamp(48px, 12vw, 56px)",
                      borderRadius: 12,
                      background: agent.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      marginBottom: 12,
                      fontSize: "clamp(24px, 6vw, 28px)"
                    }}
                  >
                    {agent.icon}
                  </div>

                  {/* タイトル */}
                  <h2 style={{
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontWeight: 600,
                    color: "var(--foreground)",
                    marginBottom: 6,
                    margin: 0,
                    wordBreak: "keep-all",
                    overflowWrap: "break-word",
                    whiteSpace: "nowrap"
                  }}>
                    {agent.title}
                  </h2>

                  {/* 説明（1行のみ） */}
                  <p style={{
                    fontSize: "clamp(10px, 2vw, 11px)",
                    color: "var(--text-secondary)",
                    lineHeight: 1.3,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                    paddingLeft: 8,
                    paddingRight: 8
                  }}>
                    {agent.description}
                  </p>
                </div>
              );

              const cardStyle = {
                position: "relative" as const,
                background: "var(--card-bg)",
                borderRadius: 12,
                padding: "clamp(16px, 4vw, 20px)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                border: "1px solid var(--card-border)",
                textDecoration: "none",
                cursor: "pointer" as const,
                transition: "all 0.3s ease",
                animationDelay: `${index * 0.1}s`,
                overflow: "hidden" as const,
                aspectRatio: "1 / 1",
                display: "flex",
                flexDirection: "column" as const
              };

              return (
                <Link
                  key={agent.id}
                  href={agent.path}
                  className="agent-card"
                  style={cardStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.06)";
                  }}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 未公開エージェント (Coming Soon) */}
        {agents.filter(agent => agent.status === "coming-soon").length > 0 && (
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20
            }}>
              <div style={{
                width: 4,
                height: 24,
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                borderRadius: 2
              }} />
              <h2 style={{
                fontSize: "clamp(18px, 4vw, 24px)",
                fontWeight: 700,
                color: "var(--foreground)",
                margin: 0
              }}>
                未公開（Coming Soon）
              </h2>
              <span style={{
                padding: "4px 12px",
                borderRadius: 20,
                background: "#fef3c7",
                color: "#d97706",
                fontSize: "clamp(11px, 2.5vw, 13px)",
                fontWeight: 600
              }}>
                {agents.filter(a => a.status === "coming-soon").length}個
              </span>
            </div>

            <div
              className="agents-grid"
              style={{
                display: "grid",
                gap: 16
              }}
            >
              {agents.filter(agent => agent.status === "coming-soon").map((agent, index) => {
                const cardContent = (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    textAlign: "center",
                    position: "relative"
                  }}>
                    <span style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      padding: "clamp(2px, 1vw, 4px) clamp(6px, 2vw, 10px)",
                      borderRadius: 12,
                      background: "#fef3c7",
                      color: "#d97706",
                      fontSize: "clamp(9px, 2vw, 11px)",
                      fontWeight: 600
                    }}>
                      Coming Soon
                    </span>

                    {/* アイコン */}
                    <div
                      style={{
                        width: "clamp(48px, 12vw, 56px)",
                        height: "clamp(48px, 12vw, 56px)",
                        borderRadius: 12,
                        background: agent.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        marginBottom: 12,
                        fontSize: "clamp(24px, 6vw, 28px)",
                        opacity: 0.7
                      }}
                    >
                      {agent.icon}
                    </div>

                    {/* タイトル */}
                    <h2 style={{
                      fontSize: "clamp(13px, 3vw, 15px)",
                      fontWeight: 600,
                      color: "var(--foreground)",
                      marginBottom: 6,
                      margin: 0,
                      wordBreak: "keep-all",
                      overflowWrap: "break-word",
                      whiteSpace: "nowrap",
                      opacity: 0.7
                    }}>
                      {agent.title}
                    </h2>

                    {/* 説明（1行のみ） */}
                    <p style={{
                      fontSize: "clamp(10px, 2vw, 11px)",
                      color: "var(--text-secondary)",
                      lineHeight: 1.3,
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                      paddingLeft: 8,
                      paddingRight: 8,
                      opacity: 0.7
                    }}>
                      {agent.description}
                    </p>
                  </div>
                );

                return (
                  <div
                    key={agent.id}
                    className="agent-card"
                    style={{
                      position: "relative",
                      background: "var(--card-bg)",
                      borderRadius: 12,
                      padding: "clamp(16px, 4vw, 20px)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                      border: "1px solid var(--card-border)",
                      cursor: "not-allowed",
                      opacity: 0.6,
                      transition: "all 0.3s ease",
                      animationDelay: `${index * 0.1}s`,
                      overflow: "hidden",
                      aspectRatio: "1 / 1",
                      display: "flex",
                      flexDirection: "column"
                    }}
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ユーザー設定モーダル */}
        {showModal && (
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
              padding: 16
            }}
            onClick={(e) => {
              // 背景クリック時は初期設定済みの場合のみ閉じる
              if (hasSettings && e.target === e.currentTarget) {
                setShowModal(false);
              }
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: 32,
                maxWidth: 480,
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white"
                  }}
                >
                  <User size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: "#0f172a", margin: 0 }}>
                    {hasSettings ? "ユーザー設定" : "初期設定"}
                  </h2>
                  <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
                    {hasSettings ? "設定を変更できます" : "はじめに、あなたの情報を入力してください"}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: 8
                  }}
                >
                  会社名 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="例: 株式会社〇〇"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: 8
                  }}
                >
                  名前 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="例: 田中"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                {hasSettings && (
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      flex: 1,
                      padding: "12px 24px",
                      borderRadius: 8,
                      background: "white",
                      border: "1px solid #d1d5db",
                      color: "#64748b",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 14
                    }}
                  >
                    キャンセル
                  </button>
                )}
                <button
                  onClick={saveSettings}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <Link
              href="/admin"
              style={{
                display: "inline-block",
                fontSize: 12,
                color: "#94a3b8",
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#667eea";
                e.currentTarget.style.borderColor = "#667eea";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              ⚙️ システム管理
            </Link>
            <Link
              href="/admin/usage"
              style={{
                display: "inline-block",
                fontSize: 12,
                color: "#94a3b8",
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#667eea";
                e.currentTarget.style.borderColor = "#667eea";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              📊 使用統計
            </Link>
          </div>
          <p style={{
            fontSize: 12,
            color: "#94a3b8",
            margin: 0,
            marginBottom: 8
          }}>
            営業AIポータル - 営業活動をアシスタントする専門AIエージェント
          </p>
          <p style={{
            fontSize: 11,
            color: "#94a3b8",
            margin: 0
          }}>
            © 2025 株式会社PECO. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
