import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PlayersTable from "./PlayersTable";
import PlayerFormModal from "./PlayerFormModal";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    orderBy: [{ overallRank: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Players</h1>
        <div className="flex items-center gap-2">
          <a
            href="/players/export"
            className="rounded-md border border-gridiron-500 px-3 py-2 text-sm font-medium text-gridiron-600 hover:bg-gridiron-50 dark:text-gridiron-100 dark:hover:bg-ink-800"
          >
            Download Rankings
          </a>
          <Link
            href="/players/import"
            className="rounded-md border border-gridiron-500 px-3 py-2 text-sm font-medium text-gridiron-600 hover:bg-gridiron-50 dark:text-gridiron-100 dark:hover:bg-ink-800"
          >
            Bulk Import CSV
          </Link>
        </div>
      </div>
      {players.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="mb-3 text-zinc-600 dark:text-zinc-400">
            No players yet. Add your first player, or bulk-import your rankings via CSV.
          </p>
          <div className="flex justify-center gap-3">
            <PlayerFormModal />
            <Link
              href="/players/import"
              className="rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600"
            >
              Import CSV
            </Link>
          </div>
        </div>
      ) : (
        <PlayersTable players={players} />
      )}
    </div>
  );
}
