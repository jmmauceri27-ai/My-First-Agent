"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui/formClasses";
import { TRADE_OPTIONS } from "@/lib/trades";

/** A closed-by-default dropdown (styled like a normal select) that opens a checkbox list so more than one Trade can be picked. */
export default function TradeSelect({
  value,
  onChange,
  className = "",
  placeholder = "Select trade(s)",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(trade: string) {
    onChange(value.includes(trade) ? value.filter((t) => t !== trade) : [...value, trade]);
  }

  const summary =
    value.length === 0 ? placeholder : value.length <= 2 ? value.join(", ") : `${value.length} trades selected`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${inputClass} flex w-full items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${value.length === 0 ? "text-slate-400" : ""}`}>{summary}</span>
        <span className="shrink-0 text-slate-500">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-purple-400/40 bg-[#3c2b6b] p-2 shadow-xl shadow-black/50">
          {TRADE_OPTIONS.map((t) => (
            <label
              key={t}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-100 hover:bg-purple-500/10"
            >
              <input
                type="checkbox"
                checked={value.includes(t)}
                onChange={() => toggle(t)}
                className="rounded border-slate-500 text-brand-500 focus:ring-2 focus:ring-brand-500/40"
              />
              {t}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
