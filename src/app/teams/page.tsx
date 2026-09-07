import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TeamBadge from "@/components/TeamBadge";
import { buildRoster, STARTER_SLOTS, BENCH_SIZE, type StarterSlot } from "@/lib/rosterSlots";

export const dynamic = "force-dynamic";

const SLOT_LABEL: Record<StarterSlot, string> = {
  QB: "QB",
  RB1: "RB",
  RB2: "RB",
  WR1: "WR",
  WR2: "WR",
  TE: "TE",
  FLEX: "FLEX",
  DST: "D/ST",
  K: "K",
};

export default async function TeamsPage() {
  const [players, draftOrder] = await Promise.all([
    prisma.player.findMany(),
    prisma.draftOrderPick.findMany({ orderBy: { overallPick: "asc" } }),
  ]);

  // Prefer the draft order's manager list (in first-pick order) so every
  // team shows up even before they've made a pick; fall back to whoever
  // has actually drafted someone if no draft order has been uploaded yet.
  const managerFirstPick = new Map<string, number>();
  for (const pick of draftOrder) {
    if (!managerFirstPick.has(pick.managerName)) managerFirstPick.set(pick.managerName, pick.overallPick);
  }
  let managers = Array.from(managerFirstPick.keys()).sort(
    (a, b) => managerFirstPick.get(a)! - managerFirstPick.get(b)!
  );
  if (managers.length === 0) {
    managers = Array.from(new Set(players.filter((p) => p.draftedBy).map((p) => p.draftedBy!))).sort();
  }

  const byManager = new Map<string, typeof players>();
  for (const p of players) {
    if (!p.draftedBy) continue;
    if (!byManager.has(p.draftedBy)) byManager.set(p.draftedBy, []);
    byManager.get(p.draftedBy)!.push(p);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Teams</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Every manager's lineup, filled in as picks are logged: QB, RB, RB, WR, WR, TE, FLEX, D/ST, K, and {BENCH_SIZE} bench spots.
      </p>

      {managers.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Upload your draft order or log a pick on the Draft Day Tracker to see teams here.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {managers.map((manager) => {
            const { slots, bench } = buildRoster(byManager.get(manager) ?? []);
            return (
              <div
                key={manager}
                className="rounded-lg border border-zinc-200 bg-white/90 p-3 shadow-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70"
              >
                <h2 className="mb-2 font-bold">{manager}</h2>
                <div className="space-y-1 text-sm">
                  {STARTER_SLOTS.map((slot) => {
                    const p = slots[slot];
                    return (
                      <div key={slot} className="flex items-center gap-2 border-b border-zinc-100 py-1 last:border-0 dark:border-ink-900">
                        <span className="w-10 shrink-0 text-xs font-semibold text-zinc-400">{SLOT_LABEL[slot]}</span>
                        {p ? (
                          <Link href={`/players/${p.id}`} className="truncate hover:underline">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600">Empty</span>
                        )}
                        {p && (
                          <span className="ml-auto shrink-0">
                            <TeamBadge team={p.team} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <h3 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Bench ({bench.length}/{BENCH_SIZE})
                </h3>
                <div className="space-y-1 text-sm">
                  {bench.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 border-b border-zinc-100 py-1 last:border-0 dark:border-ink-900">
                      <span className="w-10 shrink-0 text-xs font-semibold text-zinc-400">{p.position}</span>
                      <Link href={`/players/${p.id}`} className="truncate hover:underline">
                        {p.name}
                      </Link>
                      <span className="ml-auto shrink-0">
                        <TeamBadge team={p.team} />
                      </span>
                    </div>
                  ))}
                  {bench.length === 0 && <p className="text-xs text-zinc-400">No bench players yet.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
