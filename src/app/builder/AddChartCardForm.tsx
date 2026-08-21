"use client";

import { useState } from "react";
import { CHART_AGG_LABELS, CHART_TYPES, FILTER_OPS } from "@/lib/kpi";
import type { DashboardSourceDef } from "@/lib/dashboardSources";
import type { ChartAgg, ChartCard, ChartType, FilterOp } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { LabeledInput, LabeledSelect } from "./FormControls";

const COUNT_ROWS = "__count_rows__";

export default function AddChartCardForm({
  sources,
  onAdd,
}: {
  sources: DashboardSourceDef[];
  onAdd: (card: ChartCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [sourceKey, setSourceKey] = useState<string>(sources[0]?.key ?? "");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [x, setX] = useState("");
  const [y, setY] = useState(COUNT_ROWS);
  const [agg, setAgg] = useState<ChartAgg>("sum");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterOp, setFilterOp] = useState<FilterOp>("eq");
  const [filterValue, setFilterValue] = useState("");

  const source = sources.find((s) => s.key === sourceKey);

  function handleAdd() {
    if (!title.trim() || !source || !x) return;

    const card: ChartCard = {
      type: "chart",
      title: title.trim(),
      source: source.key,
      chartType,
      x,
      y: y === COUNT_ROWS ? undefined : y,
      agg: y === COUNT_ROWS ? "count" : agg,
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
      <h3 className="mb-3 font-bold text-slate-900 dark:text-slate-50">➕ Add chart card</h3>
      <div className="flex flex-wrap gap-3">
        <LabeledInput label="Title" value={title} onChange={setTitle} />
        <LabeledSelect
          label="Source"
          value={sourceKey}
          onChange={setSourceKey}
          options={sources.map((s) => ({ value: s.key, label: s.label }))}
        />
        <LabeledSelect
          label="Chart type"
          value={chartType}
          onChange={(v) => setChartType(v as ChartType)}
          options={CHART_TYPES.map((c) => ({ value: c, label: c }))}
        />
        {source && (
          <LabeledSelect
            label="X-axis / category"
            value={x}
            onChange={setX}
            options={source.columns.map((c) => ({ value: c.key, label: c.label }))}
          />
        )}
        {source && (
          <LabeledSelect
            label="Y-axis / value"
            value={y}
            onChange={setY}
            options={[
              { value: COUNT_ROWS, label: "(count of rows)" },
              ...source.columns.map((c) => ({ value: c.key, label: c.label })),
            ]}
          />
        )}
        {y !== COUNT_ROWS && (
          <LabeledSelect
            label="Aggregation"
            value={agg}
            onChange={(v) => setAgg(v as ChartAgg)}
            options={Object.entries(CHART_AGG_LABELS)
              .filter(([v]) => v !== "count")
              .map(([value, label]) => ({ value, label }))}
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
        Add chart card
      </Button>
    </Card>
  );
}
