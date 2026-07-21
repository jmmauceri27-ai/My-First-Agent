"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPick } from "../actions";
import { POSITIONS } from "@/lib/constants";
import type { DraftHistoryPick } from "@prisma/client";

export default function PickForm({ seasonId, pick }: { seasonId: string; pick?: DraftHistoryPick }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addPick(formData);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          pick
            ? "rounded-md px-2 py-1 text-xs text-gridiron-600 hover:bg-gridiron-50 dark:text-gridiron-100 dark:hover:bg-ink-800"
            : "rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600"
        }
      >
        {pick ? "Edit" : "+ Add Pick"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-ink-900">
            <h2 className="mb-4 text-lg font-bold">{pick ? "Edit Pick" : "Add Pick"}</h2>
            <form action={handleSubmit} className="space-y-3">
              <input type="hidden" name="seasonId" value={seasonId} />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Round
                  <input
                    type="number"
                    name="round"
                    required
                    defaultValue={pick?.round}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                  />
                </label>
                <label className="text-sm font-medium">
                  Pick in Round
                  <input
                    type="number"
                    name="pickInRound"
                    required
                    defaultValue={pick?.pickInRound}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                  />
                </label>
                <label className="col-span-2 text-sm font-medium">
                  Manager
                  <input
                    name="manager"
                    required
                    defaultValue={pick?.manager}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                  />
                </label>
                <label className="col-span-2 text-sm font-medium">
                  Player Name
                  <input
                    name="playerName"
                    required
                    defaultValue={pick?.playerName}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                  />
                </label>
                <label className="text-sm font-medium">
                  Position
                  <select
                    name="position"
                    required
                    defaultValue={pick?.position ?? "QB"}
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
                  NFL Team
                  <input
                    name="nflTeam"
                    defaultValue={pick?.nflTeam ?? ""}
                    placeholder="e.g. KC"
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                  />
                </label>
              </div>
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
        </div>
      )}
    </>
  );
}
