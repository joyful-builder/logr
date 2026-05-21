import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import { useTabStore } from "../../stores/tabStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { LogLine } from "../../types";
import { useFileWatcher } from "../../hooks/useFileWatcher";

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "#f87171",
  WARN: "#fbbf24",
  INFO: "#60a5fa",
  DEBUG: "#94a3b8",
};

const ROW_HEIGHT = 18;

function getLevelColor(level?: string): string {
  return level ? (LEVEL_COLORS[level] ?? "var(--color-text-primary)") : "var(--color-text-primary)";
}

export default function LogViewer() {
  const { getActiveTab, updateTab } = useTabStore();
  const { defaultTailLines } = useSettingsStore();
  const activeTab = getActiveTab();

  const [lines, setLines] = useState<LogLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 30,
  });

  // 초기 파일 로드
  const loadLines = useCallback(async (filePath: string, encoding: string) => {
    setIsLoading(true);
    setError(null);
    setLines([]);
    atBottomRef.current = true;
    try {
      const result = await invoke<LogLine[]>("read_tail", {
        path: filePath,
        lines: defaultTailLines,
        encoding,
      });
      setLines(result);
    } catch (err) {
      setError(typeof err === "string" ? err : "파일 읽기 실패");
    } finally {
      setIsLoading(false);
    }
  }, [defaultTailLines]);

  useEffect(() => {
    if (!activeTab) {
      setLines([]);
      setError(null);
      return;
    }
    loadLines(activeTab.filePath, activeTab.encoding);
  }, [activeTab?.id, activeTab?.filePath]);

  // 새 줄 추가 (follow 모드에서 호출)
  const handleNewLines = useCallback((newLines: LogLine[]) => {
    setLines((prev) => {
      const baseIndex = prev.length > 0 ? prev[prev.length - 1].index + 1 : 0;
      return [
        ...prev,
        ...newLines.map((line, i) => ({ ...line, index: baseIndex + i })),
      ];
    });
  }, []);

  // follow 모드 파일 감시
  useFileWatcher(
    activeTab?.filePath ?? null,
    activeTab?.isFollowing ?? false,
    activeTab?.encoding ?? "UTF-8",
    handleNewLines
  );

  // 초기 로드 완료 후 하단 스크롤
  useEffect(() => {
    if (!isLoading && lines.length > 0) {
      virtualizer.scrollToIndex(lines.length - 1, { align: "end" });
    }
  }, [isLoading]);

  // 새 줄이 추가될 때 바닥에 있으면 자동 스크롤
  useEffect(() => {
    if (activeTab?.isFollowing && atBottomRef.current && lines.length > 0) {
      virtualizer.scrollToIndex(lines.length - 1, { align: "end" });
    }
  }, [lines.length]);

  // 스크롤 위치 추적 (사용자가 위로 스크롤 시 자동 스크롤 일시 중지)
  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distFromBottom < 60;
    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  // F 키: follow 모드 토글
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        if (activeTab) {
          updateTab(activeTab.id, { isFollowing: !activeTab.isFollowing });
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTab?.id, activeTab?.isFollowing]);

  // ── 빈 상태 ──
  if (!activeTab) {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1 gap-3 select-none"
        style={{ backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-secondary)" }}
      >
        <div style={{ fontSize: 48, opacity: 0.3 }}>📄</div>
        <div className="text-sm font-medium">파일을 열어 로그를 확인하세요</div>
        <div className="text-xs opacity-60">사이드바의 "파일 열기" 버튼을 사용하세요</div>
      </div>
    );
  }

  // ── 로딩 ──
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1 gap-2 select-none"
        style={{ backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-secondary)" }}
      >
        <div className="text-xs animate-pulse">로딩 중...</div>
        <div className="text-xs opacity-60 truncate max-w-xs" title={activeTab.filePath}>
          {activeTab.filePath.split(/[\\/]/).pop()}
        </div>
      </div>
    );
  }

  // ── 에러 ──
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1 gap-2 select-none"
        style={{ backgroundColor: "var(--color-bg-primary)", color: "#f87171" }}
      >
        <div className="text-sm font-medium">파일 읽기 오류</div>
        <div className="text-xs opacity-80 max-w-sm text-center">{error}</div>
      </div>
    );
  }

  // ── 가상 스크롤 뷰어 ──
  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-primary)", position: "relative" }}
    >
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto font-mono text-xs"
        onScroll={handleScroll}
        style={{ color: "var(--color-text-primary)" }}
      >
        {lines.length === 0 ? (
          <div
            className="flex items-center justify-center h-full italic"
            style={{ color: "var(--color-text-secondary)" }}
          >
            파일이 비어 있습니다
          </div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const line = lines[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: virtualRow.start,
                    left: 0,
                    right: 0,
                    height: ROW_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor:
                      line.level === "ERROR"
                        ? "rgba(248, 113, 113, 0.06)"
                        : "transparent",
                  }}
                >
                  {/* 줄 번호 */}
                  <span
                    className="shrink-0 text-right select-none"
                    style={{
                      width: 52,
                      minWidth: 52,
                      paddingRight: 8,
                      paddingLeft: 4,
                      color: "var(--color-text-secondary)",
                      opacity: 0.45,
                      fontSize: 11,
                    }}
                  >
                    {line.index + 1}
                  </span>
                  {/* 로그 내용 */}
                  <span
                    className="truncate pr-2"
                    style={{
                      color: getLevelColor(line.level),
                      fontSize: 12,
                      lineHeight: `${ROW_HEIGHT}px`,
                    }}
                    title={line.content}
                  >
                    {line.content}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* follow 모드에서 위로 스크롤 시 "최신 줄로 이동" 버튼 */}
      {activeTab.isFollowing && !isAtBottom && (
        <div
          className="absolute bottom-8 right-4 text-xs px-3 py-1 rounded-full cursor-pointer select-none"
          style={{
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            zIndex: 10,
          }}
          onClick={() => {
            virtualizer.scrollToIndex(lines.length - 1, { align: "end" });
            atBottomRef.current = true;
            setIsAtBottom(true);
          }}
        >
          ↓ 최신 줄로
        </div>
      )}
    </div>
  );
}
