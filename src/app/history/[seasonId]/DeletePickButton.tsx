"use client";

import { deletePick } from "../actions";

export default function DeletePickButton({ id, seasonId, label }: { id: string; seasonId: string; label: string }) {
  return (
    <form
      action={deletePick}
      onSubmit={(e) => {
        if (!confirm(`Delete pick: ${label}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <button type="submit" className="text-xs text-rose-500 hover:underline">
        Delete
      </button>
    </form>
  );
}
