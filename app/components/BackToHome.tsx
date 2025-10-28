"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackToHome() {
  return (
    <Link
      href="/"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 8,
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        color: "var(--foreground)",
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 500,
        transition: "all 0.2s",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--text-secondary)";
        e.currentTarget.style.background = "var(--background)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--card-border)";
        e.currentTarget.style.background = "var(--card-bg)";
      }}
    >
      <ArrowLeft size={16} />
      ホームに戻る
    </Link>
  );
}
