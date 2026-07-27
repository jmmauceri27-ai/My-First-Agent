"use client";

import { useEffect, useState } from "react";
import { getDistinctValues } from "@/lib/kpi";
import { SCORECARD_METRIC_LABELS } from "@/lib/types";
import type { DatasetSummary, ScorecardCard, ScorecardMetric } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { fetchDatasetRowsAction } from "./actions";
import { LabeledInput, LabeledSelect } from "./FormControls";

const ALL_METRICS: ScorecardMetric[] = ["count", "completion_rate", "on_time_rate", "avg_duration"];
const NONE = "";

export default function AddScorecardCardForm({
  datasets,
  onAdd,
}: {
  datasets: DatasetSummary[];
  onAdd: (card: ScorecardCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [groupColumn, setGroupColumn] = useState("");
  const [metrics, setMetrics] = useState<ScorecardMetric[]>([...ALL_METRICS]);
  const [statusColumn, setStatusColumn] = useState(NONE);
  const [completedValues, setCompletedValues] = useState<string[]>([]);
  const [startDateColumn, setStartDateColumn] = useState(NONE);
  const [completionDateColumn, setCompletionDateColumn] = useState(NONE);
  const [dueDateColumn, setDueDateColumn] = useState(NONE);
  const [statusValues, setStatusValues] = useState<string[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const dataset = datasets.find((d) => d.id === datasetId);
  const statusKey = dataset && statusColumn ? `${dataset.id}:${statusColumn}` : null;
  const loadingValues = statusKey !== null && loadedKey !== statusKey;

  useEffect(() => {
    if (!dataset || !statusColumn || !statusKey) return;
    let cancelled = false;
    fetchDatasetRowsAction(dataset.id).then((rows) => {
      if (cancelled) return;
      setStatusValues(getDistinctValues(rows, statusColumn));
      setLoadedKey(statusKey);
    });
    return () => {
      cancelled = true;
    };
  }, [dataset, statusColumn, statusKey]);

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
    if (!title.trim() || !dataset || !groupColumn || metrics.length === 0) return;

    const card: ScorecardCard = {
      type: "scorecard",
      title: title.trim(),
      datasetId: dataset.id,
      datasetName: dataset.displayName,
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

  if (datasets.length === 0) return null;

  const columnOptions = dataset
    ? [{ value: NONE, label: "(none)" }, ...dataset.columns.map((c) => ({ value: c, label: c }))]
    : [];

  return (
    <Card className="border-dashed p-4 shadow-none">
      <h3 className="mb-3 font-bold text-slate-900 dark:text-slate-50">
        ➕ Add scorecard card (grouped table, e.g. vendor scorecards)
      </h3>

      <div className="flex flex-wrap gap-3">
        <LabeledInput label="Title" value={title} onChange={setTitle} />
        <LabeledSelect
          label="Dataset"
          value={datasetId}
          onChange={(v) => {
            setDatasetId(v);
            setGroupColumn("");
            setStatusColumn(NONE);
            setStatusValues([]);
            setCompletedValues([]);
            setStartDateColumn(NONE);
            setCompletionDateColumn(NONE);
            setDueDateColumn(NONE);
          }}
          options={datasets.map((d) => ({ value: d.id, label: d.displayName }))}
        />
        {dataset && (
          <LabeledSelect
            label="Group by (e.g. vendor)"
            value={groupColumn}
            onChange={setGroupColumn}
            options={dataset.columns.map((c) => ({ value: c, label: c }))}
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

      {dataset && (
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
