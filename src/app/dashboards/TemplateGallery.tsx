"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { ChartCard, DashboardConfig, DashboardTemplate, DatasetSummary } from "@/lib/types";
import { getTemplateBindingAction, saveTemplateBindingAction } from "./actions";
import DashboardViewClient from "./DashboardViewClient";

export default function TemplateGallery({
  templates,
  datasets,
}: {
  templates: DashboardTemplate[];
  datasets: DatasetSummary[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {templates.map((template) => (
        <TemplateCard key={template.key} template={template} datasets={datasets} />
      ))}
    </div>
  );
}

function TemplateCard({ template, datasets }: { template: DashboardTemplate; datasets: DatasetSummary[] }) {
  const [datasetId, setDatasetId] = useState("");
  const [binding, setBinding] = useState<Record<string, string> | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [draftMapping, setDraftMapping] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dataset = datasets.find((d) => d.id === datasetId);
  const bindingKey = dataset ? `${template.key}:${dataset.id}` : null;
  const loading = bindingKey !== null && loadedKey !== bindingKey;

  useEffect(() => {
    if (!dataset || !bindingKey) return;
    let cancelled = false;
    getTemplateBindingAction(template.key, dataset.id).then((result) => {
      if (cancelled) return;
      setBinding(result);
      setDraftMapping(result ?? {});
      setLoadedKey(bindingKey);
    });
    return () => {
      cancelled = true;
    };
  }, [dataset, bindingKey, template.key]);

  async function handleSaveMapping() {
    if (!dataset) return;
    const missing = template.roles.some((r) => !draftMapping[r.key]);
    if (missing) return;
    setSaving(true);
    try {
      await saveTemplateBindingAction(template.key, dataset.id, draftMapping);
      setBinding(draftMapping);
    } finally {
      setSaving(false);
    }
  }

  const resolvedConfig: DashboardConfig | null =
    dataset && binding
      ? {
          name: `${template.name} — ${dataset.displayName}`,
          cards: template.cards.map(
            (c): ChartCard => ({
              type: "chart",
              title: c.title,
              datasetId: dataset.id,
              datasetName: dataset.displayName,
              chartType: c.chartType,
              x: binding[c.xRole],
              agg: c.agg,
            }),
          ),
          filterColumns: (template.filterRoles ?? []).map((role) => binding[role]).filter(Boolean),
        }
      : null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{template.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reusable template — pick a dataset to view it.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Dataset</span>
          <select value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className={inputClass}>
            <option value="">Choose a dataset…</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {dataset && loading && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      {dataset && !loading && !binding && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-400/30 p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            First time using this template with &ldquo;{dataset.displayName}&rdquo; — map its columns once:
          </p>
          <div className="flex flex-wrap gap-3">
            {template.roles.map((role) => (
              <label key={role.key} className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">{role.label}</span>
                <select
                  value={draftMapping[role.key] ?? ""}
                  onChange={(e) => setDraftMapping((prev) => ({ ...prev, [role.key]: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Choose a column…</option>
                  {dataset.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <Button
            onClick={handleSaveMapping}
            disabled={saving || template.roles.some((r) => !draftMapping[r.key])}
            variant="secondary"
            className="w-fit"
          >
            {saving ? "Saving…" : "Save & view"}
          </Button>
        </div>
      )}

      {resolvedConfig && (
        <div className="mt-4">
          <DashboardViewClient config={resolvedConfig} datasets={datasets} />
        </div>
      )}
    </Card>
  );
}
