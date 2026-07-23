"use client";

import { useEffect, useState } from "react";
import DashboardCardsView from "@/components/DashboardCardsView";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { getDistinctValues } from "@/lib/kpi";
import type { DashboardCard, DashboardConfig, DatasetRecord, DatasetSummary } from "@/lib/types";
import { fetchDatasetRowsAction } from "./actions";

export default function DashboardViewClient({
  config,
  datasets,
}: {
  config: DashboardConfig;
  datasets: DatasetSummary[];
}) {
  const [rowsByDataset, setRowsByDataset] = useState<Record<string, DatasetRecord[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const uniqueIds = Array.from(new Set(config.cards.map((c) => c.datasetId)));
    Promise.all(uniqueIds.map(async (id) => [id, await fetchDatasetRowsAction(id)] as const)).then(
      (entries) => {
        if (cancelled) return;
        setRowsByDataset(Object.fromEntries(entries));
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [config]);

  const filterColumns = config.filterColumns ?? [];

  function datasetHasColumn(datasetId: string, column: string): boolean {
    return datasets.find((d) => d.id === datasetId)?.columns.includes(column) ?? false;
  }

  function optionsFor(column: string): string[] {
    const values = new Set<string>();
    for (const datasetId of Object.keys(rowsByDataset)) {
      if (!datasetHasColumn(datasetId, column)) continue;
      for (const v of getDistinctValues(rowsByDataset[datasetId], column)) values.add(v);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  const effectiveCards: DashboardCard[] = config.cards.map((card) => {
    const extraFilters = Object.entries(globalFilters)
      .filter(([column, value]) => value && datasetHasColumn(card.datasetId, column))
      .map(([column, value]) => ({ column, op: "eq" as const, value }));
    if (extraFilters.length === 0) return card;
    return { ...card, filters: [...(card.filters ?? []), ...extraFilters] };
  });

  if (!loaded) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {filterColumns.length > 0 && (
        <Card className="flex flex-wrap gap-4 p-4">
          {filterColumns.map((column) => (
            <label key={column} className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{column}</span>
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
      )}
      <DashboardCardsView cards={effectiveCards} rowsByDataset={rowsByDataset} />
    </div>
  );
}
