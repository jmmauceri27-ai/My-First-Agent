import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeamBadge from "@/components/TeamBadge";
import { computeManagerTendencyTags, type TendencyPick } from "@/lib/managerTendencies";

export const dynamic = "force-dynamic";

const HISTORY_YEARS_SHOWN = 5;

export default async function ManagerProfilePage({ params }: { params: { manager: string } }) {
  const manager = decodeURIComponent(params.manager);

  const allPicks = await prisma.draftHistoryPick.findMany({
    include: { season: { select: { id: true, year: true, name: true } } },
  });

  const managerPicks = allPicks.filter((p) => p.manager === manager);
  if (managerPicks.length === 0) notFound();

  // Tendency tags need the whole league's picks for context (they're
  // z-scored against every other manager), even though we only display
  // this one manager's results.
  const tendencyInput: TendencyPick[] = allPicks.map((p) => ({
    round: p.round,
    manager: p.manager,
    position: p.position,
    seasonId: p.season.id,
  }));
  const { tags } = computeManagerTendencyTags(tendencyInput);
  const managerTags = tags.get(manager) ?? [];

  const years = Array.from(new Set(managerPicks.map((p) => p.season.year))).sort((a, b) => b - a);
  const recentYears = new Set(years.slice(0, HISTORY_YEARS_SHOWN));
  const recentPicks = managerPicks.filter((p) => recentYears.has(p.season.year));

  const byRound = new Map<number, typeof recentPicks>();
  for (const p of recentPicks) {
    if (!byRound.has(p.round)) byRound.set(p.round, []);
    byRound.get(p.round)!.push(p);
  }
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  for (const round of rounds) {
    byRound.get(round)!.sort((a, b) => b.season.year - a.season.year || a.pickInRound - b.pickInRound);
  }

  const seasonsPlayed = new Set(managerPicks.map((p) => p.season.id)).size;

  return (
    <div>
      <Link href="/history" className="mb-3 inline-block text-sm text-zinc-500 hover:underline">
        ← Back to Draft History
      </Link>

      <h1 className="mb-1 text-2xl font-bold">{manager}</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {managerPicks.length} pick{managerPicks.length === 1 ? "" : "s"} across {seasonsPlayed} season
        {seasonsPlayed === 1 ? "" : "s"}
      </p>

      <div className="mb-6 rounded-lg border border-zinc-200 bg-white/90 p-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
        <h2 className="mb-2 text-lg font-bold">Draft Tendencies</h2>
        {managerTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {managerTags.map((t, i) => (
              <span
                key={i}
                className="rounded bg-gridiron-100 px-2 py-1 text-sm font-medium text-gridiron-800 dark:bg-gridiron-900/40 dark:text-gridiron-200"
              >
                {t.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No strong standout — balanced approach relative to the rest of the league.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-bold">Draft History by Round</h2>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Every player picked, grouped by round, across the last {recentYears.size} season
          {recentYears.size === 1 ? "" : "s"} logged for this manager.
        </p>
        <div className="space-y-3">
          {rounds.map((round) => (
            <div
              key={round}
              className="rounded-lg border border-zinc-200 bg-white/90 p-3 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70"
            >
              <div className="mb-2 font-semibold">Round {round}</div>
              <div className="space-y-1 text-sm">
                {byRound.get(round)!.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 border-t border-zinc-100 pt-1 first:border-0 first:pt-0 dark:border-ink-800"
                  >
                    <span className="w-14 shrink-0 text-xs text-zinc-400">{p.season.year}</span>
                    <span className="flex-1">{p.playerName}</span>
                    <span className="w-8 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{p.position}</span>
                    <TeamBadge team={p.nflTeam} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {rounds.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No picks logged for this manager.</p>
          )}
        </div>
      </div>
    </div>
  );
}
