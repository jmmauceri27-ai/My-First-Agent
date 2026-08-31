"use client";

import { useRouter } from "next/navigation";

export default function BackLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-3 inline-block text-sm text-zinc-500 hover:underline"
    >
      ← Back
    </button>
  );
}
