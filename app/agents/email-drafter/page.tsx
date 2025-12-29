"use client";
import BackToHome from "../../components/BackToHome";
import { Mail, Clock, Hammer } from "lucide-react";

export default function EmailDrafter() {
  return (
    <div style={{ minHeight: "100vh", padding: "16px", background: "var(--background)" }}>
      <div style={{ margin: "0 auto", maxWidth: 600 }}>
        <div style={{ marginBottom: 16 }}>
          <BackToHome />
        </div>

        {/* Standard Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
             <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                 <Mail size={24} />
             </div>
             <div>
                 <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>メール叩きくん</h1>
                 <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>メール下書き作成アシスタント</p>
             </div>
        </div>

        {/* Content */}
        <div style={{
            background: "var(--card-bg)",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            border: "1px solid var(--card-border)",
            boxShadow: "0 4px 6px rgba(0,0,0,0.02)"
        }}>
           <div style={{ width: 80, height: 80, background: "#fef3c7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "#d97706" }}>
               <Hammer size={32} />
           </div>
           
           <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>開発中 (Coming Soon)</h2>
           <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 32 }}>
               この機能は現在開発中です。<br />
               より便利なメール作成体験をお届けするために準備を進めています。
           </p>

           <div style={{ textAlign: "left", background: "var(--background)", padding: 20, borderRadius: 8 }}>
               <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                   <Clock size={16} /> 予定している機能
               </h3>
               <ul style={{ paddingLeft: 20, margin: 0, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8 }}>
                   <li>状況説明からのメールテンプレート自動生成</li>
                   <li>よく使うビジネスフレーズの提案・挿入</li>
                   <li>英語・中国語など多言語への翻訳対応</li>
               </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
