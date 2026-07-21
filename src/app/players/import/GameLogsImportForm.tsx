"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importGameLogs, type GameLogImportResult } from "../actions";

export default function GameLogsImportForm() {
  const [result, setResult] = useState<GameLogImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await importGameLogs(formData);
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="mb-8 rounded-lg border border-zinc-200 bg-white/90 p-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
      <h2 className="mb-1 text-lg font-bold">Import Game Logs</h2>
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Upload a weekly stats file (columns:{" "}
        <code>season,week,name,position,team,opponent,passYards,passTDs,passInt,rushYards,rushTDs,receptions,recYards,recTDs,pointsPPR</code>
        ) to see each player's week-by-week box scores on their detail page. Only logs games for players already
        on your board.
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
          {pending ? "Importing..." : "Import Game Logs"}
        </button>
      </form>

      {result && (
        <div className="mt-3 text-sm">
          <p>
            ✅ Logged {result.created} new game{result.created === 1 ? "" : "s"}, updated {result.updated}.
            {result.skippedPlayers > 0 && ` ${result.skippedPlayers} players not on your board (skipped).`}
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
