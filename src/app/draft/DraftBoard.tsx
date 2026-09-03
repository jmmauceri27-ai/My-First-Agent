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

      <div className="min-w-0">
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
          <div className="max-h-[75vh] overflow-auto rounded-lg border border-zinc-200 p-2 dark:border-ink-800">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${numSlots}, minmax(120px, 1fr))` }}>
              {Array.from({ length: numRounds }, (_, i) => i + 1).flatMap((round) => {
                const isReversed = round % 2 === 0;
                const slotOrder = Array.from({ length: numSlots }, (_, i) => i + 1);
                if (isReversed) slotOrder.reverse();
                return slotOrder.map((slot) => {
                  const entry = boardBySlot.get(`${round}-${slot}`);
                  if (!entry) return <div key={`${round}-${slot}`} className="min-h-[92px] rounded-lg bg-zinc-50 dark:bg-ink-950" />;
                  const { pick, player: p } = entry;
                  const isOnTheClock = pick.overallPick === nextOverallPick;
                  const isEditing = editingPickId === pick.id;

                  const managerControl = isEditing ? (
                    <form action={handleUpdateManager} className="flex items-center gap-0.5">
                      <input type="hidden" name="id" value={pick.id} />
                      <input
                        name="managerName"
                        defaultValue={pick.managerName}
                        autoFocus
                        className="w-full min-w-0 rounded border border-zinc-300 px-1 py-0.5 text-[10px] text-zinc-900 dark:border-zinc-700 dark:bg-ink-800 dark:text-white"
                      />
                      <button type="submit" className="shrink-0 text-[10px] text-emerald-600 hover:underline">
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPickId(null)}
                        className="shrink-0 text-[10px] opacity-70 hover:underline"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingPickId(pick.id)}
                      className="truncate text-left italic hover:underline"
                      title="Click to edit"
                    >
                      {pick.managerName}
                    </button>
                  );

                  if (isOnTheClock) {
                    return (
                      <div
                        key={`${round}-${slot}`}
                        className="flex min-h-[92px] flex-col items-center justify-center gap-0.5 rounded-lg bg-emerald-500 p-2 text-center text-white shadow-sm"
                      >
                        <span className="text-[10px] font-semibold opacity-80">
                          {pick.round}.{pick.pickInRound}
                        </span>
                        <span className="text-base leading-none">⏱️</span>
                        <span className="text-xs font-bold uppercase tracking-wide">On the Clock</span>
                        <span className="w-full truncate text-[10px] opacity-90">{managerControl}</span>
                      </div>
                    );
                  }

                  if (!p) {
                    return (
                      <div
                        key={`${round}-${slot}`}
                        className="flex min-h-[92px] flex-col justify-between rounded-lg bg-zinc-100 p-2 text-[10px] text-zinc-400 dark:bg-ink-900 dark:text-zinc-500"
                      >
                        <span className="font-semibold">
                          {pick.round}.{pick.pickInRound}
                        </span>
                        {managerControl}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${round}-${slot}`}
                      className={`flex min-h-[92px] flex-col justify-between rounded-lg p-2 text-black shadow-sm ${POSITION_BG[p.position] ?? "bg-zinc-100"}`}
                    >
                      <span className="text-[10px] font-semibold opacity-70">
                        {pick.round}.{pick.pickInRound}
                      </span>
                      <div>
                        <Link href={`/players/${p.id}`} className="block truncate text-sm font-bold hover:underline">
                          {p.name}
                        </Link>
                        <span className="mt-0.5 inline-block rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold">
                          {p.position} {p.team ?? "FA"}
                          {p.byeWeek ? ` (${p.byeWeek})` : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[10px] opacity-80">
                        {managerControl}
                        <form action={handleUndo}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="shrink-0 not-italic hover:underline">
                            Undo
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
