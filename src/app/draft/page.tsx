import { prisma } from "@/lib/prisma";
import DraftBoard from "./DraftBoard";
import DraftOrderImportForm from "./DraftOrderImportForm";

export const dynamic = "force-dynamic";

export default async function DraftPage() {
  const [players, draftOrder] = await Promise.all([
    prisma.player.findMany(),
    prisma.draftOrderPick.findMany({ orderBy: { overallPick: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Draft Day Tracker</h1>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Mark players as they come off the board — by you or an opponent — and watch your remaining board update live.
      </p>
      <DraftOrderImportForm picks={draftOrder} />
      <DraftBoard players={players} draftOrder={draftOrder} />
    </div>
  );
}
