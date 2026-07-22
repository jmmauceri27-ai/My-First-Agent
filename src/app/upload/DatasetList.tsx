import type { DatasetSummary } from "@/lib/types";
import { removeDataset } from "./actions";

export default function DatasetList({ datasets }: { datasets: DatasetSummary[] }) {
  if (datasets.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No datasets uploaded yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
      {datasets.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{d.displayName}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {d.category} · {d.rowCount} rows · {d.sourceFilename} · {new Date(d.uploadedAt).toLocaleString()}
            </p>
          </div>
          <form action={removeDataset}>
            <input type="hidden" name="id" value={d.id} />
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Delete
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
