"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui/formClasses";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

/** A closed-by-default dropdown (styled like a normal select) that opens a searchable list for a single
 * choice -- like MultiSelectDropdown, but picking an option selects it and closes immediately instead of
 * toggling a checkbox. `placeholder` doubles as the "clear" option at the top of the list.
 *
 * Wrap this in a plain <div>, never a <label>, when pairing it with a field caption -- a <label> around
 * multiple nested buttons (the toggle plus each list item) makes the browser forward a click on any of them
 * into a synthetic click on the label's first control, reopening the dropdown right after an option closes
 * it. Same caution applies to MultiSelectDropdown/TradeSelect. */
export default function SearchableSelect({
  options,
  value,
  onChange,
  className = "",
  placeholder = "All",
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
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

  const selectedLabel = options.find((o) => o.value === value)?.label;

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

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
        <span className={`truncate ${!value ? "text-slate-500 dark:text-slate-400" : ""}`}>
          {selectedLabel ?? placeholder}
        </span>
        <span className="shrink-0 text-slate-600 dark:text-slate-500">▾</span>
      </button>
      {open && (
        <div className="absolute z-[2000] mt-1 w-64 rounded-lg border border-purple-200 bg-white p-2 shadow-xl dark:border-purple-400/40 dark:bg-[#3c2b6b] dark:shadow-black/50">
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
            <button
              type="button"
              onClick={() => choose("")}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-purple-500/10 ${
                !value ? "font-semibold text-brand-600 dark:text-brand-400" : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {placeholder}
            </button>
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-slate-500 dark:text-slate-400">No matches.</p>
            ) : (
              visibleOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => choose(o.value)}
                  className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-purple-500/10 ${
                    o.value === value
                      ? "font-semibold text-brand-600 dark:text-brand-400"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
