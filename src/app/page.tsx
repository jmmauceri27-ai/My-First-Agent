import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TAG_STYLES, tierColor } from "@/lib/constants";
import { adpValue } from "@/lib/value";
import TeamBadge from "@/components/TeamBadge";
import ValueRow from "@/components/ValueRow";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalPlayers, draftedCount, watchlistCount, recentNotes, spotlight, valueCandidates] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { draftedBy: { not: null } } }),
    prisma.player.count({ where: { watchlisted: true } }),
    prisma.note.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { player: true },
    }),
    prisma.player.findMany({
      where: { draftedBy: null, tags: { hasSome: ["target", "sleeper", "breakout"] } },
      orderBy: { overallRank: "asc" },
      take: 6,
    }),
    prisma.player.findMany({
      where: { draftedBy: null, overallRank: { not: null }, espnAdp: { not: null } },
    }),
  ]);

  const withValue = valueCandidates.map((p) => ({ player: p, value: adpValue(p)! }));
  const bestValue = withValue
    .filter((v) => v.value > 0 && v.player.espnAdp! <= 150)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const worstValue = withValue
    .filter((v) => v.value < 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, 5);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Draft Prep Dashboard</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Your rankings, notes, and draft-day board — synced across every device.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Players" value={totalPlayers} href="/players" />
        <StatCard label="Drafted" value={draftedCount} href="/draft" />
        <StatCard label="Watchlist" value={watchlistCount} href="/players" />
        <StatCard label="Available" value={totalPlayers - draftedCount} href="/board" />
      </div>

      {totalPlayers === 0 && (
        <div className="mb-6 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="mb-3 text-zinc-600 dark:text-zinc-400">
            You haven't added any players yet. Start by adding a few manually or bulk-importing your rankings.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/players" className="rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600">
              Go to Players
            </Link>
            <Link
              href="/players/import"
              className="rounded-md border border-gridiron-500 px-4 py-2 text-sm font-medium text-gridiron-600 dark:text-gridiron-100"
            >
              Import CSV
            </Link>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">Best Value</h2>
            <Link href="/value" className="text-xs font-medium text-gridiron-600 hover:underline dark:text-gridiron-100">
              See full list by range →
            </Link>
          </div>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Top-150 ADP, ranked well ahead of it — should still be there when it's your pick.
          </p>
          <div className="space-y-2">
            {bestValue.map(({ player: p, value }) => (
              <ValueRow key={p.id} player={p} value={value} />
            ))}
            {bestValue.length === 0 && (
              <p className="text-sm text-zinc-500">
                Add both a rank and an ESPN ADP to your players to see value picks here.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">Worst Value</h2>
            <Link href="/value" className="text-xs font-medium text-gridiron-600 hover:underline dark:text-gridiron-100">
              See full list by range →
            </Link>
          </div>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            ESPN expects them gone before your rank says they should be — likely a reach.
          </p>
          <div className="space-y-2">
            {worstValue.map(({ player: p, value }) => (
              <ValueRow key={p.id} player={p} value={value} />
            ))}
            {worstValue.length === 0 && (
              <p className="text-sm text-zinc-500">
                Add both a rank and an ESPN ADP to your players to see reaches here.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold">Targets &amp; Sleepers Still Available</h2>
          <div className="space-y-2">
            {spotlight.map((p) => (
              <Link
                key={p.id}
                href={`/players/${p.id}`}
                className={`block rounded-lg border-l-4 bg-white p-2 text-sm shadow-sm backdrop-blur-md hover:shadow dark:bg-ink-900/70 ${tierColor(p.tier)}`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-zinc-500">
                  {p.position}
                  <TeamBadge team={p.team} />
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} className={`rounded px-1.5 py-0.5 text-[10px] ${TAG_STYLES[t] ?? "bg-zinc-200"}`}>
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
            {spotlight.length === 0 && (
              <p className="text-sm text-zinc-500">Tag players "target", "sleeper", or "breakout" to see them here.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold">Recent Notes &amp; Trends</h2>
          <div className="space-y-2">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/players/${note.playerId}`}
                className="block rounded-lg border border-zinc-200 p-2 text-sm hover:bg-zinc-50 dark:border-ink-800 dark:hover:bg-ink-900"
              >
                <span className="font-medium">{note.player.name}</span>
                <span className="ml-2 text-xs uppercase text-zinc-400">{note.kind}</span>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">{note.body}</p>
                <p className="mt-1 text-xs text-zinc-400">{note.createdAt.toLocaleString()}</p>
              </Link>
            ))}
            {recentNotes.length === 0 && (
              <p className="text-sm text-zinc-500">No notes logged yet. Add notes on a player's detail page.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 bg-white p-3 text-center shadow-sm backdrop-blur-md hover:shadow dark:border-ink-800 dark:bg-ink-900/70"
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
    </Link>
  );
}
