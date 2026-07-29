"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import type { DatasetRowWithId } from "@/lib/types";

const BLANK_LABEL = "(blank)";

function distinctValuesFor(rows: DatasetRowWithId[], column: string): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const raw = row.data[column];
    set.add(raw === null || raw === undefined || raw === "" ? BLANK_LABEL : String(raw));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export default function FilterSidebar({
  filterColumns,
  rows,
  onApply,
  onClear,
}: {
  filterColumns: string[];
  rows: DatasetRowWithId[];
  onApply: (filters: Record<string, string[]>) => void;
  onClear: () => void;
}) {
  const [pending, setPending] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState<Record<string, string>>({});

  function toggleValue(column: string, value: string) {
    setPending((prev) => {
      const current = prev[column] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [column]: next };
    });
  }

  function handleClear() {
    setPending({});
    onClear();
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-purple-400/20 bg-[#1c1430]">
      <div className="border-b border-purple-400/20 px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Filter Sets</h2>
        <p className="mt-1 text-xs text-slate-500">
          Check values below, then Run Filters. Pick which columns show up here from &ldquo;Change columns.&rdquo;
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filterColumns.length === 0 ? (
          <p className="px-2 py-4 text-sm text-slate-500">
            No filter columns configured yet — open &ldquo;Change columns&rdquo; above the map and pick some
            under &ldquo;Available as sidebar filters.&rdquo;
          </p>
        ) : (
          filterColumns.map((column) => {
            const allValues = distinctValuesFor(rows, column);
            const query = (search[column] ?? "").trim().toLowerCase();
            const values = query ? allValues.filter((v) => v.toLowerCase().includes(query)) : allValues;
            const selectedCount = pending[column]?.length ?? 0;
            return (
              <details key={column} className="group border-b border-purple-400/10 px-2 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-300 hover:text-slate-50">
                  <span className="truncate">{column}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedCount > 0 && (
                      <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-xs text-white">
                        {selectedCount}
                      </span>
                    )}
                    <span className="text-slate-500 transition-transform group-open:rotate-180">⌄</span>
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="text"
                    value={search[column] ?? ""}
                    onChange={(e) => setSearch((prev) => ({ ...prev, [column]: e.target.value }))}
                    placeholder={`Search ${column}…`}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none focus:border-brand-500"
                  />
                  <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                    {values.length === 0 && <p className="text-xs text-slate-500">No matches.</p>}
                    {values.map((value) => (
                      <label key={value} className="flex items-center gap-1.5 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={(pending[column] ?? []).includes(value)}
                          onChange={() => toggleValue(column, value)}
                          className="accent-brand-600"
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </div>
              </details>
            );
          })
        )}
      </div>

      <div className="flex gap-2 border-t border-purple-400/20 p-3">
        <Button onClick={() => onApply(pending)} variant="primary" className="flex-1">
          Run Filters
        </Button>
        <Button onClick={handleClear} variant="ghost">
          Clear
        </Button>
      </div>
    </aside>
  );
}
