"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DraftOrderPick } from "@prisma/client";
import { importDraftOrder, clearDraftOrder, type DraftOrderImportResult } from "./actions";

export default function DraftOrderImportForm({ picks }: { picks: DraftOrderPick[] }) {
  const [open, setOpen] = useState(picks.length === 0);
  const [result, setResult] = useState<DraftOrderImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleImport(formData: FormData) {
    startTransition(async () => {
      const res = await importDraftOrder(formData);
      setResult(res);
      router.refresh();
    });
  }

  function handleClear() {
    if (!confirm("Clear the uploaded draft order? You'll need to re-upload it.")) return;
    startTransition(async () => {
      await clearDraftOrder();
      router.refresh();
    });
  }

  const maxRound = picks.reduce((max, p) => Math.max(max, p.round), 0);

  return (
    <div className="mb-4 rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
      >
        <span>
          Draft Order{" "}
          {picks.length > 0 ? `(${picks.length} picks loaded, ${maxRound} rounds)` : "(not uploaded yet)"}
        </span>
        <span className="text-xs text-zinc-400">{open ? "Hide ▲" : "Show ▼"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-200 p-3 text-sm dark:border-ink-800">
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Upload a file listing every pick in your draft (columns:{" "}
            <code>overallPick,round,pickInRound,manager</code>) — e.g. all 192 rows for a 12-team,
            16-round league. Re-uploading updates existing picks instead of duplicating them, so you can
            fix mistakes by re-uploading the corrected file.
          </p>
          <form action={handleImport} className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              name="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              required
              className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gridiron-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gridiron-600"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
            >
              {pending ? "Importing..." : "Upload"}
            </button>
            {picks.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40"
              >
                Clear
              </button>
            )}
          </form>

          {result && (
            <div className="mt-3 text-sm">
              <p>✅ Loaded {result.updated} picks.</p>
              {result.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-rose-600">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {result.errors.length > 20 && <li>...and {result.errors.length - 20} more.</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
