"use client";

import { useState, useTransition } from "react";
import { createSeason } from "./actions";

export default function SeasonForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createSeason(formData);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-gridiron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gridiron-600"
      >
        + Add Season
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-ink-900">
            <h2 className="mb-4 text-lg font-bold">Add Draft Season</h2>
            <form action={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium">
                Year
                <input
                  type="number"
                  name="year"
                  required
                  placeholder="2025"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                />
              </label>
              <label className="block text-sm font-medium">
                Label (optional)
                <input
                  name="name"
                  placeholder="e.g. Redraft, Keeper League"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                />
              </label>
              <label className="block text-sm font-medium">
                Number of teams (optional)
                <input
                  type="number"
                  name="numTeams"
                  placeholder="12"
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
                  {pending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
