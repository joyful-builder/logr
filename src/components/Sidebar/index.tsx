import { open } from "@tauri-apps/plugin-dialog";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useTabStore } from "../../stores/tabStore";
import { useSettingsStore } from "../../stores/settingsStore";

export default function Sidebar() {
  const { bookmarks, addBookmark, removeBookmark } = useBookmarkStore();
  const { addTab, getActiveTab } = useTabStore();
  const { defaultEncoding } = useSettingsStore();
  const activeTab = getActiveTab();

  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Log Files", extensions: ["log", "txt", "out", "err"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (typeof selected === "string") {
      const fileName = selected.split(/[\\/]/).pop() ?? selected;
      addTab({ filePath: selected, alias: fileName, encoding: defaultEncoding, isFollowing: false });
    }
  };

  const handleAddBookmark = async () => {
    if (!activeTab) return;
    const alreadyExists = bookmarks.some((b) => b.filePath === activeTab.filePath);
    if (alreadyExists) return;
    await addBookmark({
      filePath: activeTab.filePath,
      alias: activeTab.alias,
      encoding: activeTab.encoding,
    });
  };

  const handleOpenBookmark = (filePath: string, alias: string, encoding: string) => {
    addTab({ filePath, alias, encoding, isFollowing: false });
  };

  const isCurrentBookmarked = activeTab
    ? bookmarks.some((b) => b.filePath === activeTab.filePath)
    : false;

  return (
    <aside
      className="flex flex-col h-full border-r"
      style={{
        width: 220,
        minWidth: 220,
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}
      >
        <span>즐겨찾기</span>
        <button
          className="hover:opacity-80 transition-opacity text-sm"
          style={{
            color: isCurrentBookmarked ? "var(--color-text-secondary)" : "var(--color-accent)",
            cursor: activeTab && !isCurrentBookmarked ? "pointer" : "default",
            opacity: activeTab && !isCurrentBookmarked ? 1 : 0.4,
          }}
          onClick={handleAddBookmark}
          title={
            !activeTab
              ? "파일을 먼저 열어주세요"
              : isCurrentBookmarked
              ? "이미 즐겨찾기에 추가됨"
              : "현재 파일을 즐겨찾기에 추가"
          }
          disabled={!activeTab || isCurrentBookmarked}
        >
          ★
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span style={{ fontSize: 24 }}>📌</span>
            <span>즐겨찾기가 없습니다</span>
            <span>파일을 열고 ★ 버튼으로 추가하세요</span>
          </div>
        ) : (
          <ul className="py-1">
            {bookmarks.map((bm) => (
              <li key={bm.id} className="group flex items-center">
                <button
                  className="flex-1 text-left px-3 py-2 text-xs truncate hover:opacity-80 transition-opacity min-w-0"
                  style={{ color: "var(--color-text-primary)", backgroundColor: "transparent" }}
                  onClick={() => handleOpenBookmark(bm.filePath, bm.alias, bm.encoding)}
                  title={bm.filePath}
                >
                  <div className="font-medium truncate">{bm.alias || bm.filePath.split(/[\\/]/).pop()}</div>
                  {bm.group && (
                    <div className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {bm.group}
                    </div>
                  )}
                </button>
                {/* 삭제 버튼 (hover 시 표시) */}
                <button
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 px-2 transition-opacity text-xs shrink-0"
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => removeBookmark(bm.id)}
                  title="즐겨찾기 삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <button
          className="w-full text-xs py-2 px-3 rounded transition-opacity hover:opacity-80 font-medium"
          style={{ backgroundColor: "var(--color-accent)", color: "#ffffff" }}
          onClick={handleOpenFile}
        >
          파일 열기
        </button>
      </div>
    </aside>
  );
}
