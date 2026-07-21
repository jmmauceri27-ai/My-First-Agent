"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importActualStats, type ActualStatsImportResult } from "../actions";

export default function ActualStatsImportForm() {
  const [result, setResult] = useState<ActualStatsImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await importActualStats(formData);
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="mb-8 rounded-lg border border-zinc-200 bg-white/90 p-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
      <h2 className="mb-1 text-lg font-bold">Import Actual Season Stats</h2>
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Upload a season PPR stats file (columns: <code>rank,name,position,team,total_ppr_2025,games,ppr_per_game</code>)
        to compare actual results against your preseason rank/tier. Only updates players already on your board —
        it won't add new ones.
      </p>
      <form action={handleSubmit} className="space-y-3">
        <input
          type="file"
          name="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          required
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gridiron-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gridiron-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
        >
          {pending ? "Importing..." : "Import Stats"}
        </button>
      </form>

      {result && (
        <div className="mt-3 text-sm">
          <p>
            ✅ Updated {result.updated} player{result.updated === 1 ? "" : "s"}.
            {result.notFound.length > 0 && ` ${result.notFound.length} not on your board (skipped).`}
          </p>
          {result.notFound.length > 0 && (
            <details className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <summary className="cursor-pointer">Show skipped players</summary>
              <ul className="mt-1 list-inside list-disc">
                {result.notFound.slice(0, 30).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
              {result.notFound.length > 30 && <p>...and {result.notFound.length - 30} more.</p>}
            </details>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-rose-600">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
