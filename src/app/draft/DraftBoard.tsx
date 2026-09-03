"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DraftOrderPick, Player } from "@prisma/client";
import { POSITIONS, POSITION_BG, tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import { markDrafted, undoDraft, resetDraft, updateDraftOrderPickManager } from "./actions";

export default function DraftBoard({
  players,
  draftOrder,
}: {
  players: Player[];
  draftOrder: DraftOrderPick[];
}) {
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [pending, startTransition] = useTransition();
  const [editingPickId, setEditingPickId] = useState<string | null>(null);
  const router = useRouter();

  const available = useMemo(() => {
    let list = players.filter((p) => !p.draftedBy);
    if (positionFilter !== "ALL") list = list.filter((p) => p.position === positionFilter);
    return list.sort((a, b) => (a.overallRank ?? 9999) - (b.overallRank ?? 9999));
  }, [players, positionFilter]);

  const drafted = useMemo(
    () =>
      players
        .filter((p) => p.draftedBy)
        .sort((a, b) => (b.draftedAt?.getTime() ?? 0) - (a.draftedAt?.getTime() ?? 0)),
    [players]
  );

  // Every logged pick (by anyone) counts toward the running overall-pick
  // number, so "on the clock" reflects the whole league's draft order —
  // not just your own picks.
  const totalDrafted = useMemo(() => players.filter((p) => p.draftedBy).length, [players]);
  const nextOverallPick = totalDrafted + 1;
  const onTheClock = draftOrder.find((p) => p.overallPick === nextOverallPick);

  // The Nth player marked drafted (oldest first) is assumed to be whoever
  // was taken at the draft order's Nth overall pick — this app has no
  // other way to tie a drafted player back to a specific pick slot.
  const draftedAscending = useMemo(() => [...drafted].reverse(), [drafted]);
  const board = useMemo(
    () => draftOrder.map((pick, idx) => ({ pick, player: draftedAscending[idx] ?? null })),
    [draftOrder, draftedAscending]
  );

  const numRounds = useMemo(() => draftOrder.reduce((max, p) => Math.max(max, p.round), 0), [draftOrder]);
  const numSlots = useMemo(() => draftOrder.reduce((max, p) => Math.max(max, p.pickInRound), 0), [draftOrder]);
  const boardBySlot = useMemo(() => {
    const map = new Map<string, { pick: DraftOrderPick; player: Player | null }>();
    for (const entry of board) map.set(`${entry.pick.round}-${entry.pick.pickInRound}`, entry);
    return map;
  }, [board]);

  function handleDraft(formData: FormData) {
    startTransition(async () => {
      await markDrafted(formData);
      router.refresh();
    });
  }

  function handleUndo(formData: FormData) {
    startTransition(async () => {
      await undoDraft(formData);
      router.refresh();
    });
  }

  function handleReset() {
    if (!confirm("Reset the entire draft? This clears drafted status for every player.")) return;
    startTransition(async () => {
      await resetDraft();
      router.refresh();
    });
  }

  function handleUpdateManager(formData: FormData) {
    startTransition(async () => {
      await updateDraftOrderPickManager(formData);
      setEditingPickId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
        {onTheClock ? (
          <>
            Round {onTheClock.round}, Pick {onTheClock.pickInRound} (#{nextOverallPick} overall) — on the clock:{" "}
            <span className="font-semibold text-gridiron-600 dark:text-gridiron-300">
              {onTheClock.managerName}
            </span>
          </>
        ) : (
          <span className="text-zinc-500">
            Pick #{nextOverallPick} overall — upload your draft order above to see who's on the clock.
          </span>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">On the Board ({available.length})</h2>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setPositionFilter("ALL")}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              positionFilter === "ALL" ? "bg-gridiron-500 text-white" : "bg-zinc-100 dark:bg-ink-800"
            }`}
          >
            ALL
          </button>
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPositionFilter(p)}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                positionFilter === p ? "bg-gridiron-500 text-white" : "bg-zinc-100 dark:bg-ink-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[75vh] space-y-2 overflow-y-auto">
        {available.map((p) => (
          <div key={p.id} className={`rounded-lg border-l-4 bg-white p-2 shadow-sm backdrop-blur-md dark:bg-ink-900/70 ${tierColor(p.tier)}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Link href={`/players/${p.id}`} className="font-medium hover:underline">
                  {p.overallRank ? `${p.overallRank}. ` : ""}
                  {p.name}
                </Link>
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-zinc-500">
                  {p.position}
                  <TeamBadge team={p.team} />
                </span>
              </div>
              <form action={handleDraft}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="draftedBy" value={onTheClock?.managerName ?? ""} />
                <input type="hidden" name="draftRound" value={onTheClock?.round ?? ""} />
                <input type="hidden" name="draftPick" value={onTheClock?.pickInRound ?? ""} />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-gridiron-500 px-2 py-1 text-xs font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
                >
                  Draft
                </button>
              </form>
            </div>
          </div>
        ))}
        {available.length === 0 && <p className="text-sm text-zinc-500">No available players match this filter.</p>}
      </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Draft Board</h2>
          <button
            onClick={handleReset}
            className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40"
          >
            Reset Draft
          </button>
        </div>
        {numRounds === 0 || numSlots === 0 ? (
          <p className="text-sm text-zinc-500">Upload your draft order above to see the full board.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Snakes each round — odd rounds run left→right, even rounds right→left, so consecutive picks stay
              adjacent.
            </p>
            <div className="max-h-[75vh] overflow-auto rounded-lg border border-zinc-200 dark:border-ink-800">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-white dark:bg-ink-900">
                  <tr>
                    <th className="border-b border-r border-zinc-200 p-1.5 text-left dark:border-ink-800">Rnd</th>
                    {Array.from({ length: numSlots }, (_, i) => i + 1).map((col) => (
                      <th key={col} className="border-b border-zinc-200 p-1.5 dark:border-ink-800" />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: numRounds }, (_, i) => i + 1).map((round) => {
                    const isReversed = round % 2 === 0;
                    const slotOrder = Array.from({ length: numSlots }, (_, i) => i + 1);
                    if (isReversed) slotOrder.reverse();
                    return (
                      <tr key={round}>
                        <td className="border-r border-b border-zinc-200 p-1.5 text-center font-semibold dark:border-ink-800">
                          {round}
                        </td>
                        {slotOrder.map((slot) => {
                          const entry = boardBySlot.get(`${round}-${slot}`);
                          if (!entry) return <td key={slot} className="border-b border-zinc-100 p-1.5 dark:border-ink-900" />;
                          const { pick, player: p } = entry;
                          const isOnTheClock = pick.overallPick === nextOverallPick;
                          return (
                            <td
                              key={slot}
                              className={`min-w-[110px] border-b p-1.5 align-top ${
                                p
                                  ? `border-zinc-100 dark:border-ink-900 ${POSITION_BG[p.position] ?? ""}`
                                  : isOnTheClock
                                    ? "border-gridiron-500 bg-gridiron-50 dark:bg-gridiron-950/40"
                                    : "border-zinc-100 dark:border-ink-900"
                              }`}
                            >
                              {editingPickId === pick.id ? (
                                <form action={handleUpdateManager} className="mb-0.5 flex items-center gap-0.5">
                                  <input type="hidden" name="id" value={pick.id} />
                                  <input
                                    name="managerName"
                                    defaultValue={pick.managerName}
                                    autoFocus
                                    className="w-full min-w-0 rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-700 dark:bg-ink-800"
                                  />
                                  <button type="submit" className="shrink-0 text-[10px] text-emerald-600 hover:underline">
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPickId(null)}
                                    className="shrink-0 text-[10px] text-zinc-400 hover:underline"
                                  >
                                    ✕
                                  </button>
                                </form>
                              ) : (
                                <div className="flex items-baseline justify-between gap-1 text-[10px] text-zinc-400">
                                  <button
                                    type="button"
                                    onClick={() => setEditingPickId(pick.id)}
                                    className="truncate text-left hover:underline"
                                    title={`${pick.managerName} — click to edit`}
                                  >
                                    {pick.managerName}
                                  </button>
                                  <span className="shrink-0">#{pick.overallPick}</span>
                                </div>
                              )}
                              {p ? (
                                <>
                                  <Link href={`/players/${p.id}`} className="block truncate font-medium hover:underline">
                                    {p.name}
                                  </Link>
                                  <div className="mt-0.5 flex items-center justify-between gap-1">
                                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                                      {p.position}
                                      <TeamBadge team={p.team} />
                                    </span>
                                    <form action={handleUndo}>
                                      <input type="hidden" name="id" value={p.id} />
                                      <button type="submit" className="text-[10px] text-rose-500 hover:underline">
                                        Undo
                                      </button>
                                    </form>
                                  </div>
                                </>
                              ) : isOnTheClock ? (
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-gridiron-600 dark:text-gridiron-300">
                                  On the clock
                                </span>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
