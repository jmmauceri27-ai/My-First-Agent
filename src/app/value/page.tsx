import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { adpValue, groupByRankBand } from "@/lib/value";
import ValueRow from "@/components/ValueRow";

export const dynamic = "force-dynamic";

export default async function ValueBoardPage() {
  const players = await prisma.player.findMany({
    where: { draftedBy: null, overallRank: { not: null }, espnAdp: { not: null } },
  });

  const withValue = players.map((p) => ({ player: p, value: adpValue(p)! }));

  const bestBands = groupByRankBand(withValue.filter((v) => v.value > 0 && v.player.espnAdp! <= 150)).map(
    (band) => ({ ...band, entries: band.entries.sort((a, b) => b.value - a.value) })
  );
  const worstBands = groupByRankBand(withValue.filter((v) => v.value < 0)).map((band) => ({
    ...band,
    entries: band.entries.sort((a, b) => a.value - b.value),
  }));

  return (
    <div>
      <Link href="/" className="mb-3 inline-block text-sm text-zinc-500 hover:underline">
        ← Back to Dashboard
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Value Board</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Every available player with a rank/ADP gap, broken out by 10-pick rank range so you can spot value at
        every point in the draft — not just at the very top.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-1 text-lg font-bold">Best Value</h2>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Top-150 ADP, ranked well ahead of it.
          </p>
          <div className="space-y-5">
            {bestBands.map((band) => (
              <div key={band.start}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Rank {band.label}
                </h3>
                <div className="space-y-2">
                  {band.entries.map(({ player: p, value }) => (
                    <ValueRow key={p.id} player={p} value={value} />
                  ))}
                </div>
              </div>
            ))}
            {bestBands.length === 0 && (
              <p className="text-sm text-zinc-500">
                Add both a rank and an ESPN ADP to your players to see value picks here.
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-1 text-lg font-bold">Worst Value</h2>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            ESPN expects them gone before your rank says they should be.
          </p>
          <div className="space-y-5">
            {worstBands.map((band) => (
              <div key={band.start}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Rank {band.label}
                </h3>
                <div className="space-y-2">
                  {band.entries.map(({ player: p, value }) => (
                    <ValueRow key={p.id} player={p} value={value} />
                  ))}
                </div>
              </div>
            ))}
            {worstBands.length === 0 && (
              <p className="text-sm text-zinc-500">
                Add both a rank and an ESPN ADP to your players to see reaches here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
