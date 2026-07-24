"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { DATASET_CATEGORIES, type DatasetSummary } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { uploadAndIngestFromBlob, type UploadState } from "./actions";

const initialState: UploadState = {};

type Mode = "new" | "replace" | "append";

export default function UploadForm({ datasets }: { datasets: DatasetSummary[] }) {
  const [state, setState] = useState<UploadState>(initialState);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<Mode>("new");
  const [existingDatasetId, setExistingDatasetId] = useState(datasets[0]?.id ?? "");
  const [keyColumn, setKeyColumn] = useState("");
  const [category, setCategory] = useState<string>(DATASET_CATEGORIES[0]);

  function handleSelectExisting(id: string) {
    setExistingDatasetId(id);
    const match = datasets.find((d) => d.id === id);
    if (match) {
      setCategory(match.category);
      setKeyColumn(match.columns[0] ?? "");
    }
  }

  const existing = datasets.find((d) => d.id === existingDatasetId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setState({ error: "Please choose a file." });
      return;
    }
    if ((mode === "replace" || mode === "append") && !existingDatasetId) {
      setState({ error: `Please pick a dataset to ${mode === "append" ? "update" : "replace"}.` });
      return;
    }
    if (mode === "append" && !keyColumn) {
      setState({ error: "Please choose a key column to match rows on." });
      return;
    }

    setPending(true);
    setState({});
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload-token",
      });
      const result = await uploadAndIngestFromBlob(blob.url, file.name, {
        mode,
        category,
        displayName: mode === "new" ? String(formData.get("displayName") ?? "") : undefined,
        existingDatasetId: mode !== "new" ? existingDatasetId : undefined,
        keyColumn: mode === "append" ? keyColumn : undefined,
      });
      setState(result);
      if (result.results) formRef.current?.reset();
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Upload a file</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Accepts .xlsx and .csv. Replacing keeps the dataset&rsquo;s ID so dashboards built on it stay
        current; appending merges rows in by a key column instead of a full re-export.
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
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
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "append"}
            onChange={() => {
              setMode("append");
              if (existing) setKeyColumn(existing.columns[0] ?? "");
            }}
            disabled={datasets.length === 0}
            className="accent-brand-600"
          />
          Append &amp; update (merge by key column)
        </label>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="file" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,.csv"
            required
            className="text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-brand-400"
          />
        </div>

        {mode === "new" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="displayName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <label htmlFor="existingDatasetId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Dataset to {mode === "append" ? "update" : "replace"}
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

        {mode === "append" && existing && (
          <div className="flex flex-col gap-1">
            <label htmlFor="keyColumn" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Key column (matches rows between uploads)
            </label>
            <select
              id="keyColumn"
              name="keyColumn"
              value={keyColumn}
              onChange={(e) => setKeyColumn(e.target.value)}
              className={inputClass}
            >
              {existing.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

        <Button
          type="submit"
          disabled={pending || (mode !== "new" && !existingDatasetId) || (mode === "append" && !keyColumn)}
        >
          {pending ? "Uploading…" : mode === "replace" ? "Replace & Save" : mode === "append" ? "Merge & Save" : "Upload & Save"}
        </Button>
      </form>

      {mode === "replace" && existing && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          This will replace all {existing.rowCount} existing rows in &ldquo;{existing.displayName}&rdquo; with
          the new file&rsquo;s data. Any dashboard cards using it will show the new numbers next time you view them.
        </p>
      )}

      {mode === "append" && existing && keyColumn && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Rows in the upload whose &ldquo;{keyColumn}&rdquo; matches an existing row will update it in
          place; rows with a new &ldquo;{keyColumn}&rdquo; are added. Existing rows not present in this
          upload are left as-is.
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
              <span>
                Saved <strong>{r.name}</strong> ({r.rowCount} rows, {r.columns.length} columns)
                {r.detail && <span className="block text-xs opacity-90">{r.detail}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
