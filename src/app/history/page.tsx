import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SeasonForm from "./SeasonForm";
import TrendsView from "./TrendsView";
import DeleteSeasonButton from "./DeleteSeasonButton";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [seasons, picks] = await Promise.all([
    prisma.draftSeason.findMany({
      orderBy: { year: "desc" },
      include: { _count: { select: { picks: true } } },
    }),
    prisma.draftHistoryPick.findMany({
      include: { season: { select: { id: true, year: true, name: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Draft History</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Log your league's past drafts to spot trends — which positions go in which rounds, and which
        managers gravitate toward which positions.
      </p>

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-lg font-bold">Seasons</h2>
        <SeasonForm />
      </div>

      {seasons.length === 0 ? (
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          No seasons logged yet. Add a season above, then import that draft's picks.
        </p>
      ) : (
        <div className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {seasons.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70"
            >
              <Link href={`/history/${s.id}`} className="hover:underline">
                <div className="font-semibold">
                  {s.year}
                  {s.name ? ` — ${s.name}` : ""}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {s._count.picks} pick{s._count.picks === 1 ? "" : "s"}
                  {s.numTeams ? ` · ${s.numTeams} teams` : ""}
                </div>
              </Link>
              <DeleteSeasonButton id={s.id} label={`${s.year}${s.name ? " " + s.name : ""}`} />
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-bold">Trends</h2>
      {picks.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Import some picks into a season to see positional and manager trends here.
        </p>
      ) : (
        <TrendsView
          picks={picks.map((p) => ({
            round: p.round,
            pickInRound: p.pickInRound,
            manager: p.manager,
            playerName: p.playerName,
            position: p.position,
            nflTeam: p.nflTeam,
            seasonId: p.season.id,
            seasonLabel: `${p.season.year}${p.season.name ? " — " + p.season.name : ""}`,
          }))}
        />
      )}
    </div>
  );
}
