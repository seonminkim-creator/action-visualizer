import React, { useState, useMemo } from "react";
import { History, RefreshCw, Search, X, Plus, Cloud, Check, ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeader from "./SectionHeader";
import CategoryAddForm from "./CategoryAddForm";
import { HistoryItem, DriveMeeting, Category, MeetingSummary } from "../types";

type Props = {
  history: HistoryItem[];
  driveMeetings: DriveMeeting[];
  categories: Category[];
  isDriveConnected: boolean;
  loadingFromDrive: boolean;
  savedFolderId: string | null;
  onLoadDriveMeetings: () => void;
  onLoadMeetingFromDrive: (folderId: string) => void;
  onSetResult: (result: MeetingSummary) => void;
  onDeleteHistoryItem: (id: string) => void;
  onDeleteMeetingFromDrive: (folderId: string, e: React.MouseEvent) => void;
  onDeleteCategory: (id: string) => void;
  onAddCategory: (name: string) => void;
};

const Sidebar = ({
  history,
  driveMeetings,
  categories,
  isDriveConnected,
  loadingFromDrive,
  savedFolderId,
  onLoadDriveMeetings,
  onLoadMeetingFromDrive,
  onSetResult,
  onDeleteHistoryItem,
  onDeleteMeetingFromDrive,
  onDeleteCategory,
  onAddCategory,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // カレンダーヘルパー関数
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatCalendarDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  // 統合された履歴リスト（Drive + ローカル）
  const combinedHistory = useMemo(() => {
    // Drive会議をリストアイテム形式に変換
    const driveItems = driveMeetings.map(meeting => ({
      id: `drive-${meeting.folderId}`,
      folderId: meeting.folderId,
      date: meeting.date,
      title: meeting.title,
      category: meeting.category,
      isDrive: true,
      summary: null as MeetingSummary | null,
    }));

    // ローカル履歴をリストアイテム形式に変換
    const localItems = history.map(item => ({
      id: item.id,
      folderId: null as string | null,
      date: item.date,
      title: item.title || item.summary.title || "無題",
      category: item.category,
      isDrive: false,
      summary: item.summary,
      highlight: item.highlight,
    }));

    // 両方を結合して日付でソート
    return [...driveItems, ...localItems].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [driveMeetings, history]);

  // フィルターされた統合履歴
  const filteredCombinedHistory = combinedHistory.filter(item => {
    const matchesSearch = !searchQuery ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === "all" || item.category === filterCategory;

    const matchesDate = !selectedDate || (() => {
      const itemDate = new Date(item.date);
      return itemDate.toDateString() === selectedDate.toDateString();
    })();

    return matchesSearch && matchesCategory && matchesDate;
  });

  // 履歴の日付マーカー用
  const combinedHistoryDates = new Set(combinedHistory.map(item => new Date(item.date).toDateString()));

  return (
    <div style={{
      width: 280,
      flexShrink: 0,
      background: "var(--card-bg)",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      maxHeight: "calc(100vh - 120px)",
    }}>
      {/* 履歴セクション（スクロール可能エリア） */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <SectionHeader
          icon={<History style={{ width: 16, height: 16, color: "#667eea" }} />}
          title="履歴"
          count={filteredCombinedHistory.length}
          action={
            isDriveConnected && (
              <button
                onClick={() => onLoadDriveMeetings()}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "1px solid var(--card-border)",
                  background: "var(--background)",
                  color: "var(--text-secondary)",
                  fontSize: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <RefreshCw style={{ width: 10, height: 10 }} />
                更新
              </button>
            )
          }
        />

        {/* 検索 */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search style={{
            width: 14,
            height: 14,
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-tertiary)"
          }} />
          <input
            type="text"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 8px 8px 32px",
              borderRadius: 6,
              border: "1px solid var(--card-border)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: 13,
            }}
          />
        </div>

        {/* カテゴリーフィルター */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              style={{
                position: "relative",
                display: "inline-flex",
              }}
            >
              <button
                onClick={() => setFilterCategory(cat.id)}
                style={{
                  padding: "4px 8px",
                  paddingRight: cat.id !== "all" && cat.id !== "general" ? 20 : 8,
                  borderRadius: 4,
                  background: filterCategory === cat.id ? cat.color : "var(--background)",
                  color: filterCategory === cat.id ? "white" : "var(--text-secondary)",
                  border: "1px solid var(--card-border)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {cat.name}
              </button>
              {cat.id !== "all" && cat.id !== "general" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }}
                  style={{
                    position: "absolute",
                    right: 2,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 14,
                    height: 14,
                    padding: 0,
                    borderRadius: "50%",
                    background: filterCategory === cat.id ? "rgba(255,255,255,0.3)" : "var(--card-border)",
                    color: filterCategory === cat.id ? "white" : "var(--text-tertiary)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                  }}
                  title="カテゴリーを削除"
                >
                  <X style={{ width: 8, height: 8 }} />
                </button>
              )}
            </div>
          ))}
          {!showAddCategory ? (
            <button
              onClick={() => setShowAddCategory(true)}
              style={{
                padding: "4px 6px",
                borderRadius: 4,
                background: "var(--background)",
                color: "var(--text-secondary)",
                border: "1px dashed var(--card-border)",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              <Plus style={{ width: 10, height: 10 }} />
            </button>
          ) : (
            <CategoryAddForm
              onAdd={onAddCategory}
              onCancel={() => setShowAddCategory(false)}
            />
          )}
        </div>

        {/* 統合履歴リスト */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", minHeight: 0 }}>
          {filteredCombinedHistory.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, textAlign: "center", padding: 8 }}>
              履歴がありません
            </p>
          ) : (
            filteredCombinedHistory.map((item) => {
              const itemCategory = categories.find(c => c.id === item.category) || categories.find(c => c.id === "general");
              const categoryColor = itemCategory?.color || "#6b7280";
              const isActive = item.isDrive ? savedFolderId === item.folderId : false;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.isDrive && item.folderId) {
                      onLoadMeetingFromDrive(item.folderId);
                    } else if (item.summary) {
                      onSetResult(item.summary);
                    }
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: isActive ? "rgba(66, 133, 244, 0.1)" : "var(--background)",
                    borderLeft: `4px solid ${categoryColor}`,
                    border: "1px solid var(--card-border)",
                    borderLeftWidth: 4,
                    borderLeftColor: categoryColor,
                    cursor: loadingFromDrive ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {item.isDrive && (
                        <Cloud style={{ width: 12, height: 12, color: "#4285f4", flexShrink: 0 }} />
                      )}
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {item.date}
                      </div>
                      {itemCategory && itemCategory.id !== "all" && (
                        <span style={{
                          fontSize: 9,
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: categoryColor,
                          color: "white",
                          fontWeight: 500,
                        }}>
                          {itemCategory.name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                      {item.title || "無題"}
                    </div>
                  </div>
                  {isActive && (
                    <Check style={{ width: 14, height: 14, color: "#10b981", flexShrink: 0 }} />
                  )}
                  <button
                    onClick={(e) => {
                      if (item.isDrive && item.folderId) {
                        onDeleteMeetingFromDrive(item.folderId, e);
                      } else {
                        e.stopPropagation();
                        onDeleteHistoryItem(item.id);
                      }
                    }}
                    style={{
                      padding: 4,
                      borderRadius: 4,
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                    title={item.isDrive ? "Driveから削除" : "履歴から削除"}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* カレンダー（固定位置） */}
      <div style={{
        borderTop: "1px solid var(--card-border)",
        paddingTop: 16,
        marginTop: 16,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button
            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
            style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            {formatCalendarDate(calendarDate)}
          </span>
          <button
            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
            style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {["日", "月", "火", "水", "木", "金", "土"].map(day => (
            <div key={day} style={{
              textAlign: "center",
              fontSize: 10,
              color: day === "日" ? "#ef4444" : day === "土" ? "#3b82f6" : "var(--text-secondary)",
              padding: "4px 0"
            }}>
              {day}
            </div>
          ))}
          {Array.from({ length: getFirstDayOfMonth(calendarDate.getFullYear(), calendarDate.getMonth()) }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth()) }).map((_, i) => {
            const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i + 1);
            const hasHistory = combinedHistoryDates.has(date.toDateString());
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();
            const dayOfWeek = date.getDay();

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                style={{
                  padding: "4px 0",
                  borderRadius: 4,
                  background: isSelected ? "#667eea" : isToday ? "#f1f5f9" : "transparent",
                  color: isSelected ? "white" : dayOfWeek === 0 ? "#ef4444" : dayOfWeek === 6 ? "#3b82f6" : "var(--foreground)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: isToday ? 600 : 400,
                  position: "relative",
                }}
              >
                {i + 1}
                {hasHistory && !isSelected && (
                  <div style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#10b981",
                  }} />
                )}
              </button>
            );
          })}
        </div>
        {selectedDate && (
          <button
            onClick={() => setSelectedDate(null)}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "4px 8px",
              borderRadius: 4,
              background: "var(--background)",
              color: "var(--text-secondary)",
              border: "1px solid var(--card-border)",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            日付フィルタをクリア
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
