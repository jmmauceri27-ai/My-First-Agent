"use client";

import { useState } from "react";
import { KPI_AGG_LABELS, FILTER_OPS } from "@/lib/kpi";
import type { DashboardSourceDef } from "@/lib/dashboardSources";
import type { FilterOp, KpiAgg, KpiCard } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { LabeledInput, LabeledSelect } from "./FormControls";

export default function AddKpiCardForm({
  sources,
  onAdd,
}: {
  sources: DashboardSourceDef[];
  onAdd: (card: KpiCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [sourceKey, setSourceKey] = useState<string>(sources[0]?.key ?? "");
  const [agg, setAgg] = useState<KpiAgg>("count_rows");
  const [column, setColumn] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterOp, setFilterOp] = useState<FilterOp>("eq");
  const [filterValue, setFilterValue] = useState("");

  const source = sources.find((s) => s.key === sourceKey);
  const needsColumn = agg !== "count_rows" && agg !== "pct_match";

  function handleAdd() {
    if (!title.trim() || !source) return;
    if (needsColumn && !column) return;

    const card: KpiCard = {
      type: "kpi",
      title: title.trim(),
      source: source.key,
      agg,
      column: needsColumn ? column : undefined,
      filters:
        filterColumn && filterValue
          ? [{ column: filterColumn, op: filterOp, value: filterValue }]
          : undefined,
    };
    onAdd(card);
    setTitle("");
    setFilterColumn("");
    setFilterValue("");
  }

  if (sources.length === 0) return null;

  return (
    <Card className="border-dashed p-4 shadow-none">
      <h3 className="mb-3 font-bold text-slate-900 dark:text-slate-50">➕ Add KPI card</h3>
      <div className="flex flex-wrap gap-3">
        <LabeledInput label="Title" value={title} onChange={setTitle} />
        <LabeledSelect
          label="Source"
          value={sourceKey}
          onChange={setSourceKey}
          options={sources.map((s) => ({ value: s.key, label: s.label }))}
        />
        <LabeledSelect
          label="Aggregation"
          value={agg}
          onChange={(v) => setAgg(v as KpiAgg)}
          options={Object.entries(KPI_AGG_LABELS).map(([value, label]) => ({ value, label }))}
        />
        {needsColumn && source && (
          <LabeledSelect
            label="Column"
            value={column}
            onChange={setColumn}
            options={source.columns.map((c) => ({ value: c.key, label: c.label }))}
          />
        )}
      </div>

      {source && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">Optional filter:</span>
          <LabeledSelect
            label="Column"
            value={filterColumn}
            onChange={setFilterColumn}
            options={[{ value: "", label: "(none)" }, ...source.columns.map((c) => ({ value: c.key, label: c.label }))]}
          />
          <LabeledSelect
            label="Operator"
            value={filterOp}
            onChange={(v) => setFilterOp(v as FilterOp)}
            options={FILTER_OPS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <LabeledInput label="Value" value={filterValue} onChange={setFilterValue} />
        </div>
      )}

      <Button onClick={handleAdd} variant="secondary" className="mt-3">
        Add KPI card
      </Button>
    </Card>
  );
}
