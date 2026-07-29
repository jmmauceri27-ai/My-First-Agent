"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DatasetSummary } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { removeDataset, renameDatasetAction } from "./actions";

export default function DatasetList({ datasets }: { datasets: DatasetSummary[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (datasets.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No datasets uploaded yet.</p>;
  }

  function startEditing(d: DatasetSummary) {
    setEditingId(d.id);
    setNameDraft(d.displayName);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setError(null);
  }

  async function handleSaveName(id: string) {
    setSaving(true);
    setError(null);
    const result = await renameDatasetAction(id, nameDraft);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <Card className="flex flex-col divide-y divide-slate-100 overflow-hidden dark:divide-slate-900">
      {datasets.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50"
        >
          {editingId === d.id ? (
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName(d.id);
                    if (e.key === "Escape") cancelEditing();
                  }}
                  className={`${inputClass} max-w-xs`}
                  autoFocus
                />
                <Button onClick={() => handleSaveName(d.id)} disabled={saving} variant="secondary">
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button onClick={cancelEditing} disabled={saving} variant="ghost">
                  Cancel
                </Button>
              </div>
              {error && <p className="text-xs text-critical">{error}</p>}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{d.displayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {d.category} · {d.rowCount} rows · {d.sourceFilename} · {new Date(d.uploadedAt).toLocaleString()}
              </p>
            </div>
          )}

          {editingId !== d.id && (
            <div className="flex shrink-0 gap-2">
              <Button onClick={() => startEditing(d)} variant="ghost">
                Rename
              </Button>
              <form action={removeDataset}>
                <input type="hidden" name="id" value={d.id} />
                <Button type="submit" variant="danger">
                  Delete
                </Button>
              </form>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
