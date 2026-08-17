"use client";

import { useMemo, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { inputClass } from "@/components/ui/formClasses";

/**
 * A multi-value "equals any" filter: type a value and press Enter to add it, paste a
 * newline/comma/tab-separated list to add many at once, or pick from a live dropdown of
 * matching known values (pass `suggestions`) and select as many as you want.
 */
export default function TagInput({
  values,
  onChange,
  placeholder = "Type a value and press Enter, or paste a list…",
  className = "",
  footer,
  suggestions,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  footer?: ReactNode;
  /** Known values to suggest as the user types (e.g. distinct site names already in the system). */
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (!suggestions || !draft.trim()) return [];
    const term = draft.trim().toLowerCase();
    const selected = new Set(values.map((v) => v.toLowerCase()));
    return suggestions.filter((s) => !selected.has(s.toLowerCase()) && s.toLowerCase().includes(term)).slice(0, 8);
  }, [suggestions, draft, values]);

  function addTokens(raw: string) {
    const tokens = raw
      .split(/[\r\n,\t]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;
    const next = [...values];
    for (const t of tokens) {
      if (!next.some((v) => v.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    onChange(next);
  }

  function selectSuggestion(value: string) {
    addTokens(value);
    setDraft("");
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (/[\r\n,\t]/.test(text)) {
      e.preventDefault();
      addTokens(text);
      setDraft("");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) selectSuggestion(filteredSuggestions[0]);
      else addTokens(draft);
      setDraft("");
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="relative">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`${inputClass} w-full`}
        />
        {focused && filteredSuggestions.length > 0 && (
          <div className="absolute z-[2000] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-purple-400/40 bg-[#3c2b6b] py-1 shadow-xl shadow-black/50">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                className="block w-full truncate px-2.5 py-1.5 text-left text-xs text-slate-100 hover:bg-purple-500/20"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {values.length > 0 && (
        <div className="rounded-lg border border-purple-400/30 bg-[#1a1330]">
          <div className="flex items-center justify-between border-b border-purple-400/10 px-2 py-1 text-xs text-slate-400">
            <span>
              {values.length} value{values.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-medium">Equals Any</span>
              <button type="button" onClick={() => onChange([])} className="text-brand-400 hover:underline">
                Clear all
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {values.map((v, i) => (
              <div
                key={`${v}-${i}`}
                className="flex items-center justify-between gap-2 border-b border-purple-400/10 px-2 py-1.5 text-xs text-slate-100 last:border-b-0"
              >
                <span className="truncate">{v}</span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="shrink-0 text-slate-400 hover:text-critical"
                  aria-label={`Remove ${v}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {footer}
        </div>
      )}
    </div>
  );
}
