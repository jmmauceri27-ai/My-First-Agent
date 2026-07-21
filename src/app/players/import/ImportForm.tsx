"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importCsv, type CsvImportResult } from "../actions";

const TEMPLATE = `name,position,team,byeWeek,overallRank,positionRank,adp,tier,tags,bio
Example Player,RB,KC,10,1,1,1.2,1,target|value,Example row - edit or delete me`;

export default function ImportForm() {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await importCsv(formData);
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
        <p className="mb-1 font-medium">Expected columns (header row optional):</p>
        <code className="text-xs">{TEMPLATE.split("\n")[0]}</code>
        <p className="mt-2 text-xs text-zinc-500">
          Separate multiple tags within a cell using <code>|</code> (pipe), e.g. <code>target|value</code>.
          Matching is done by name + position — importing the same player again updates their existing row
          instead of duplicating it.
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
        <div>
          <label className="block text-sm font-medium">
            Upload a .csv file (recommended — avoids paste/formatting issues)
            <input
              type="file"
              name="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gridiron-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gridiron-600"
            />
          </label>
        </div>

        <p className="text-center text-xs text-zinc-400">— or —</p>

        <textarea
          name="csv"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={14}
          placeholder="Paste your CSV here..."
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
        <div className="mt-4 rounded-lg border border-zinc-200 p-3 text-sm dark:border-ink-800">
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
