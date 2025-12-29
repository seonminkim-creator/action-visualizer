import React, { useState } from "react";
import { X } from "lucide-react";

type Props = {
  onAdd: (name: string) => void;
  onCancel: () => void;
};

const CategoryAddForm = React.memo(({ onAdd, onCancel }: Props) => {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div style={{ display: "flex", gap: 4, width: "100%", marginTop: 4 }}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="カテゴリー名"
        autoFocus
        style={{
          flex: 1,
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid var(--card-border)",
          fontSize: 11,
          background: "var(--background)",
          color: "var(--foreground)",
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onCancel();
          } else if (e.key === "Enter") {
             handleAdd();
          }
        }}
      />
      <button
        onClick={handleAdd}
        style={{ padding: "4px 8px", borderRadius: 4, background: "#10b981", color: "white", border: "none", cursor: "pointer", fontSize: 11 }}
      >
        追加
      </button>
      <button
        onClick={onCancel}
        style={{ padding: "4px 6px", borderRadius: 4, background: "var(--background)", color: "var(--text-secondary)", border: "1px solid var(--card-border)", cursor: "pointer" }}
      >
        <X style={{ width: 10, height: 10 }} />
      </button>
    </div>
  );
});

CategoryAddForm.displayName = "CategoryAddForm";

export default CategoryAddForm;
