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
        background: "white",
        border: "1px solid #e5e7eb",
        color: "#1e293b",
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 500,
        transition: "all 0.2s",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#cbd5e1";
        e.currentTarget.style.background = "#f8fafc";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.background = "white";
      }}
    >
      <ArrowLeft size={16} />
      ホームに戻る
    </Link>
  );
}
