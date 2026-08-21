"use client";

import { useEffect, useState } from "react";
import DashboardCardsView from "@/components/DashboardCardsView";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { applyFilters, getDistinctValues } from "@/lib/kpi";
import { getDashboardSource } from "@/lib/dashboardSources";
import type { DashboardSourceKey } from "@/lib/dashboardSources";
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import type { DashboardCard, DashboardConfig, DatasetRecord } from "@/lib/types";
import { exportDashboardDataAction, fetchSourceRowsAction } from "./actions";

export default function DashboardViewClient({ config }: { config: DashboardConfig }) {
  const [rowsBySource, setRowsBySource] = useState<Partial<Record<DashboardSourceKey, DatasetRecord[]>>>({});
  const [loaded, setLoaded] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const uniqueSources = Array.from(new Set(config.cards.map((c) => c.source)));
    Promise.all(uniqueSources.map(async (source) => [source, await fetchSourceRowsAction(source)] as const)).then(
      (entries) => {
        if (cancelled) return;
        setRowsBySource(Object.fromEntries(entries));
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [config]);

  const filterColumns = config.filterColumns ?? [];

  function sourceHasColumn(source: DashboardSourceKey, column: string): boolean {
    return getDashboardSource(source).columns.some((c) => c.key === column);
  }

  function activeFiltersFor(source: DashboardSourceKey) {
    return Object.entries(globalFilters)
      .filter(([column, value]) => value && sourceHasColumn(source, column))
      .map(([column, value]) => ({ column, op: "eq" as const, value }));
  }

  function optionsFor(column: string): string[] {
    const values = new Set<string>();
    for (const source of Object.keys(rowsBySource) as DashboardSourceKey[]) {
      if (!sourceHasColumn(source, column)) continue;
      for (const v of getDistinctValues(rowsBySource[source] ?? [], column)) values.add(v);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  const effectiveCards: DashboardCard[] = config.cards.map((card) => {
    const extraFilters = activeFiltersFor(card.source);
    if (extraFilters.length === 0) return card;
    return { ...card, filters: [...(card.filters ?? []), ...extraFilters] };
  });

  async function handleDownload() {
    setExporting(true);
    try {
      const sources = Object.keys(rowsBySource) as DashboardSourceKey[];
      const sheets = sources.map((source) => ({
        source,
        rows: applyFilters(rowsBySource[source] ?? [], activeFiltersFor(source)),
      }));
      const base64 = await exportDashboardDataAction(sheets);
      const date = new Date().toISOString().slice(0, 10);
      downloadBase64Xlsx(base64, `${config.name.replace(/[^a-z0-9]+/gi, "_")}_${date}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {filterColumns.length > 0 ? (
          <Card className="flex flex-wrap gap-4 p-4">
            {filterColumns.map((column) => (
              <label key={column} className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">{column}</span>
                <select
                  value={globalFilters[column] ?? ""}
                  onChange={(e) => setGlobalFilters((prev) => ({ ...prev, [column]: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">All</option>
                  {optionsFor(column).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </Card>
        ) : (
          <div />
        )}
        <Button variant="secondary" onClick={handleDownload} disabled={exporting} className="shrink-0">
          {exporting ? "Downloading…" : "Download data (.xlsx)"}
        </Button>
      </div>
      <DashboardCardsView cards={effectiveCards} rowsBySource={rowsBySource} />
    </div>
  );
}
