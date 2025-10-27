"use client";
import Link from "next/link";
import { CheckSquare, Calendar, Mail, MessageSquare, Sprout } from "lucide-react";

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
    description: "カレンダーから空き時間をすぐ可視化",
    icon: <Calendar size={32} />,
    path: "/agents/calendar-finder",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    status: "active"
  },
  {
    id: "agri-talk",
    title: "話題提案くん",
    description: "農家さんとの会話のきっかけになる旬な話題を提供",
    icon: <Sprout size={32} />,
    path: "/agents/agri-talk",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    status: "active",
    badge: "New!"
  },
  {
    id: "meeting-recorder",
    title: "会議まとめくん",
    description: "会議の内容から議事録とTODOを自動生成",
    icon: <MessageSquare size={32} />,
    path: "/agents/meeting-recorder",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    status: "active",
    badge: "New!"
  },
  {
    id: "email-composer",
    title: "メール返信叩きくん",
    description: "ビジネスメールの作成・返信・添削をお手伝い",
    icon: <Mail size={32} />,
    path: "/agents/email-composer",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    status: "active",
    badge: "New!"
  },
  {
    id: "task-visualizer",
    title: "タスク整理くん",
    description: "メール・議事録からやるべきことを可視化",
    icon: <CheckSquare size={32} />,
    path: "/agents/task-visualizer",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    status: "coming-soon"
  }
];

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "#f8fafc" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .agent-card {
          animation: fadeIn 0.5s ease-out;
        }
        @media (min-width: 640px) {
          .agents-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div style={{ margin: "0 auto", maxWidth: 1200, paddingTop: "40px" }}>
        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
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
            color: "#64748b",
            margin: 0,
            fontWeight: 500
          }}>
            営業活動をアシスタントする専門AIエージェント
          </p>
        </div>

        {/* エージェントカードグリッド */}
        <div
          className="agents-grid"
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "1fr"
          }}
        >
          {agents.map((agent, index) => {
            const isActive = agent.status === "active";

            const cardContent = (
              <>
                {/* アイコンとステータスバッジ */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      background: agent.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white"
                    }}
                  >
                    {agent.icon}
                  </div>
                  {!isActive && (
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: "#fef3c7",
                      color: "#d97706",
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      Coming Soon
                    </span>
                  )}
                  {isActive && agent.badge && (
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: "#dcfce7",
                      color: "#16a34a",
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {agent.badge}
                    </span>
                  )}
                </div>

                {/* タイトルと説明 */}
                <div style={{ paddingRight: isActive ? 40 : 0 }}>
                  <h2 style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: 8,
                    margin: 0
                  }}>
                    {agent.title}
                  </h2>
                  <p style={{
                    fontSize: 14,
                    color: "#64748b",
                    lineHeight: 1.6,
                    margin: 0
                  }}>
                    {agent.description}
                  </p>
                </div>

                {/* 矢印アイコン (activeの場合のみ) */}
                {isActive && (
                  <div style={{
                    position: "absolute",
                    bottom: 20,
                    right: 20,
                    fontSize: 24,
                    color: "#cbd5e1",
                    lineHeight: 1
                  }}>
                    →
                  </div>
                )}
              </>
            );

            const cardStyle = {
              position: "relative" as const,
              background: "white",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 4px 6px rgba(0,0,0,0.07)",
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              cursor: isActive ? ("pointer" as const) : ("not-allowed" as const),
              opacity: isActive ? 1 : 0.6,
              transition: "all 0.3s ease",
              animationDelay: `${index * 0.1}s`,
              overflow: "hidden" as const
            };

            if (isActive) {
              return (
                <Link
                  key={agent.id}
                  href={agent.path}
                  className="agent-card"
                  style={cardStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.07)";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div
                key={agent.id}
                className="agent-card"
                style={cardStyle}
              >
                {cardContent}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div style={{ marginTop: 48, textAlign: "center" }}>
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
              transition: "all 0.2s",
              marginBottom: 16
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
          <p style={{
            fontSize: 12,
            color: "#94a3b8",
            margin: 0
          }}>
            営業AIポータル - 営業活動をアシスタントする専門AIエージェント
          </p>
        </div>
      </div>
    </div>
  );
}
