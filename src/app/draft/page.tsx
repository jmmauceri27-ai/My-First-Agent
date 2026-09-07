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
      <h1 className="mb-2 text-xl font-bold">Draft Day Tracker</h1>
      <DraftOrderImportForm picks={draftOrder} />
      <DraftBoard players={players} draftOrder={draftOrder} />
    </div>
  );
}
