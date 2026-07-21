"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@prisma/client";
import { POSITIONS, tierColor } from "@/lib/constants";
import TeamBadge from "@/components/TeamBadge";
import { markDrafted, undoDraft, resetDraft } from "./actions";

export default function DraftBoard({ players }: { players: Player[] }) {
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [draftingId, setDraftingId] = useState<string | null>(null);
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

  function handleDraft(formData: FormData) {
    startTransition(async () => {
      await markDrafted(formData);
      setDraftingId(null);
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
                {draftingId === p.id ? null : (
                  <button
                    onClick={() => setDraftingId(p.id)}
                    className="rounded-md bg-gridiron-500 px-2 py-1 text-xs font-semibold text-white hover:bg-gridiron-600"
                  >
                    Draft
                  </button>
                )}
              </div>
              {draftingId === p.id && (
                <form action={handleDraft} className="mt-2 flex flex-wrap items-center gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    name="draftedBy"
                    placeholder="Drafted by (default: Me)"
                    className="w-36 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-ink-800"
                  />
                  <input
                    name="draftRound"
                    type="number"
                    placeholder="Rnd"
                    className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-ink-800"
                  />
                  <input
                    name="draftPick"
                    type="number"
                    placeholder="Pick"
                    className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-ink-800"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-gridiron-500 px-2 py-1 text-xs font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftingId(null)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-ink-800"
                  >
                    Cancel
                  </button>
                </form>
              )}
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
  );
}
