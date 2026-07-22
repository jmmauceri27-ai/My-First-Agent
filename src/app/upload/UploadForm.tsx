"use client";

import { useActionState, useEffect, useRef } from "react";
import { DATASET_CATEGORIES } from "@/lib/types";
import { uploadAndIngest, type UploadState } from "./actions";

const initialState: UploadState = {};

export default function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadAndIngest, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.results) {
      formRef.current?.reset();
    }
  }, [state.results]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Upload a file</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Accepts .xlsx and .csv. If the workbook has multiple sheets, each becomes its own dataset.
      </p>

      <form
        ref={formRef}
        action={formAction}
        className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap"
      >
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

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Category
          </label>
          <select
            id="category"
            name="category"
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
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Uploading…" : "Upload & Save"}
        </button>
      </form>

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
