import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-surface-border bg-surface shadow-lg shadow-black/5 dark:shadow-xl dark:shadow-black/50 ${className}`}
      {...props}
    />
  );
}
