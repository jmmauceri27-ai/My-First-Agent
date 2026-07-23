"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DATASET_CATEGORIES, type DatasetSummary } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { uploadAndIngest, type UploadState } from "./actions";

const initialState: UploadState = {};

export default function UploadForm({ datasets }: { datasets: DatasetSummary[] }) {
  const [state, formAction, pending] = useActionState(uploadAndIngest, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"new" | "replace">("new");
  const [existingDatasetId, setExistingDatasetId] = useState(datasets[0]?.id ?? "");
  const [category, setCategory] = useState<string>(DATASET_CATEGORIES[0]);

  useEffect(() => {
    if (state.results) {
      formRef.current?.reset();
    }
  }, [state.results]);

  function handleSelectExisting(id: string) {
    setExistingDatasetId(id);
    const match = datasets.find((d) => d.id === id);
    if (match) setCategory(match.category);
  }

  const existing = datasets.find((d) => d.id === existingDatasetId);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Upload a file</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Accepts .xlsx and .csv. Replacing an existing dataset keeps its ID, so any saved dashboard built
        from it automatically shows the new data.
      </p>

      <div className="mt-4 flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "new"}
            onChange={() => setMode("new")}
            className="accent-brand-600"
          />
          Create new dataset
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
            disabled={datasets.length === 0}
            className="accent-brand-600"
          />
          Replace an existing dataset
        </label>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap"
      >
        <input type="hidden" name="mode" value={mode} />

        <div className="flex flex-col gap-1">
          <label htmlFor="file" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,.csv"
            required
            className="text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-brand-400"
          />
        </div>

        {mode === "new" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="displayName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Dataset name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              placeholder="e.g. Work Orders Q1"
              className={inputClass}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="existingDatasetId" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Dataset to replace
            </label>
            <select
              id="existingDatasetId"
              name="existingDatasetId"
              value={existingDatasetId}
              onChange={(e) => handleSelectExisting(e.target.value)}
              className={inputClass}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.displayName} ({d.rowCount} rows)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {DATASET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={pending || (mode === "replace" && !existingDatasetId)}>
          {pending ? "Uploading…" : mode === "replace" ? "Replace & Save" : "Upload & Save"}
        </Button>
      </form>

      {mode === "replace" && existing && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          This will replace all {existing.rowCount} existing rows in &ldquo;{existing.displayName}&rdquo; with
          the new file&rsquo;s data. Any dashboard cards using it will show the new numbers next time you view them.
        </p>
      )}

      {state.error && <p className="mt-3 text-sm text-critical">{state.error}</p>}

      {state.results && (
        <div className="mt-4 flex flex-col gap-2">
          {state.results.map((r) => (
            <div
              key={r.name}
              className="flex items-center gap-2 rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-good" />
              Saved <strong>{r.name}</strong> ({r.rowCount} rows, {r.columns.length} columns)
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
