"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveLeagueSettings } from "./actions";
import type { LeagueSettings } from "@prisma/client";

const NUMBER_FIELDS: { name: keyof LeagueSettings; label: string }[] = [
  { name: "numTeams", label: "# of Teams" },
  { name: "myDraftSlot", label: "Your Draft Slot" },
  { name: "qbSlots", label: "QB Starters" },
  { name: "rbSlots", label: "RB Starters" },
  { name: "wrSlots", label: "WR Starters" },
  { name: "teSlots", label: "TE Starters" },
  { name: "flexSlots", label: "FLEX (RB/WR/TE)" },
  { name: "kSlots", label: "K Starters" },
  { name: "dstSlots", label: "D/ST Starters" },
  { name: "benchSlots", label: "Bench Spots" },
];

export default function LeagueSettingsForm({ settings }: { settings: LeagueSettings }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveLeagueSettings(formData);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gridiron-500 px-3 py-2 text-sm font-medium text-gridiron-600 hover:bg-gridiron-50 dark:text-gridiron-100 dark:hover:bg-ink-800"
      >
        League Settings
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-ink-900">
              <h2 className="mb-1 text-lg font-bold">League Settings</h2>
              <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                Used for every new mock draft — team count, your draft slot, and starting roster
                construction (FLEX is RB/WR/TE eligible).
              </p>
              <form action={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {NUMBER_FIELDS.map((f) => (
                    <label key={f.name} className="text-sm font-medium">
                      {f.label}
                      <input
                        type="number"
                        name={f.name}
                        min={f.name === "myDraftSlot" || f.name === "numTeams" ? 1 : 0}
                        required
                        defaultValue={settings[f.name] as number}
                        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                      />
                    </label>
                  ))}
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
          </div>,
          document.body
        )}
    </>
  );
}
