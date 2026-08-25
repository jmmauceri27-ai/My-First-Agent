"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DraftPickTrade, LeagueSettings } from "@prisma/client";
import { managerName } from "@/lib/managerLabels";
import { addPickTrade, deletePickTrade } from "./actions";

export default function PickTrades({
  trades,
  leagueSettings,
}: {
  trades: DraftPickTrade[];
  leagueSettings: LeagueSettings;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const slotOptions = Array.from({ length: leagueSettings.numTeams }, (_, i) => ({
    slot: i + 1,
    label: managerName(i + 1, leagueSettings),
  }));

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await addPickTrade(formData);
      router.refresh();
    });
  }

  function handleDelete(formData: FormData) {
    startTransition(async () => {
      await deletePickTrade(formData);
      router.refresh();
    });
  }

  const sortedTrades = [...trades].sort((a, b) => a.round - b.round || a.fromSlot - b.fromSlot);

  return (
    <div className="mb-4 rounded-lg border border-zinc-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
      >
        <span>
          Pick Trades{trades.length > 0 ? ` (${trades.length})` : ""}
        </span>
        <span className="text-xs text-zinc-400">{open ? "Hide ▲" : "Show ▼"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-200 p-3 text-sm dark:border-ink-800">
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            If picks in your league have been traded, log them here — the "on the clock" prediction below
            will use the new owner instead of the original slot for that round.
          </p>

          {sortedTrades.length > 0 && (
            <ul className="mb-3 space-y-1">
              {sortedTrades.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-2 py-1 dark:bg-ink-800">
                  <span>
                    Round {t.round}: {managerName(t.fromSlot, leagueSettings)}'s pick → traded to{" "}
                    <strong>{managerName(t.toSlot, leagueSettings)}</strong>
                  </span>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="text-xs text-rose-500 hover:underline">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={handleAdd} className="flex flex-wrap items-center gap-1.5">
            <span>Round</span>
            <input
              type="number"
              name="round"
              min={1}
              required
              className="w-14 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-ink-800"
            />
            <select
              name="fromSlot"
              required
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-ink-800"
            >
              {slotOptions.map((o) => (
                <option key={o.slot} value={o.slot}>
                  {o.label}'s pick
                </option>
              ))}
            </select>
            <span>→ traded to</span>
            <select
              name="toSlot"
              required
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-ink-800"
            >
              {slotOptions.map((o) => (
                <option key={o.slot} value={o.slot}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-gridiron-500 px-3 py-1 text-xs font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
