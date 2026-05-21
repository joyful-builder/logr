import { useTabStore } from "../../stores/tabStore";
import { useT } from "../../i18n";
import { Tab } from "../../types";

// 상태별 색상
// 🟢 초록: 실시간 + 최신 (하단)
// 🟡 노랑: 실시간 + 미확인 새 줄 (스크롤 올림)
// ⚫ 회색: 일시정지 + 변경 없음
// 🟠 주황: 일시정지 + 미확인 변경 있음
function getDotStyle(tab: Tab): { color: string; char: string; className: string; title_key: "tabBar.live" | "tabBar.liveUnread" | "tabBar.paused" | "tabBar.pausedUnread" } {
  if (tab.isFollowing) {
    return tab.hasUnread
      ? { color: "#fbbf24", char: "●", className: "",          title_key: "tabBar.liveUnread" }
      : { color: "#4ade80", char: "●", className: "tab-dot-live", title_key: "tabBar.live" };
  } else {
    return tab.hasUnread
      ? { color: "#fb923c", char: "⏸", className: "",          title_key: "tabBar.pausedUnread" }
      : { color: "#64748b", char: "⏸", className: "",          title_key: "tabBar.paused" };
  }
}

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabStore();
  const t = useT();

  const getFileName = (filePath: string) =>
    filePath.split(/[\\/]/).pop() ?? filePath;

  return (
    <div
      className="flex items-end overflow-x-auto shrink-0"
      style={{
        height: 36,
        backgroundColor: "var(--color-bg-primary)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {tabs.length === 0 ? (
        <div
          className="flex items-center px-4 text-xs italic"
          style={{ color: "var(--color-text-secondary)", height: "100%" }}
        >
          {t("tabBar.noFiles")}
        </div>
      ) : (
        tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const dot = getDotStyle(tab);
          return (
            <div
              key={tab.id}
              className="flex items-center gap-1 px-3 shrink-0 cursor-pointer select-none transition-colors"
              style={{
                height: "100%",
                maxWidth: 200,
                backgroundColor: isActive ? "var(--color-bg-tertiary)" : "transparent",
                borderRight: "1px solid var(--color-border)",
                borderTop: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span
                className="text-xs truncate"
                style={{
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  maxWidth: 140,
                }}
                title={tab.filePath}
              >
                {tab.alias || getFileName(tab.filePath)}
              </span>

              {/* 상태 인디케이터 */}
              <span
                className={`text-xs shrink-0 ${dot.className}`}
                style={{ color: dot.color, fontSize: dot.char === "⏸" ? 9 : 10 }}
                title={t(dot.title_key)}
              >
                {dot.char}
              </span>

              <button
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-0.5 leading-none"
                style={{ color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1 }}
                onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                title={t("tabBar.closeTab")}
              >
                ×
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
