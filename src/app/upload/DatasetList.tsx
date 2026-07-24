import type { DatasetSummary } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { removeDataset } from "./actions";

export default function DatasetList({ datasets }: { datasets: DatasetSummary[] }) {
  if (datasets.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No datasets uploaded yet.</p>;
  }

  return (
    <Card className="flex flex-col divide-y divide-slate-100 overflow-hidden dark:divide-slate-900">
      {datasets.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{d.displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {d.category} · {d.rowCount} rows · {d.sourceFilename} · {new Date(d.uploadedAt).toLocaleString()}
            </p>
          </div>
          <form action={removeDataset}>
            <input type="hidden" name="id" value={d.id} />
            <Button type="submit" variant="danger">
              Delete
            </Button>
          </form>
        </div>
      ))}
    </Card>
  );
}
