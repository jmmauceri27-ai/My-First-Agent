"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KPI_AGG_LABELS } from "@/lib/kpi";
import type { DashboardCard, DatasetRecord, DatasetSummary } from "@/lib/types";
import DashboardCardsView from "@/components/DashboardCardsView";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import AddAgingCardForm from "./AddAgingCardForm";
import AddChartCardForm from "./AddChartCardForm";
import AddKpiCardForm from "./AddKpiCardForm";
import ImportConfigForm from "./ImportConfigForm";
import {
  deleteDashboardAction,
  fetchDatasetRowsAction,
  loadDashboardAction,
  saveDashboardAction,
} from "./actions";

const NEW_DASHBOARD = "__new__";

export default function BuilderClient({
  datasets,
  dashboards,
}: {
  datasets: DatasetSummary[];
  dashboards: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(NEW_DASHBOARD);
  const [name, setName] = useState("");
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, DatasetRecord[]>>({});
  const [previewCards, setPreviewCards] = useState<DashboardCard[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [filterColumns, setFilterColumns] = useState<string[]>([]);

  const availableFilterColumns = Array.from(
    new Set(
      cards.flatMap((card) => datasets.find((d) => d.id === card.datasetId)?.columns ?? []),
    ),
  ).sort((a, b) => a.localeCompare(b));

  function toggleFilterColumn(column: string) {
    setFilterColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column],
    );
  }

  async function handleSelectDashboard(id: string) {
    setSelectedId(id);
    setMessage(null);
    setPreviewCards(null);
    if (id === NEW_DASHBOARD) {
      setName("");
      setCards([]);
      setFilterColumns([]);
      return;
    }
    const config = await loadDashboardAction(id);
    if (config) {
      setName(config.name);
      setCards(config.cards);
      setFilterColumns(config.filterColumns ?? []);
    }
  }

  function removeCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
    setPreviewCards(null);
  }

  function addCard(card: DashboardCard) {
    setCards((prev) => [...prev, card]);
    setPreviewCards(null);
  }

  async function handlePreview() {
    setPreviewError(null);
    if (cards.length === 0) {
      setPreviewError("Add at least one card first.");
      return;
    }
    setPreviewing(true);
    try {
      const uniqueIds = Array.from(new Set(cards.map((c) => c.datasetId)));
      const entries = await Promise.all(
        uniqueIds.map(async (id) => [id, await fetchDatasetRowsAction(id)] as const),
      );
      setPreviewRows(Object.fromEntries(entries));
      setPreviewCards(cards);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Failed to load preview data.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSave() {
    setMessage(null);
    if (!name.trim()) {
      setMessage("Please enter a dashboard name.");
      return;
    }
    if (cards.length === 0) {
      setMessage("Add at least one card before saving.");
      return;
    }
    setSaving(true);
    try {
      const { id } = await saveDashboardAction({ name: name.trim(), cards, filterColumns });
      setSelectedId(id);
      setMessage(`Saved dashboard '${name.trim()}'.`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (selectedId === NEW_DASHBOARD) return;
    await deleteDashboardAction(selectedId);
    setSelectedId(NEW_DASHBOARD);
    setName("");
    setCards([]);
    setFilterColumns([]);
    setMessage("Dashboard deleted.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Dashboard to edit</span>
          <select
            value={selectedId}
            onChange={(e) => handleSelectDashboard(e.target.value)}
            className={inputClass}
          >
            <option value={NEW_DASHBOARD}>➕ New dashboard</option>
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Dashboard name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">Cards in this dashboard</h2>
        {cards.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No cards yet. Add a KPI or chart card below.</p>
        ) : (
          <Card className="flex flex-col divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-900">
            {cards.map((card, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  {card.type === "kpi"
                    ? `KPI — ${card.title} (${card.datasetName}, ${KPI_AGG_LABELS[card.agg]})`
                    : card.type === "aging"
                      ? `Aging — ${card.title} (${card.datasetName}, by ${card.dateColumn})`
                      : `Chart — ${card.title} (${card.chartType} on ${card.datasetName})`}
                </span>
                <button
                  onClick={() => removeCard(i)}
                  className="text-sm font-semibold text-critical hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>

      {availableFilterColumns.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">Global filters</h2>
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            Columns picked here show up as live dropdowns on the Dashboards page — viewers can change
            them to instantly re-filter every card at once, without editing the dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            {availableFilterColumns.map((column) => (
              <label key={column} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={filterColumns.includes(column)}
                  onChange={() => toggleFilterColumn(column)}
                  className="accent-brand-600"
                />
                {column}
              </label>
            ))}
          </div>
        </Card>
      )}

      <ImportConfigForm
        datasets={datasets}
        onImport={(importedCards, importedName, importedFilterColumns) => {
          setCards(importedCards);
          setPreviewCards(null);
          if (importedName) setName(importedName);
          setFilterColumns(importedFilterColumns ?? []);
          setMessage(`Loaded ${importedCards.length} card(s) from the pasted config. Review, then Save dashboard.`);
        }}
      />

      <AddKpiCardForm datasets={datasets} onAdd={addCard} />
      <AddChartCardForm datasets={datasets} onAdd={addCard} />
      <AddAgingCardForm datasets={datasets} onAdd={addCard} />

      {message && <p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePreview} disabled={previewing} variant="secondary">
          {previewing ? "Loading preview…" : "👁 Preview (not saved)"}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "💾 Save dashboard"}
        </Button>
        {selectedId !== NEW_DASHBOARD && (
          <Button onClick={handleDelete} variant="danger">
            🗑️ Delete this dashboard
          </Button>
        )}
      </div>

      {previewError && <p className="text-sm text-critical">{previewError}</p>}

      {previewCards && (
        <Card className="flex flex-col gap-4 border-dashed p-4 shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              👁 Live preview <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">(not saved)</span>
            </h2>
            <button
              onClick={() => setPreviewCards(null)}
              className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Hide
            </button>
          </div>
          <DashboardCardsView cards={previewCards} rowsByDataset={previewRows} />
        </Card>
      )}
    </div>
  );
}
