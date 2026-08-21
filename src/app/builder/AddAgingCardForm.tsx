"use client";

import { useState } from "react";
import { FILTER_OPS } from "@/lib/kpi";
import { DEFAULT_AGING_BUCKETS } from "@/lib/types";
import type { AgingBucketDef, AgingCard, FilterCondition, FilterOp } from "@/lib/types";
import type { DashboardSourceDef } from "@/lib/dashboardSources";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { LabeledInput, LabeledSelect } from "./FormControls";

function cloneDefaultBuckets(): AgingBucketDef[] {
  return DEFAULT_AGING_BUCKETS.map((b) => ({ ...b }));
}

export default function AddAgingCardForm({
  sources,
  onAdd,
}: {
  sources: DashboardSourceDef[];
  onAdd: (card: AgingCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [sourceKey, setSourceKey] = useState<string>(sources[0]?.key ?? "");
  const [dateColumn, setDateColumn] = useState("");
  const [buckets, setBuckets] = useState<AgingBucketDef[]>(cloneDefaultBuckets());
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  const source = sources.find((s) => s.key === sourceKey);

  function updateBucket(index: number, patch: Partial<AgingBucketDef>) {
    setBuckets((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function addBucketRow() {
    setBuckets((prev) => [...prev, { label: "", minDays: 0, maxDays: null }]);
  }

  function removeBucketRow(index: number) {
    setBuckets((prev) => prev.filter((_, i) => i !== index));
  }

  function addFilterRow() {
    if (!source) return;
    setFilters((prev) => [...prev, { column: source.columns[0]?.key ?? "", op: "neq", value: "" }]);
  }

  function updateFilter(index: number, patch: Partial<FilterCondition>) {
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFilterRow(index: number) {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAdd() {
    if (!title.trim() || !source || !dateColumn) return;
    const cleanBuckets = buckets.filter((b) => b.label.trim());
    if (cleanBuckets.length === 0) return;

    const card: AgingCard = {
      type: "aging",
      title: title.trim(),
      source: source.key,
      dateColumn,
      buckets: cleanBuckets,
      filters: filters.filter((f) => f.column && f.value),
    };
    onAdd(card);
    setTitle("");
  }

  if (sources.length === 0) return null;

  return (
    <Card className="border-dashed p-4 shadow-none">
      <h3 className="mb-3 font-bold text-slate-900 dark:text-slate-50">➕ Add aging card (circular, by days past due)</h3>

      <div className="flex flex-wrap gap-3">
        <LabeledInput label="Title" value={title} onChange={setTitle} />
        <LabeledSelect
          label="Source"
          value={sourceKey}
          onChange={(v) => {
            setSourceKey(v);
            setDateColumn("");
          }}
          options={sources.map((s) => ({ value: s.key, label: s.label }))}
        />
        {source && (
          <LabeledSelect
            label="Due-date column (ETC)"
            value={dateColumn}
            onChange={setDateColumn}
            options={source.columns.map((c) => ({ value: c.key, label: c.label }))}
          />
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Day ranges (records with a due date before today, bucketed by how many days overdue)
        </p>
        <div className="flex flex-col gap-2">
          {buckets.map((b, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <LabeledInput label="Label" value={b.label} onChange={(v) => updateBucket(i, { label: v })} />
              <LabeledInput
                label="Min days"
                type="number"
                value={String(b.minDays)}
                onChange={(v) => updateBucket(i, { minDays: Number(v) || 0 })}
              />
              <LabeledInput
                label="Max days (blank = unbounded)"
                type="number"
                value={b.maxDays === null ? "" : String(b.maxDays)}
                onChange={(v) => updateBucket(i, { maxDays: v === "" ? null : Number(v) || 0 })}
              />
              <button
                onClick={() => removeBucketRow(i)}
                className="mb-0.5 text-sm font-semibold text-critical hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <Button onClick={addBucketRow} variant="secondary" className="mt-2">
          + Add day range
        </Button>
      </div>

      {source && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Exclude rows where (typically closed/complete statuses, so aging reflects only open work)
          </p>
          <div className="flex flex-col gap-2">
            {filters.map((f, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <LabeledSelect
                  label="Column"
                  value={f.column}
                  onChange={(v) => updateFilter(i, { column: v })}
                  options={source.columns.map((c) => ({ value: c.key, label: c.label }))}
                />
                <LabeledSelect
                  label="Operator"
                  value={f.op}
                  onChange={(v) => updateFilter(i, { op: v as FilterOp })}
                  options={FILTER_OPS.map((o) => ({ value: o.value, label: o.label }))}
                />
                <LabeledInput label="Value" value={f.value} onChange={(v) => updateFilter(i, { value: v })} />
                <button
                  onClick={() => removeFilterRow(i)}
                  className="mb-0.5 text-sm font-semibold text-critical hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <Button onClick={addFilterRow} variant="secondary" className="mt-2">
            + Add exclusion
          </Button>
        </div>
      )}

      <Button onClick={handleAdd} variant="secondary" className="mt-4">
        Add aging card
      </Button>
    </Card>
  );
}
