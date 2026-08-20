"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui/formClasses";

export interface MultiSelectOption {
  value: string;
  label: string;
}

/** A closed-by-default dropdown (styled like a normal select) that opens a checkbox list so more than one option can be picked. */
export default function MultiSelectDropdown({
  options,
  values,
  onChange,
  className = "",
  placeholder = "Select…",
  noun = "selected",
}: {
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  className?: string;
  placeholder?: string;
  /** Plural noun used in the closed-state summary once more than 2 are picked, e.g. "clients selected". */
  noun?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleOptions =
    query.trim() === ""
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  const labelByValue = new Map(options.map((o) => [o.value, o.label]));
  const summary =
    values.length === 0
      ? placeholder
      : values.length <= 2
        ? values.map((v) => labelByValue.get(v) ?? v).join(", ")
        : `${values.length} ${noun}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className={`${inputClass} flex w-full items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${values.length === 0 ? "text-slate-400" : ""}`}>{summary}</span>
        <span className="shrink-0 text-slate-500">▾</span>
      </button>
      {open && (
        <div className="absolute z-[2000] mt-1 w-56 rounded-lg border border-purple-400/40 bg-[#3c2b6b] p-2 shadow-xl shadow-black/50">
          {options.length > 5 && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className={`${inputClass} mb-2 w-full`}
            />
          )}
          <div className="max-h-56 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-slate-400">
                {options.length === 0 ? "No options." : "No matches."}
              </p>
            ) : (
              visibleOptions.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-100 hover:bg-purple-500/10"
                >
                  <input
                    type="checkbox"
                    checked={values.includes(o.value)}
                    onChange={() => toggle(o.value)}
                    className="rounded border-slate-500 text-brand-500 focus:ring-2 focus:ring-brand-500/40"
                  />
                  <span className="truncate">{o.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
