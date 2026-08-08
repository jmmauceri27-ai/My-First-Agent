import Link from "next/link";
import ImportForm from "./ImportForm";
import ActualStatsImportForm from "./ActualStatsImportForm";
import GameLogsImportForm from "./GameLogsImportForm";
import AdpImportForm from "./AdpImportForm";

export default function ImportPage() {
  return (
    <div>
      <Link href="/players" className="mb-3 inline-block text-sm text-zinc-500 hover:underline">
        ← Back to Players
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Bulk Import Rankings (CSV)</h1>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        To bulk-edit your rankings: download your current board, edit ranks/tiers/etc. in a spreadsheet,
        then re-upload the same file below — it updates existing players by name + position instead of
        duplicating them.
      </p>
      <a
        href="/players/export"
        className="mb-6 inline-block rounded-md border border-gridiron-500 px-4 py-2 text-sm font-medium text-gridiron-600 hover:bg-gridiron-50 dark:text-gridiron-100 dark:hover:bg-ink-800"
      >
        ⬇ Download Current Rankings (CSV)
      </a>
      <ImportForm />
      <div className="mt-8">
        <AdpImportForm />
      </div>
      <div className="mt-8">
        <ActualStatsImportForm />
      </div>
      <div className="mt-8">
        <GameLogsImportForm />
      </div>
    </div>
  );
}
