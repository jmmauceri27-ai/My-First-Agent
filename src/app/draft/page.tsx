import { prisma } from "@/lib/prisma";
import DraftBoard from "./DraftBoard";

export const dynamic = "force-dynamic";

export default async function DraftPage() {
  const players = await prisma.player.findMany();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Draft Day Tracker</h1>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Mark players as they come off the board — by you or an opponent — and watch your remaining board update live.
      </p>
      <DraftBoard players={players} />
    </div>
  );
}
