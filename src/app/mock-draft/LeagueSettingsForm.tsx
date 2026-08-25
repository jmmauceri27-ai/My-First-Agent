"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveLeagueSettings } from "./actions";
import type { LeagueSettings } from "@prisma/client";

const NUMBER_FIELDS: { name: keyof LeagueSettings; label: string }[] = [
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
  const [numTeams, setNumTeams] = useState(settings.numTeams);
  const [myDraftSlot, setMyDraftSlot] = useState(settings.myDraftSlot);

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
                Used for every new mock draft — and, once you set a draft order below, to show who's on
                the clock on the live Draft Day Tracker too.
              </p>
              <form action={handleSubmit} className="space-y-4">
                <label className="block text-sm font-medium">
                  # of Teams
                  <input
                    type="number"
                    name="numTeams"
                    min={2}
                    max={20}
                    required
                    value={numTeams}
                    onChange={(e) => {
                      // Don't clamp mid-typing (e.g. typing "15" would get
                      // stuck at "2" after the first keystroke) — the name
                      // rows below just clamp their own count defensively,
                      // and this clamps for real (numTeams and, if it no
                      // longer fits, myDraftSlot too) once typing is done.
                      const n = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                      setNumTeams(Number.isNaN(n) ? 0 : n);
                    }}
                    onBlur={() => {
                      const clamped = Math.max(2, Math.min(20, numTeams || 2));
                      setNumTeams(clamped);
                      if (myDraftSlot > clamped) setMyDraftSlot(clamped);
                    }}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-ink-800"
                  />
                </label>

                <div>
                  <p className="text-sm font-medium">Draft Order</p>
                  <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Manager names in pick order, and which slot is you. Names are optional — leave blank
                    and mock drafts will just show "Team 3", etc.
                  </p>
                  <div className="space-y-1.5">
                    {Array.from({ length: Math.max(0, Math.min(20, numTeams)) }, (_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 shrink-0 text-right text-xs text-zinc-400">{i + 1}.</span>
                        <input
                          type="radio"
                          name="myDraftSlot"
                          value={i + 1}
                          checked={myDraftSlot === i + 1}
                          onChange={() => setMyDraftSlot(i + 1)}
                          title="This is me"
                        />
                        <input
                          type="text"
                          name="managerNames"
                          placeholder={`Pick ${i + 1}`}
                          defaultValue={settings.managerNames[i] ?? ""}
                          className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-ink-800"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {NUMBER_FIELDS.map((f) => (
                    <label key={f.name} className="text-sm font-medium">
                      {f.label}
                      <input
                        type="number"
                        name={f.name}
                        min={0}
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
