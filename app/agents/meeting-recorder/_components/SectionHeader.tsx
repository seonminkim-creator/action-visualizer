import React from "react";

type Props = {
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
};

const SectionHeader = ({ icon, title, count, action }: Props) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid var(--card-border)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
      {count !== undefined && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--background)", padding: "2px 8px", borderRadius: 10 }}>
          {count}件
        </span>
      )}
    </div>
    {action}
  </div>
);

export default SectionHeader;
