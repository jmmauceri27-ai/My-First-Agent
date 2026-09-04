"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNote } from "../actions";
import { NOTE_KINDS } from "@/lib/constants";

export default function NoteForm({ playerId }: { playerId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addNote(formData);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mb-6 space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-ink-800">
      <input type="hidden" name="playerId" value={playerId} />
      <div className="flex items-center gap-2">
        <select
          name="kind"
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-ink-800"
        >
          {NOTE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500">Add a dated note, trend, or news blurb</span>
      </div>
      <textarea
        name="body"
        required
        rows={2}
        placeholder="e.g. 'Trending up after WR1 target share jumped to 28% over last 3 weeks'"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-ink-800"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gridiron-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gridiron-600 disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add Note"}
      </button>
    </form>
  );
}
