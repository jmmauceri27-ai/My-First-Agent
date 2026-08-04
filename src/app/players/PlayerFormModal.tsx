"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { savePlayer } from "./actions";
import { POSITIONS, TAG_OPTIONS } from "@/lib/constants";
import type { Player } from "@prisma/client";

export default function PlayerFormModal({ player }: { player?: Player }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await savePlayer(formData);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          player
            ? "rounded-md px-2 py-1 text-sm text-gridiron-600 hover:bg-gridiron-50 dark:text-gridiron-100 dark:hover:bg-ink-800"
            : "rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600"
        }
      >
        {player ? "Edit" : "+ Add Player"}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-ink-900">
              <h2 className="mb-4 text-lg font-bold">{player ? `Edit ${player.name}` : "Add Player"}</h2>
              <form action={handleSubmit} className="space-y-3">
                {player && <input type="hidden" name="id" value={player.id} />}

                <div className="grid grid-cols-2 gap-3">
                  <label className="col-span-2 text-sm font-medium">
                    Name
                    <input
                      name="name"
                      required
                      defaultValue={player?.name}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Position
                    <select
                      name="position"
                      required
                      defaultValue={player?.position ?? "QB"}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                    >
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Team
                    <input
                      name="team"
                      defaultValue={player?.team ?? ""}
                      placeholder="e.g. KC"
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Bye Week
                    <input
                      type="number"
                      name="byeWeek"
                      defaultValue={player?.byeWeek ?? ""}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Tier
                    <input
                      type="number"
                      name="tier"
                      min={1}
                      defaultValue={player?.tier ?? ""}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Overall Rank
                    <input
                      type="number"
                      name="overallRank"
                      defaultValue={player?.overallRank ?? ""}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Position Rank
                    <input
                      type="number"
                      name="positionRank"
                      defaultValue={player?.positionRank ?? ""}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    ADP
                    <input
                      type="number"
                      step="0.1"
                      name="adp"
                      defaultValue={player?.adp ?? ""}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                    />
                  </label>
                </div>

                <fieldset>
                  <legend className="text-sm font-medium">Tags</legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                      >
                        <input
                          type="checkbox"
                          name="tags"
                          value={tag}
                          defaultChecked={player?.tags?.includes(tag)}
                        />
                        {tag}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="watchlisted" defaultChecked={player?.watchlisted} />
                  On my watchlist
                </label>

                <label className="block text-sm font-medium">
                  Bio / cheat-sheet blurb
                  <textarea
                    name="bio"
                    rows={3}
                    defaultValue={player?.bio ?? ""}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                  />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-ink-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
                  >
                    {pending ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
