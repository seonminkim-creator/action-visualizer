"use client";
import BackToHome from "../../components/BackToHome";
import { MessageSquare } from "lucide-react";

export default function MeetingRecorder() {
  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "#f8fafc" }}>
      <div style={{ margin: "0 auto", maxWidth: 960 }}>
        <div style={{ marginBottom: 16 }}>
          <BackToHome />
        </div>

        <div style={{ textAlign: "center", paddingTop: 60, paddingBottom: 60 }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 20,
              background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              marginBottom: 24
            }}
          >
            <MessageSquare size={48} />
          </div>

          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            margin: 0,
            marginBottom: 16,
            color: "#0f172a"
          }}>
            会議まとめーるくん
          </h1>

          <p style={{
            fontSize: 16,
            color: "#64748b",
            marginBottom: 32,
            lineHeight: 1.6
          }}>
            社内会議をセールス視点で要約・TODO抽出する機能です
          </p>

          <div style={{
            padding: "12px 24px",
            borderRadius: 24,
            background: "#fef3c7",
            color: "#d97706",
            display: "inline-block",
            fontSize: 14,
            fontWeight: 600
          }}>
            🚧 Coming Soon
          </div>

          <div style={{
            marginTop: 48,
            background: "white",
            borderRadius: 12,
            padding: 24,
            textAlign: "left",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#0f172a" }}>
              予定している機能
            </h2>
            <ul style={{ paddingLeft: 24, color: "#475569", lineHeight: 2 }}>
              <li>会議内容のテキスト化</li>
              <li>インサイドセールス観点での要約</li>
              <li>ネクストアクションの抽出(いつまで・誰が)</li>
              <li>議事録の自動生成</li>
              <li>重要ポイントのハイライト</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
