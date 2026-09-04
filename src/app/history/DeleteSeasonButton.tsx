"use client";

import { deleteSeason } from "./actions";

export default function DeleteSeasonButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteSeason}
      onSubmit={(e) => {
        if (!confirm(`Delete ${label} and all its picks?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-rose-500 hover:underline">
        Delete
      </button>
    </form>
  );
}
