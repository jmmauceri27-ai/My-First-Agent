"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importSeasonCsv, type CsvImportResult } from "../actions";

const TEMPLATE = `round,pickInRound,manager,playerName,position,nflTeam
1,1,Jake,Christian McCaffrey,RB,SF`;

export default function ImportPicksForm({ seasonId }: { seasonId: string }) {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await importSeasonCsv(formData);
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="mb-8 rounded-lg border border-zinc-200 bg-white/90 p-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
      <h2 className="mb-2 text-lg font-bold">Bulk Import Picks</h2>
      <div className="mb-3 rounded-md bg-zinc-50 p-3 text-xs dark:bg-ink-800/60">
        <p className="mb-1 font-medium">Expected columns (header row optional):</p>
        <code>{TEMPLATE.split("\n")[0]}</code>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Re-importing the same round + pick updates that pick instead of duplicating it.
        </p>
        <button
          type="button"
          onClick={() => setCsv(TEMPLATE)}
          className="mt-2 text-xs text-gridiron-600 underline dark:text-gridiron-100"
        >
          Load example template
        </button>
      </div>

      <form action={handleSubmit} className="space-y-3">
        <input type="hidden" name="seasonId" value={seasonId} />
        <label className="block text-sm font-medium">
          Upload a .csv file (recommended)
          <input
            type="file"
            name="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gridiron-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gridiron-600"
          />
        </label>
        <p className="text-center text-xs text-zinc-400">— or —</p>
        <textarea
          name="csv"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          placeholder="Paste picks here..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-ink-800"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
        >
          {pending ? "Importing..." : "Import"}
        </button>
      </form>

      {result && (
        <div className="mt-3 text-sm">
          <p>
            ✅ Created {result.created}, updated {result.updated}.
          </p>
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
