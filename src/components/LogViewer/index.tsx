import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import { useTabStore } from "../../stores/tabStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { LogLine } from "../../types";
import { useFileWatcher } from "../../hooks/useFileWatcher";
import SearchBar from "../SearchBar";
import FilterPanel, { FilterState, createDefaultFilter, LogLevel } from "../FilterPanel";

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

interface MatchInfo {
  lineIndex: number;
  matchStart: number;
  matchEnd: number;
}

function HighlightedContent({
  content,
  color,
  matchStart,
  matchEnd,
}: {
  content: string;
  color: string;
  matchStart?: number;
  matchEnd?: number;
}) {
  if (matchStart === undefined || matchEnd === undefined) {
    return <span style={{ color }}>{content}</span>;
  }
  return (
    <span style={{ color }}>
      {content.slice(0, matchStart)}
      <mark
        style={{
          backgroundColor: "rgba(250, 200, 50, 0.45)",
          color: "inherit",
          borderRadius: 2,
          padding: "0 1px",
        }}
      >
        {content.slice(matchStart, matchEnd)}
      </mark>
      {content.slice(matchEnd)}
    </span>
  );
}

export default function LogViewer() {
  const { getActiveTab, updateTab } = useTabStore();
  const { defaultTailLines } = useSettingsStore();
  const activeTab = getActiveTab();

  const [lines, setLines] = useState<LogLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // 검색 상태
  const [showSearch, setShowSearch] = useState(false);
  const [searchMatches, setSearchMatches] = useState<MatchInfo[] | null>(null);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // 필터 상태
  const [filter, setFilter] = useState<FilterState>(createDefaultFilter());

  const parentRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  // 필터 적용 → 검색 적용 순서로 표시할 줄 결정
  const filteredLines = useMemo(() => {
    const allLevels = ["ERROR", "WARN", "INFO", "DEBUG"] as LogLevel[];
    const allSelected = allLevels.every((l) => filter.levels.has(l));
    const noTextFilter = !filter.includeText && !filter.excludeText;
    if (allSelected && noTextFilter) return lines;

    return lines.filter((line) => {
      // 레벨 필터 (레벨 없는 줄은 항상 표시)
      if (line.level && !filter.levels.has(line.level as LogLevel)) return false;
      // 포함 텍스트
      if (filter.includeText && !line.content.toLowerCase().includes(filter.includeText.toLowerCase())) return false;
      // 제외 텍스트
      if (filter.excludeText && line.content.toLowerCase().includes(filter.excludeText.toLowerCase())) return false;
      return true;
    });
  }, [lines, filter]);

  const displayLines = useMemo(() => {
    if (!searchMatches) return filteredLines;
    return searchMatches.map((m) => filteredLines[m.lineIndex]);
  }, [filteredLines, searchMatches]);

  const virtualizer = useVirtualizer({
    count: displayLines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 30,
  });

  // 초기 파일 로드
  const loadLines = useCallback(async (filePath: string, encoding: string) => {
    setIsLoading(true);
    setError(null);
    setLines([]);
    setSearchMatches(null);
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
    if (!activeTab) { setLines([]); setError(null); return; }
    loadLines(activeTab.filePath, activeTab.encoding);
  }, [activeTab?.id, activeTab?.filePath]);

  // 새 줄 추가 (follow 모드)
  const handleNewLines = useCallback((newLines: LogLine[]) => {
    setLines((prev) => {
      const base = prev.length > 0 ? prev[prev.length - 1].index + 1 : 0;
      return [...prev, ...newLines.map((l, i) => ({ ...l, index: base + i }))];
    });
  }, []);

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

  // follow 모드: 새 줄 도착 시 하단에 있으면 자동 스크롤
  useEffect(() => {
    if (activeTab?.isFollowing && atBottomRef.current && !searchMatches) {
      if (lines.length > 0) virtualizer.scrollToIndex(lines.length - 1, { align: "end" });
    }
  }, [lines.length]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  // ── 검색 ──
  const runSearch = useCallback(
    (query: string, isRegex: boolean, caseSensitive: boolean) => {
      if (!query) { setSearchMatches(null); return; }
      try {
        const flags = caseSensitive ? "" : "i";
        const pattern = isRegex
          ? query
          : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(pattern, flags);

        const matches: MatchInfo[] = [];
        filteredLines.forEach((line, idx) => {
          const m = re.exec(line.content);
          if (m) matches.push({ lineIndex: idx, matchStart: m.index, matchEnd: m.index + m[0].length });
        });
        setSearchMatches(matches);
        setCurrentMatchIdx(0);
        if (matches.length > 0) {
          setTimeout(() => virtualizer.scrollToIndex(0, { align: "center" }), 0);
        }
      } catch {
        setSearchMatches([]);
      }
    },
    [filteredLines]
  );

  const goToMatch = useCallback(
    (idx: number) => {
      if (!searchMatches || searchMatches.length === 0) return;
      const next = (idx + searchMatches.length) % searchMatches.length;
      setCurrentMatchIdx(next);
      virtualizer.scrollToIndex(next, { align: "center" });
    },
    [searchMatches, virtualizer]
  );

  // ── 키보드 단축키 ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Ctrl+F / Cmd+F: 검색 열기
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      if (isInput) return;

      // F: follow 모드 토글
      if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
        if (activeTab) updateTab(activeTab.id, { isFollowing: !activeTab.isFollowing });
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

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1 gap-2 select-none"
        style={{ backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-secondary)" }}
      >
        <div className="text-xs animate-pulse">로딩 중...</div>
        <div className="text-xs opacity-60 truncate max-w-xs">{activeTab.filePath.split(/[\\/]/).pop()}</div>
      </div>
    );
  }

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
      {/* 필터 패널 */}
      <FilterPanel filter={filter} onChange={setFilter} />

      {/* 검색 바 */}
      {showSearch && (
        <SearchBar
          onSearch={runSearch}
          onClose={() => { setShowSearch(false); setSearchMatches(null); }}
          resultCount={searchMatches?.length ?? null}
          currentIndex={currentMatchIdx}
          onPrev={() => goToMatch(currentMatchIdx - 1)}
          onNext={() => goToMatch(currentMatchIdx + 1)}
        />
      )}

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto font-mono text-xs"
        onScroll={handleScroll}
        style={{ color: "var(--color-text-primary)" }}
      >
        {displayLines.length === 0 ? (
          <div
            className="flex items-center justify-center h-full italic"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {searchMatches !== null ? "검색 결과 없음" : "파일이 비어 있습니다"}
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const line = displayLines[vRow.index];
              const match = searchMatches?.[vRow.index];
              const isCurrent = searchMatches !== null && vRow.index === currentMatchIdx;

              return (
                <div
                  key={vRow.key}
                  style={{
                    position: "absolute",
                    top: vRow.start,
                    left: 0,
                    right: 0,
                    height: ROW_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: isCurrent
                      ? "rgba(79, 142, 247, 0.15)"
                      : line.level === "ERROR"
                      ? "rgba(248, 113, 113, 0.06)"
                      : "transparent",
                  }}
                >
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
                  <span
                    className="truncate pr-2"
                    style={{ fontSize: 12, lineHeight: `${ROW_HEIGHT}px`, flex: 1, minWidth: 0 }}
                    title={line.content}
                  >
                    <HighlightedContent
                      content={line.content}
                      color={getLevelColor(line.level)}
                      matchStart={match?.matchStart}
                      matchEnd={match?.matchEnd}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* follow + 위로 스크롤 시 "최신 줄로" 버튼 */}
      {activeTab.isFollowing && !isAtBottom && (
        <div
          className="absolute bottom-2 right-4 text-xs px-3 py-1 rounded-full cursor-pointer select-none"
          style={{ backgroundColor: "var(--color-accent)", color: "#fff", zIndex: 10 }}
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
