import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TAG_STYLES, tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import PlayerFormModal from "../PlayerFormModal";
import NoteForm from "./NoteForm";
import GameLogTable from "./GameLogTable";
import BackLink from "./BackLink";
import { deleteNote } from "../actions";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const player = await prisma.player.findUnique({
    where: { id: params.id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      gameLogs: { orderBy: [{ season: "desc" }, { week: "asc" }] },
    },
  });

  if (!player) notFound();

  const kindEmoji: Record<string, string> = { note: "📝", trend: "📈", news: "📰", injury: "🩹" };

  return (
    <div>
      <BackLink />

      <div className={`mb-6 rounded-lg border-l-4 bg-white p-5 shadow-sm backdrop-blur-md dark:bg-ink-900/70 ${tierColor(player.tier)}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            {player.headshotUrl && (
              <Image
                src={player.headshotUrl}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-full border border-zinc-200 bg-zinc-100 object-cover dark:border-ink-800 dark:bg-ink-800"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {player.watchlisted && "⭐ "}
                {player.name}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                <span>{player.position}</span>
                <TeamBadge team={player.team} />
                <span>· Bye {player.byeWeek ?? "—"}</span>
              </p>
            </div>
          </div>
          <PlayerFormModal player={player} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-8">
          <Stat label="Overall Rank" value={player.overallRank ?? "—"} />
          <Stat label="Position Rank" value={player.positionRank ?? "—"} />
          <Stat label="ESPN ADP" value={player.espnAdp ?? "—"} />
          <Stat label="Sleeper ADP" value={player.sleeperAdp ?? "—"} />
          <Stat label="Tier" value={player.tier ? `Tier ${player.tier}` : "—"} />
          <Stat label="Proj Pts" value={player.projectedPoints ?? "—"} />
          <Stat
            label="2025 PPR"
            value={
              player.actualPointsPPR != null
                ? `${player.actualPointsPPR.toFixed(1)}${player.actualGamesPlayed ? ` (${player.actualGamesPlayed}gp)` : ""}`
                : "—"
            }
          />
        </div>

        {player.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {player.tags.map((t) => (
              <span key={t} className={`rounded px-2 py-0.5 text-xs ${TAG_STYLES[t] ?? "bg-zinc-200"}`}>
                {t}
              </span>
            ))}
          </div>
        )}

        {player.bio && <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{player.bio}</p>}

        {player.draftedBy && (
          <p className="mt-3 rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-ink-800">
            Drafted by <strong>{player.draftedBy}</strong>
            {player.draftRound ? ` — Round ${player.draftRound}, Pick ${player.draftPick}` : ""}
          </p>
        )}
      </div>

      {player.gameLogs.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-bold">Game Log</h2>
          <GameLogTable position={player.position} byeWeek={player.byeWeek} logs={player.gameLogs} />
        </div>
      )}

      <h2 className="mb-2 text-lg font-bold">Notes &amp; Trends Timeline</h2>
      <NoteForm playerId={player.id} />

      <div className="space-y-3">
        {player.notes.length === 0 && (
          <p className="text-sm text-zinc-500">No notes yet. Log your first scouting note above.</p>
        )}
        {player.notes.map((note) => (
          <div key={note.id} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-ink-800">
            <div>
              <span className="mr-2">{kindEmoji[note.kind] ?? "📝"}</span>
              <span className="text-xs uppercase text-zinc-400">{note.kind}</span>
              <p className="mt-1">{note.body}</p>
              <p className="mt-1 text-xs text-zinc-400">{note.createdAt.toLocaleString()}</p>
            </div>
            <form action={deleteNote}>
              <input type="hidden" name="id" value={note.id} />
              <input type="hidden" name="playerId" value={player.id} />
              <button type="submit" className="text-xs text-rose-500 hover:underline">
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-zinc-50 p-2 text-center dark:bg-ink-800">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
