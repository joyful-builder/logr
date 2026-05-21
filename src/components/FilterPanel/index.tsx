import { useT } from "../../i18n";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export interface FilterState {
  levels: Set<LogLevel>;
  includeText: string;
  excludeText: string;
  caseSensitive: boolean;
}

interface FilterPanelProps {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
}

const ALL_LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG"];

const LEVEL_COLORS: Record<LogLevel, string> = {
  ERROR: "#f87171",
  WARN: "#fbbf24",
  INFO: "#60a5fa",
  DEBUG: "#94a3b8",
};

export function createDefaultFilter(): FilterState {
  return { levels: new Set(ALL_LEVELS), includeText: "", excludeText: "", caseSensitive: false };
}

export default function FilterPanel({ filter, onChange }: FilterPanelProps) {
  const t = useT();

  const toggleLevel = (level: LogLevel) => {
    const next = new Set(filter.levels);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    onChange({ ...filter, levels: next });
  };

  const allSelected = ALL_LEVELS.every((l) => filter.levels.has(l));
  const toggleAll = () => {
    onChange({ ...filter, levels: allSelected ? new Set() : new Set(ALL_LEVELS) });
  };

  return (
    <div
      className="flex items-center gap-3 px-3 shrink-0 text-xs"
      style={{ height: 30, backgroundColor: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)" }}
    >
      <span style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}>{t("filter.label")}</span>

      <div className="flex items-center gap-1">
        <button
          className="px-1.5 py-0.5 rounded text-xs"
          style={{
            backgroundColor: allSelected ? "var(--color-bg-tertiary)" : "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
          }}
          onClick={toggleAll}
          title={t("filter.toggleAll")}
        >
          ALL
        </button>
        {ALL_LEVELS.map((level) => (
          <button
            key={level}
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: filter.levels.has(level) ? `${LEVEL_COLORS[level]}22` : "transparent",
              color: filter.levels.has(level) ? LEVEL_COLORS[level] : "var(--color-text-secondary)",
              border: `1px solid ${filter.levels.has(level) ? LEVEL_COLORS[level] + "66" : "var(--color-border)"}`,
              opacity: filter.levels.has(level) ? 1 : 0.4,
            }}
            onClick={() => toggleLevel(level)}
          >
            {level}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={filter.includeText}
        onChange={(e) => onChange({ ...filter, includeText: e.target.value })}
        placeholder={t("filter.includePlaceholder")}
        className="text-xs outline-none bg-transparent border rounded px-2 py-0.5"
        style={{ color: "var(--color-text-primary)", borderColor: "var(--color-border)", width: 100 }}
      />
      <input
        type="text"
        value={filter.excludeText}
        onChange={(e) => onChange({ ...filter, excludeText: e.target.value })}
        placeholder={t("filter.excludePlaceholder")}
        className="text-xs outline-none bg-transparent border rounded px-2 py-0.5"
        style={{ color: "var(--color-text-primary)", borderColor: "var(--color-border)", width: 100 }}
      />

      <button
        className="px-1.5 py-0.5 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: filter.caseSensitive ? "rgba(79,142,247,0.18)" : "transparent",
          color: filter.caseSensitive ? "var(--color-accent)" : "var(--color-text-secondary)",
          border: `1px solid ${filter.caseSensitive ? "var(--color-accent)" : "var(--color-border)"}`,
          opacity: filter.caseSensitive ? 1 : 0.6,
        }}
        onClick={() => onChange({ ...filter, caseSensitive: !filter.caseSensitive })}
        title={t("filter.caseSensitive")}
      >
        Aa
      </button>

      {(!allSelected || filter.includeText || filter.excludeText || filter.caseSensitive) && (
        <button
          className="text-xs hover:opacity-80"
          style={{ color: "var(--color-text-secondary)" }}
          onClick={() => onChange(createDefaultFilter())}
          title={t("filter.reset")}
        >
          {t("filter.reset")}
        </button>
      )}
    </div>
  );
}
