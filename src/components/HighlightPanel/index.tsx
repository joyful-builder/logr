import { useState } from "react";
import { HighlightRule } from "../../types";
import { useT } from "../../i18n";

const PRESET_COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#c084fc", "#fb923c"];

interface Props {
  rules: HighlightRule[];
  onChange: (rules: HighlightRule[]) => void;
  onClose: () => void;
}

export default function HighlightPanel({ rules, onChange, onClose }: Props) {
  const t = useT();
  const [pattern, setPattern] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isRegex, setIsRegex] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!pattern.trim()) return;
    if (isRegex) {
      try { new RegExp(pattern); } catch {
        setError(t("highlight.invalidRegex"));
        return;
      }
    }
    onChange([...rules, { pattern: pattern.trim(), color, isRegex }]);
    setPattern("");
    setError("");
  };

  const handleRemove = (idx: number) => {
    onChange(rules.filter((_, i) => i !== idx));
  };

  return (
    <div
      className="absolute flex flex-col"
      style={{
        right: 8, bottom: 36, width: 320, maxHeight: 420,
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 100,
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold"
        style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
      >
        <span>{t("highlight.title")}</span>
        <button onClick={onClose} style={{ color: "var(--color-text-secondary)" }} className="hover:opacity-80">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1" style={{ minHeight: 0 }}>
        {rules.length === 0 ? (
          <div className="text-xs py-3 text-center" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
            {t("highlight.noRules")}
          </div>
        ) : (
          rules.map((rule, idx) => (
            <div key={idx} className="flex items-center gap-2 py-1.5 px-1 group">
              <div className="shrink-0 rounded" style={{ width: 12, height: 12, backgroundColor: rule.color, border: "1px solid rgba(255,255,255,0.15)" }} />
              <span className="flex-1 text-xs truncate" style={{ color: "var(--color-text-primary)" }}>{rule.pattern}</span>
              {rule.isRegex && (
                <span className="text-xs px-1 rounded" style={{ color: "var(--color-accent)", border: "1px solid var(--color-accent)", opacity: 0.8 }}>.*</span>
              )}
              <button className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }} onClick={() => handleRemove(idx)}>✕</button>
            </div>
          ))
        )}
      </div>

      <div className="px-3 py-2" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-1.5 mb-2">
          {PRESET_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="rounded-full transition-transform" style={{ width: 16, height: 16, backgroundColor: c, border: color === c ? "2px solid #fff" : "2px solid transparent", transform: color === c ? "scale(1.2)" : "scale(1)" }} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="rounded cursor-pointer" style={{ width: 22, height: 22, padding: 0, border: "none", background: "none" }} title={t("highlight.colorPicker")} />
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={pattern}
            onChange={(e) => { setPattern(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={t("highlight.patternPlaceholder")}
            className="flex-1 text-xs outline-none rounded px-2 py-1"
            style={{ backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-primary)", border: `1px solid ${error ? "#f87171" : "var(--color-border)"}` }}
          />
          <button
            onClick={() => setIsRegex((v) => !v)}
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: isRegex ? "rgba(79,142,247,0.18)" : "var(--color-bg-tertiary)", color: isRegex ? "var(--color-accent)" : "var(--color-text-secondary)", border: `1px solid ${isRegex ? "var(--color-accent)" : "var(--color-border)"}` }}
            title={t("highlight.regexTooltip")}
          >
            .*
          </button>
          <button
            onClick={handleAdd}
            disabled={!pattern.trim()}
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: pattern.trim() ? "var(--color-accent)" : "var(--color-bg-tertiary)", color: pattern.trim() ? "#fff" : "var(--color-text-secondary)" }}
          >
            {t("highlight.add")}
          </button>
        </div>
        {error && <div className="text-xs mt-1" style={{ color: "#f87171" }}>{error}</div>}
      </div>
    </div>
  );
}
