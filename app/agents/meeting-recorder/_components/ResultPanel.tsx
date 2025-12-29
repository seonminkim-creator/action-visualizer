import React, { useState } from "react";
import { MessageSquare, Loader2, Save, Edit3, Check, Copy, Cloud, ExternalLink, X, Plus } from "lucide-react";
import SectionHeader from "./SectionHeader";
import { MeetingSummary, Category } from "../types";

type Props = {
  loading: boolean;
  result: MeetingSummary | null;
  processingStage: string;
  isEditMode: boolean;
  onSetIsEditMode: (isEdit: boolean) => void;
  onSetResult: (result: MeetingSummary | null) => void;
  isDriveConnected: boolean;
  categories: Category[];
  selectedCategory: string;
  onSetSelectedCategory: (category: string) => void;
  uploadingToDrive: boolean;
  savedFolderId: string | null;
  meetingTitle: string;
  onUploadToDrive: (title: string, category: string, summaryData?: MeetingSummary) => void;
  style?: React.CSSProperties;
};

const priorityColors = {
  high: { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", label: "高" },
  medium: { bg: "#fef3c7", border: "#fcd34d", text: "#d97706", label: "中" },
  low: { bg: "#f0f9ff", border: "#93c5fd", text: "#2563eb", label: "低" },
};

const ResultPanel = ({
  loading,
  result,
  processingStage,
  isEditMode,
  onSetIsEditMode,
  onSetResult,
  isDriveConnected,
  categories,
  selectedCategory,
  onSetSelectedCategory,
  uploadingToDrive,
  savedFolderId,
  meetingTitle,
  onUploadToDrive,
  style,
}: Props) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  async function copyToClipboard(text: string, sectionName: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error("コピーに失敗:", err);
    }
  }

  function getSummaryText(): string {
    if (!result) return "";
    const { summary } = result;
    return `【会議の目的】\n${summary.purpose}\n\n【主な議論内容】\n${summary.discussions.map(d => d).join("\n")}\n\n【決定事項】\n${summary.decisions.map(d => d).join("\n")}`;
  }

  function getTodosText(): string {
    if (!result) return "";
    const sortedTodos = [...result.todos].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    return sortedTodos.map(todo => {
      const priorityLabel = priorityColors[todo.priority].label;
      const deadline = todo.deadline ? ` [期限: ${todo.deadline}]` : "";
      return `[優先度: ${priorityLabel}] [担当: ${todo.assignee}]${deadline} ${todo.task}`;
    }).join("\n");
  }

  return (
    <div style={{
      background: "var(--card-bg)",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      ...style
    }}>
      {/* セクションヘッダー（常に表示） */}
      <SectionHeader
        icon={<MessageSquare style={{ width: 16, height: 16, color: "#fa709a" }} />}
        title="議事録"
      />

      {loading ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", color: "#667eea", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{processingStage || "処理中..."}</p>
        </div>
      ) : !result ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--text-tertiary)" }}>
          <MessageSquare style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, margin: 0 }}>議事録がここに表示されます</p>
          <p style={{ fontSize: 12, margin: "8px 0 0 0", textAlign: "center" }}>音声を録音するか、テキストを入力して<br />「議事録を作成」をクリックしてください</p>
        </div>
      ) : (
        <>
          {/* タイトルとハイライト表示（編集モード対応） */}
          <div style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: "linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(254, 225, 64, 0.1) 100%)",
            borderRadius: 8,
            border: "1px solid rgba(250, 112, 154, 0.2)",
          }}>
            {isEditMode ? (
              <input
                type="text"
                value={result.title || ""}
                onChange={(e) => onSetResult({ ...result, title: e.target.value })}
                placeholder="会議タイトルを入力"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--card-border)",
                  background: "var(--background)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                {result.title || "会議議事録"}
              </h2>
            )}
            {result.summary?.purpose && !isEditMode && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0 0", lineHeight: 1.4 }}>
                {result.summary.purpose.substring(0, 80)}{result.summary.purpose.length > 80 ? "..." : ""}
              </p>
            )}
          </div>

          {/* アクションボタンバー（統合） */}
          <div style={{
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid var(--card-border)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}>
            {/* 編集/保存モード切替 */}
            <button
              onClick={() => onSetIsEditMode(!isEditMode)}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                background: isEditMode ? "#10b981" : "var(--background)",
                color: isEditMode ? "white" : "var(--text-secondary)",
                border: "1px solid var(--card-border)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isEditMode ? (
                <>
                  <Save style={{ width: 14, height: 14 }} />
                  内容を保存
                </>
              ) : (
                <>
                  <Edit3 style={{ width: 14, height: 14 }} />
                  編集モード
                </>
              )}
            </button>

            {/* すべてコピー */}
            <button
              onClick={() => {
                const allText = `【会議タイトル】\n${result.title || "無題"}\n\n${getSummaryText()}\n\n【TODOリスト】\n${getTodosText()}\n\n【詳細議事録】\n${result.detailedMinutes}`;
                copyToClipboard(allText, "all");
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                background: copiedSection === "all" ? "#10b981" : "var(--background)",
                color: copiedSection === "all" ? "white" : "var(--text-secondary)",
                border: "1px solid var(--card-border)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {copiedSection === "all" ? (
                <>
                  <Check style={{ width: 14, height: 14 }} />
                  コピー済み
                </>
              ) : (
                <>
                  <Copy style={{ width: 14, height: 14 }} />
                  すべてコピー
                </>
              )}
            </button>

            {/* Drive保存（接続時のみ） */}
            {isDriveConnected && (
              <>
                {/* カテゴリー選択 */}
                <select
                  value={selectedCategory}
                  onChange={(e) => onSetSelectedCategory(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--card-border)",
                    background: "var(--background)",
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                >
                  {categories.filter(c => c.id !== "all").map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                {/* Drive保存/更新ボタン */}
                <button
                  onClick={() => onUploadToDrive(result.title || meetingTitle || "", selectedCategory, result)}
                  disabled={uploadingToDrive || !result.title}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    background: uploadingToDrive || !result.title
                      ? "var(--text-tertiary)"
                      : savedFolderId ? "#10b981" : "#4285f4",
                    color: "white",
                    border: "none",
                    cursor: uploadingToDrive || !result.title ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {uploadingToDrive ? (
                    <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Cloud style={{ width: 14, height: 14 }} />
                  )}
                  {uploadingToDrive ? "保存中..." : savedFolderId ? "Driveを更新" : "Driveに保存"}
                </button>

                {/* フォルダーを開く（保存済みの場合） */}
                {savedFolderId && (
                  <button
                    onClick={() => window.open(`https://drive.google.com/drive/folders/${savedFolderId}`, "_blank")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 6,
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ExternalLink style={{ width: 14, height: 14 }} />
                    フォルダーを開く
                  </button>
                )}
              </>
            )}
          </div>

          {/* 会議の目的 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>会議の目的</h3>
            {isEditMode ? (
              <textarea
                value={result.summary.purpose}
                onChange={(e) => onSetResult({
                  ...result,
                  summary: { ...result.summary, purpose: e.target.value }
                })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--card-border)",
                  background: "var(--background)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  minHeight: 60,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>
                {result.summary.purpose}
              </p>
            )}
          </div>

          {/* 主な議論内容 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>主な議論内容</h3>
            {isEditMode ? (
              <textarea
                value={result.summary.discussions.join("\n")}
                onChange={(e) => onSetResult({
                  ...result,
                  summary: { ...result.summary, discussions: e.target.value.split("\n").filter(d => d.trim()) }
                })}
                placeholder="1行に1項目ずつ入力"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--card-border)",
                  background: "var(--background)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  minHeight: 80,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {result.summary.discussions.map((d, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 4, lineHeight: 1.6 }}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          {/* 決定事項 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>決定事項</h3>
            {isEditMode ? (
              <textarea
                value={result.summary.decisions.join("\n")}
                onChange={(e) => onSetResult({
                  ...result,
                  summary: { ...result.summary, decisions: e.target.value.split("\n").filter(d => d.trim()) }
                })}
                placeholder="1行に1項目ずつ入力"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--card-border)",
                  background: "var(--background)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  minHeight: 80,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {result.summary.decisions.map((d, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 4, lineHeight: 1.6 }}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          {/* TODOリスト */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>TODOリスト</h3>
            {isEditMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.todos.sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return order[a.priority] - order[b.priority];
                }).map((todo, i) => {
                  const p = priorityColors[todo.priority];
                  return (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px",
                      background: "var(--background)",
                      borderRadius: 6,
                      border: "1px solid var(--card-border)",
                    }}>
                      <select
                        value={todo.priority}
                        onChange={(e) => {
                          const newTodos = [...result.todos];
                          newTodos[i] = { ...todo, priority: e.target.value as "high" | "medium" | "low" };
                          onSetResult({ ...result, todos: newTodos });
                        }}
                        style={{
                          padding: "4px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          background: p.bg,
                          border: `1px solid ${p.border}`,
                          color: p.text,
                          cursor: "pointer",
                        }}
                      >
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                      <input
                        type="text"
                        value={todo.assignee}
                        onChange={(e) => {
                          const newTodos = [...result.todos];
                          newTodos[i] = { ...todo, assignee: e.target.value };
                          onSetResult({ ...result, todos: newTodos });
                        }}
                        placeholder="担当者"
                        style={{
                          width: 70,
                          padding: "4px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          background: "#f1f5f9",
                          border: "1px solid var(--card-border)",
                          color: "var(--text-secondary)",
                        }}
                      />
                      <input
                        type="text"
                        value={todo.deadline || ""}
                        onChange={(e) => {
                          const newTodos = [...result.todos];
                          newTodos[i] = { ...todo, deadline: e.target.value || undefined };
                          onSetResult({ ...result, todos: newTodos });
                        }}
                        placeholder="期限"
                        style={{
                          width: 80,
                          padding: "4px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          background: "#fef3c7",
                          border: "1px solid #fcd34d",
                          color: "#d97706",
                        }}
                      />
                      <input
                        type="text"
                        value={todo.task}
                        onChange={(e) => {
                          const newTodos = [...result.todos];
                          newTodos[i] = { ...todo, task: e.target.value };
                          onSetResult({ ...result, todos: newTodos });
                        }}
                        placeholder="タスク内容"
                        style={{
                          flex: 1,
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          border: "1px solid var(--card-border)",
                          background: "white",
                        }}
                      />
                      <button
                        onClick={() => {
                          const newTodos = result.todos.filter((_, idx) => idx !== i);
                          onSetResult({ ...result, todos: newTodos });
                        }}
                        style={{
                          padding: "4px 6px",
                          borderRadius: 4,
                          background: "transparent",
                          border: "none",
                          color: "var(--text-tertiary)",
                          cursor: "pointer",
                        }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    const newTodo = { task: "", assignee: "未定", priority: "medium" as const };
                    onSetResult({ ...result, todos: [...result.todos, newTodo] });
                  }}
                  style={{
                    padding: "8px",
                    borderRadius: 6,
                    background: "var(--background)",
                    border: "1px dashed var(--card-border)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  TODOを追加
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.todos.sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return order[a.priority] - order[b.priority];
                }).map((todo, i) => {
                  const p = priorityColors[todo.priority];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13 }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        background: p.bg,
                        border: `1px solid ${p.border}`,
                        color: p.text,
                        flexShrink: 0,
                      }}>
                        {p.label}
                      </span>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 10,
                        background: "#f1f5f9",
                        color: "var(--text-secondary)",
                        flexShrink: 0,
                      }}>
                        {todo.assignee}
                      </span>
                      {todo.deadline && (
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          background: "#fef3c7",
                          color: "#d97706",
                          flexShrink: 0,
                        }}>
                          {todo.deadline}
                        </span>
                      )}
                      <span style={{ flex: 1 }}>{todo.task}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 詳細議事録 */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>詳細議事録</h3>
            {isEditMode ? (
              <textarea
                value={result.detailedMinutes}
                onChange={(e) => onSetResult({ ...result, detailedMinutes: e.target.value })}
                placeholder="Markdown形式で入力できます"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 6,
                  border: "1px solid var(--card-border)",
                  background: "var(--background)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  minHeight: 200,
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            ) : (
              <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {result.detailedMinutes}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ResultPanel;
