"use client";

import { useEffect, useState } from "react";
import { getDistinctValues } from "@/lib/kpi";
import { SCORECARD_METRIC_LABELS } from "@/lib/types";
import type { ScorecardCard, ScorecardMetric } from "@/lib/types";
import type { DashboardSourceDef } from "@/lib/dashboardSources";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { fetchSourceRowsAction } from "./actions";
import { LabeledInput, LabeledSelect } from "./FormControls";

const ALL_METRICS: ScorecardMetric[] = ["count", "completion_rate", "on_time_rate", "avg_duration"];
const NONE = "";

export default function AddScorecardCardForm({
  sources,
  onAdd,
}: {
  sources: DashboardSourceDef[];
  onAdd: (card: ScorecardCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [sourceKey, setSourceKey] = useState<string>(sources[0]?.key ?? "");
  const [groupColumn, setGroupColumn] = useState("");
  const [metrics, setMetrics] = useState<ScorecardMetric[]>([...ALL_METRICS]);
  const [statusColumn, setStatusColumn] = useState(NONE);
  const [completedValues, setCompletedValues] = useState<string[]>([]);
  const [startDateColumn, setStartDateColumn] = useState(NONE);
  const [completionDateColumn, setCompletionDateColumn] = useState(NONE);
  const [dueDateColumn, setDueDateColumn] = useState(NONE);
  const [statusValues, setStatusValues] = useState<string[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const source = sources.find((s) => s.key === sourceKey);
  const statusKey = source && statusColumn ? `${source.key}:${statusColumn}` : null;
  const loadingValues = statusKey !== null && loadedKey !== statusKey;

  useEffect(() => {
    if (!source || !statusColumn || !statusKey) return;
    let cancelled = false;
    fetchSourceRowsAction(source.key).then((rows) => {
      if (cancelled) return;
      setStatusValues(getDistinctValues(rows, statusColumn));
      setLoadedKey(statusKey);
    });
    return () => {
      cancelled = true;
    };
  }, [source, statusColumn, statusKey]);

  function handleStatusColumnChange(v: string) {
    setStatusColumn(v);
    setCompletedValues([]);
  }

  function toggleMetric(m: ScorecardMetric) {
    setMetrics((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function toggleCompletedValue(v: string) {
    setCompletedValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  function handleAdd() {
    if (!title.trim() || !source || !groupColumn || metrics.length === 0) return;

    const card: ScorecardCard = {
      type: "scorecard",
      title: title.trim(),
      source: source.key,
      groupColumn,
      metrics,
      statusColumn: statusColumn || undefined,
      completedValues: statusColumn && completedValues.length > 0 ? completedValues : undefined,
      startDateColumn: startDateColumn || undefined,
      completionDateColumn: completionDateColumn || undefined,
      dueDateColumn: dueDateColumn || undefined,
    };
    onAdd(card);
    setTitle("");
  }

  if (sources.length === 0) return null;

  const columnOptions = source
    ? [{ value: NONE, label: "(none)" }, ...source.columns.map((c) => ({ value: c.key, label: c.label }))]
    : [];

  return (
    <Card className="border-dashed p-4 shadow-none">
      <h3 className="mb-3 font-bold text-slate-900 dark:text-slate-50">
        ➕ Add scorecard card (grouped table, e.g. vendor scorecards)
      </h3>

      <div className="flex flex-wrap gap-3">
        <LabeledInput label="Title" value={title} onChange={setTitle} />
        <LabeledSelect
          label="Source"
          value={sourceKey}
          onChange={(v) => {
            setSourceKey(v);
            setGroupColumn("");
            setStatusColumn(NONE);
            setStatusValues([]);
            setCompletedValues([]);
            setStartDateColumn(NONE);
            setCompletionDateColumn(NONE);
            setDueDateColumn(NONE);
          }}
          options={sources.map((s) => ({ value: s.key, label: s.label }))}
        />
        {source && (
          <LabeledSelect
            label="Group by (e.g. vendor)"
            value={groupColumn}
            onChange={setGroupColumn}
            options={source.columns.map((c) => ({ value: c.key, label: c.label }))}
          />
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Metrics to show</p>
        <div className="flex flex-wrap gap-3">
          {ALL_METRICS.map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={metrics.includes(m)}
                onChange={() => toggleMetric(m)}
                className="accent-brand-600"
              />
              {SCORECARD_METRIC_LABELS[m]}
            </label>
          ))}
        </div>
      </div>

      {source && (
        <div className="mt-4 flex flex-wrap gap-3">
          <LabeledSelect
            label="Status column (for completion/on-time rate)"
            value={statusColumn}
            onChange={handleStatusColumnChange}
            options={columnOptions}
          />
          <LabeledSelect
            label="Start date (response time)"
            value={startDateColumn}
            onChange={setStartDateColumn}
            options={columnOptions}
          />
          <LabeledSelect
            label="Completion date"
            value={completionDateColumn}
            onChange={setCompletionDateColumn}
            options={columnOptions}
          />
          <LabeledSelect
            label="Due/target date (for on-time rate)"
            value={dueDateColumn}
            onChange={setDueDateColumn}
            options={columnOptions}
          />
        </div>
      )}

      {statusColumn && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Which &ldquo;{statusColumn}&rdquo; values count as completed?
          </p>
          {loadingValues ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading values…</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {statusValues.map((v) => (
                <label key={v} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={completedValues.includes(v)}
                    onChange={() => toggleCompletedValue(v)}
                    className="accent-brand-600"
                  />
                  {v}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <Button onClick={handleAdd} variant="secondary" className="mt-4">
        Add scorecard card
      </Button>
    </Card>
  );
}
