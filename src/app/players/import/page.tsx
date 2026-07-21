import Link from "next/link";
import ImportForm from "./ImportForm";
import ActualStatsImportForm from "./ActualStatsImportForm";
import GameLogsImportForm from "./GameLogsImportForm";

export default function ImportPage() {
  return (
    <div>
      <Link href="/players" className="mb-3 inline-block text-sm text-zinc-500 hover:underline">
        ← Back to Players
      </Link>
      <h1 className="mb-4 text-2xl font-bold">Bulk Import Rankings (CSV)</h1>
      <ImportForm />
      <div className="mt-8">
        <ActualStatsImportForm />
      </div>
      <div className="mt-8">
        <GameLogsImportForm />
      </div>
    </div>
  );
}
