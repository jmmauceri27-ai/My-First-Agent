import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { GameLog } from "@prisma/client";
import { TAG_STYLES, tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import PlayerFormModal from "../PlayerFormModal";
import NoteForm from "./NoteForm";
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

  function statLine(log: GameLog): string {
    const parts: string[] = [];
    if (log.passYards || log.passTDs || log.passInt) {
      parts.push(`${log.passYards ?? 0} pass yds, ${log.passTDs ?? 0} TD, ${log.passInt ?? 0} INT`);
    }
    if (log.rushYards || log.rushTDs) {
      parts.push(`${log.rushYards ?? 0} rush yds, ${log.rushTDs ?? 0} TD`);
    }
    if (log.receptions || log.recYards || log.recTDs) {
      parts.push(`${log.receptions ?? 0} rec, ${log.recYards ?? 0} yds, ${log.recTDs ?? 0} TD`);
    }
    return parts.join(" | ") || "—";
  }

  const kindEmoji: Record<string, string> = { note: "📝", trend: "📈", news: "📰", injury: "🩹" };

  return (
    <div>
      <Link href="/players" className="mb-3 inline-block text-sm text-zinc-500 hover:underline">
        ← Back to Players
      </Link>

      <div className={`mb-6 rounded-lg border-l-4 bg-white p-5 shadow-sm backdrop-blur-md dark:bg-ink-900/70 ${tierColor(player.tier)}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
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
          <PlayerFormModal player={player} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <Stat label="Overall Rank" value={player.overallRank ?? "—"} />
          <Stat label="Position Rank" value={player.positionRank ?? "—"} />
          <Stat label="ADP" value={player.adp ?? "—"} />
          <Stat label="Tier" value={player.tier ? `Tier ${player.tier}` : "—"} />
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
        <>
          <h2 className="mb-2 text-lg font-bold">Game Log</h2>
          <div className="mb-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-left dark:bg-ink-900/60">
                <tr>
                  <th className="px-3 py-2">Wk</th>
                  <th className="px-3 py-2">Opp</th>
                  <th className="px-3 py-2">Stat Line</th>
                  <th className="px-3 py-2">PPR</th>
                </tr>
              </thead>
              <tbody>
                {player.gameLogs.map((log) => (
                  <tr key={log.id} className="border-t border-zinc-200 dark:border-ink-800">
                    <td className="px-3 py-2">{log.week}</td>
                    <td className="px-3 py-2">{log.opponent ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">{statLine(log)}</td>
                    <td className="px-3 py-2 font-medium">{log.pointsPPR.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
