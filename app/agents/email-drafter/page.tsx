"use client";
import BackToHome from "../../components/BackToHome";
import { Mail } from "lucide-react";

export default function EmailDrafter() {
  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
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
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              marginBottom: 24
            }}
          >
            <Mail size={48} />
          </div>

          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            margin: 0,
            marginBottom: 16,
            color: "var(--foreground)"
          }}>
            メール叩きくん
          </h1>

          <p style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            marginBottom: 32,
            lineHeight: 1.6
          }}>
            メールのテンプレート・ドラフトを自動作成する機能です
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
            background: "var(--card-bg)",
            borderRadius: 12,
            padding: 24,
            textAlign: "left",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--foreground)" }}>
              予定している機能
            </h2>
            <ul style={{ paddingLeft: 24, color: "var(--text-secondary)", lineHeight: 2 }}>
              <li>状況説明からメールテンプレート作成</li>
              <li>ビジネスメールの文体調整</li>
              <li>よく使うフレーズの提案</li>
              <li>多言語対応(英語・日本語)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
