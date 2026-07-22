"use client";

import { useState } from "react";
import type {
  ChartAgg,
  ChartCard,
  ChartType,
  DashboardCard,
  DatasetSummary,
  FilterCondition,
  KpiAgg,
  KpiCard,
} from "@/lib/types";

export default function ImportConfigForm({
  datasets,
  onImport,
}: {
  datasets: DatasetSummary[];
  onImport: (cards: DashboardCard[], name?: string) => void;
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
      } else {
        setError(`Card ${i + 1} has an unknown "type": "${String(card.type)}". Must be "kpi" or "chart".`);
        return;
      }
    }

    const name = (payload as { name?: unknown }).name;
    onImport(resolved, typeof name === "string" ? name : undefined);
    setText("");
    setOpen(false);
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {open ? "▾" : "▸"} Import a dashboard config (paste JSON)
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Paste a JSON config — describe the dashboard you want in chat and Claude can generate this
            for you, referencing your dataset(s) by their exact name. Loading this replaces the current
            card list below (review it, then click Save dashboard).
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder='{"name": "Operations Overview", "cards": [...]}'
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleLoad}
            className="w-fit rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Load into builder
          </button>
        </div>
      )}
    </div>
  );
}
