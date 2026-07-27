"use client";

import { useState } from "react";
import type {
  AgingBucketDef,
  AgingCard,
  ChartAgg,
  ChartCard,
  ChartType,
  DashboardCard,
  DatasetSummary,
  FilterCondition,
  KpiAgg,
  KpiCard,
  ScorecardCard,
  ScorecardMetric,
} from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function ImportConfigForm({
  datasets,
  onImport,
}: {
  datasets: DatasetSummary[];
  onImport: (cards: DashboardCard[], name?: string, filterColumns?: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleLoad() {
    setError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("That's not valid JSON.");
      return;
    }

    const payload = Array.isArray(parsed) ? { cards: parsed } : parsed;
    if (
      !payload ||
      typeof payload !== "object" ||
      !Array.isArray((payload as { cards?: unknown }).cards)
    ) {
      setError("Expected a JSON object with a 'cards' array (or just an array of cards).");
      return;
    }

    const rawCards = (payload as { cards: unknown[] }).cards;
    const resolved: DashboardCard[] = [];

    for (let i = 0; i < rawCards.length; i++) {
      const raw = rawCards[i];
      if (!raw || typeof raw !== "object") {
        setError(`Card ${i + 1} is not an object.`);
        return;
      }
      const card = raw as Record<string, unknown>;
      const datasetName = String(card.datasetName ?? "");
      const dataset = datasets.find(
        (d) => d.displayName.toLowerCase() === datasetName.toLowerCase(),
      );
      if (!dataset) {
        setError(
          `Card ${i + 1} references dataset "${datasetName}", which doesn't match any uploaded dataset. ` +
            `Available: ${datasets.map((d) => d.displayName).join(", ")}`,
        );
        return;
      }

      if (card.type === "kpi") {
        const kpiCard: KpiCard = {
          type: "kpi",
          title: String(card.title ?? "Untitled"),
          datasetId: dataset.id,
          datasetName: dataset.displayName,
          agg: card.agg as KpiAgg,
          column: card.column as string | undefined,
          filters: card.filters as FilterCondition[] | undefined,
        };
        resolved.push(kpiCard);
      } else if (card.type === "chart") {
        const chartCard: ChartCard = {
          type: "chart",
          title: String(card.title ?? "Untitled"),
          datasetId: dataset.id,
          datasetName: dataset.displayName,
          chartType: card.chartType as ChartType,
          x: String(card.x ?? ""),
          y: card.y as string | undefined,
          agg: (card.agg as ChartAgg) ?? "sum",
          filters: card.filters as FilterCondition[] | undefined,
        };
        resolved.push(chartCard);
      } else if (card.type === "aging") {
        const rawBuckets = card.buckets;
        if (!Array.isArray(rawBuckets) || rawBuckets.length === 0) {
          setError(`Card ${i + 1} ("aging") needs a non-empty "buckets" array.`);
          return;
        }
        const agingCard: AgingCard = {
          type: "aging",
          title: String(card.title ?? "Untitled"),
          datasetId: dataset.id,
          datasetName: dataset.displayName,
          dateColumn: String(card.dateColumn ?? ""),
          buckets: rawBuckets as AgingBucketDef[],
          filters: card.filters as FilterCondition[] | undefined,
        };
        resolved.push(agingCard);
      } else if (card.type === "scorecard") {
        const rawMetrics = card.metrics;
        if (!Array.isArray(rawMetrics) || rawMetrics.length === 0) {
          setError(`Card ${i + 1} ("scorecard") needs a non-empty "metrics" array.`);
          return;
        }
        if (!card.groupColumn || typeof card.groupColumn !== "string") {
          setError(`Card ${i + 1} ("scorecard") needs a "groupColumn".`);
          return;
        }
        const scorecardCard: ScorecardCard = {
          type: "scorecard",
          title: String(card.title ?? "Untitled"),
          datasetId: dataset.id,
          datasetName: dataset.displayName,
          groupColumn: card.groupColumn,
          metrics: rawMetrics as ScorecardMetric[],
          statusColumn: card.statusColumn as string | undefined,
          completedValues: card.completedValues as string[] | undefined,
          startDateColumn: card.startDateColumn as string | undefined,
          completionDateColumn: card.completionDateColumn as string | undefined,
          dueDateColumn: card.dueDateColumn as string | undefined,
          filters: card.filters as FilterCondition[] | undefined,
        };
        resolved.push(scorecardCard);
      } else {
        setError(
          `Card ${i + 1} has an unknown "type": "${String(card.type)}". Must be "kpi", "chart", "aging", or "scorecard".`,
        );
        return;
      }
    }

    const name = (payload as { name?: unknown }).name;
    const rawFilterColumns = (payload as { filterColumns?: unknown }).filterColumns;
    const filterColumns = Array.isArray(rawFilterColumns)
      ? rawFilterColumns.filter((c): c is string => typeof c === "string")
      : undefined;

    onImport(resolved, typeof name === "string" ? name : undefined, filterColumns);
    setText("");
    setOpen(false);
  }

  return (
    <Card className="border-dashed p-4 shadow-none">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-bold text-brand-700 dark:text-brand-400"
      >
        {open ? "▾" : "▸"} Import a dashboard config (paste JSON)
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Paste a JSON config — describe the dashboard you want in chat and Claude can generate this
            for you, referencing your dataset(s) by their exact name. Loading this replaces the current
            card list below (review it, then click Save dashboard).
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
            placeholder='{"name": "Operations Overview", "cards": [...], "filterColumns": ["Status"]}'
          />
          {error && <p className="text-sm text-critical">{error}</p>}
          <Button onClick={handleLoad} variant="secondary" className="w-fit">
            Load into builder
          </Button>
        </div>
      )}
    </Card>
  );
}
