import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-purple-200 bg-white shadow-lg shadow-purple-900/5 dark:border-purple-400/40 dark:bg-[#3c2b6b] dark:shadow-xl dark:shadow-black/50 ${className}`}
      {...props}
    />
  );
}
