import { useState, useRef, useEffect } from "react";
import { useT } from "../../i18n";

interface SearchBarProps {
  onSearch: (query: string, isRegex: boolean, caseSensitive: boolean) => void;
  onClose: () => void;
  resultCount: number | null;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function SearchBar({ onSearch, onClose, resultCount, currentIndex, onPrev, onNext }: SearchBarProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearch(value, isRegex, caseSensitive);
  };

  const handleToggle = (type: "regex" | "case") => {
    const newRegex = type === "regex" ? !isRegex : isRegex;
    const newCase = type === "case" ? !caseSensitive : caseSensitive;
    if (type === "regex") setIsRegex(newRegex);
    else setCaseSensitive(newCase);
    onSearch(query, newRegex, newCase);
  };

  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{ height: 36, backgroundColor: "var(--color-bg-tertiary)", borderBottom: "1px solid var(--color-border)" }}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("search.placeholder")}
        className="flex-1 text-xs outline-none bg-transparent"
        style={{ color: "var(--color-text-primary)" }}
      />
      {resultCount !== null && (
        <span className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>
          {resultCount === 0 ? t("search.noResults") : `${currentIndex + 1} / ${resultCount}`}
        </span>
      )}
      <button className="text-xs px-1 hover:opacity-80" style={{ color: "var(--color-text-secondary)" }} onClick={onPrev} title={t("search.prev")}>▲</button>
      <button className="text-xs px-1 hover:opacity-80" style={{ color: "var(--color-text-secondary)" }} onClick={onNext} title={t("search.next")}>▼</button>
      <button
        className="text-xs px-2 py-0.5 rounded font-mono"
        style={{ backgroundColor: isRegex ? "var(--color-accent)" : "var(--color-bg-secondary)", color: isRegex ? "#fff" : "var(--color-text-secondary)" }}
        onClick={() => handleToggle("regex")}
        title={t("search.regex")}
      >
        .*
      </button>
      <button
        className="text-xs px-2 py-0.5 rounded"
        style={{ backgroundColor: caseSensitive ? "var(--color-accent)" : "var(--color-bg-secondary)", color: caseSensitive ? "#fff" : "var(--color-text-secondary)" }}
        onClick={() => handleToggle("case")}
        title={t("search.case")}
      >
        Aa
      </button>
      <button className="text-xs px-1 hover:opacity-80" style={{ color: "var(--color-text-secondary)" }} onClick={onClose} title={t("search.close")}>✕</button>
    </div>
  );
}
