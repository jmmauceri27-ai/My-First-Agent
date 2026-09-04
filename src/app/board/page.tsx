import { prisma } from "@/lib/prisma";
import BoardView from "./BoardView";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const players = await prisma.player.findMany({
    orderBy: [{ tier: "asc" }, { overallRank: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Tier Board</h1>
      <BoardView players={players} />
    </div>
  );
}
