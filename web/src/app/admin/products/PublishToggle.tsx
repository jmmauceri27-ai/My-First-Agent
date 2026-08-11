"use client";

import { useTransition } from "react";
import { setPublished } from "./actions";

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setPublished(id, !published))}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        published
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
      } ${isPending ? "opacity-50" : ""}`}
    >
      {published ? "Published" : "Unpublished"}
    </button>
  );
}
