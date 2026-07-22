"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DATASET_CATEGORIES, type DatasetSummary } from "@/lib/types";
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
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Upload a file</h2>
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
            className="accent-zinc-900 dark:accent-zinc-50"
          />
          Create new dataset
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
            disabled={datasets.length === 0}
            className="accent-zinc-900 dark:accent-zinc-50"
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
            className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-zinc-300 dark:file:bg-zinc-800"
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
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
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
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
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
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {DATASET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={pending || (mode === "replace" && !existingDatasetId)}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Uploading…" : mode === "replace" ? "Replace & Save" : "Upload & Save"}
        </button>
      </form>

      {mode === "replace" && existing && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          This will replace all {existing.rowCount} existing rows in &ldquo;{existing.displayName}&rdquo; with
          the new file&rsquo;s data. Any dashboard cards using it will show the new numbers next time you view them.
        </p>
      )}

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

      {state.results && (
        <div className="mt-4 flex flex-col gap-2">
          {state.results.map((r) => (
            <div
              key={r.name}
              className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            >
              Saved <strong>{r.name}</strong> ({r.rowCount} rows, {r.columns.length} columns)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
