"use client";

import { deleteMockDraft } from "./actions";

export default function DeleteMockDraftButton({ id }: { id: string }) {
  return (
    <form
      action={deleteMockDraft}
      onSubmit={(e) => {
        if (!confirm("Delete this mock draft?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-rose-500 hover:underline">
        Delete
      </button>
    </form>
  );
}
