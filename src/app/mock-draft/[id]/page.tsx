import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { teamSlotForPick, totalRounds } from "@/lib/mockDraftEngine";
import DraftRoom from "./DraftRoom";

export const dynamic = "force-dynamic";

export default async function MockDraftRoomPage({ params }: { params: { id: string } }) {
  const mockDraft = await prisma.mockDraft.findUnique({
    where: { id: params.id },
    include: { picks: { orderBy: { overallPick: "asc" } } },
  });
  if (!mockDraft) notFound();

  const pickedPlayerIds = new Set(mockDraft.picks.map((p) => p.playerId));
  const availablePlayers = await prisma.player.findMany({
    where: { id: { notIn: Array.from(pickedPlayerIds) } },
    orderBy: [{ overallRank: "asc" }, { name: "asc" }],
  });

  const totalPicks = totalRounds(mockDraft) * mockDraft.numTeams;
  const nextOverallPick = mockDraft.picks.length + 1;
  const onTheClock = nextOverallPick <= totalPicks ? teamSlotForPick(nextOverallPick, mockDraft.numTeams) : null;
  const isUserTurn = !mockDraft.completed && onTheClock?.teamSlot === mockDraft.myDraftSlot;

  return (
    <div>
      <Link href="/mock-draft" className="mb-3 inline-block text-sm text-zinc-500 hover:underline">
        ← Back to Mock Draft
      </Link>
      <DraftRoom
        mockDraft={mockDraft}
        picks={mockDraft.picks}
        availablePlayers={availablePlayers}
        totalPicks={totalPicks}
        nextOverallPick={nextOverallPick}
        onTheClockRound={onTheClock?.round ?? null}
        onTheClockTeamSlot={onTheClock?.teamSlot ?? null}
        isUserTurn={isUserTurn}
      />
    </div>
  );
}
