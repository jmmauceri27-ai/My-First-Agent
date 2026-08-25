"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DraftOrderPick, Player } from "@prisma/client";
import { POSITIONS, tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import { markDrafted, undoDraft, resetDraft } from "./actions";

export default function DraftBoard({
  players,
  draftOrder,
}: {
  players: Player[];
  draftOrder: DraftOrderPick[];
}) {
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [pending, startTransition] = useTransition();
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
      <div className="grid gap-6 lg:grid-cols-2">
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

        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {available.map((p) => (
            <div key={p.id} className={`rounded-lg border-l-4 bg-white p-2 shadow-sm backdrop-blur-md dark:bg-ink-900/70 ${tierColor(p.tier)}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {p.overallRank ? `${p.overallRank}. ` : ""}
                    {p.name}
                  </span>
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
          <h2 className="text-lg font-bold">Draft Results ({drafted.length})</h2>
          <button
            onClick={handleReset}
            className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40"
          >
            Reset Draft
          </button>
        </div>
        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {drafted.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-2 text-sm dark:border-ink-800">
              <div>
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-zinc-500">
                  {p.position}
                  <TeamBadge team={p.team} />
                  <span>
                    · {p.draftedBy}
                    {p.draftRound ? ` · Rnd ${p.draftRound} Pick ${p.draftPick}` : ""}
                  </span>
                </span>
              </div>
              <form action={handleUndo}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className="text-xs text-gridiron-600 hover:underline dark:text-gridiron-100">
                  Undo
                </button>
              </form>
            </div>
          ))}
          {drafted.length === 0 && <p className="text-sm text-zinc-500">No players drafted yet.</p>}
        </div>
      </div>
      </div>
    </div>
  );
}
