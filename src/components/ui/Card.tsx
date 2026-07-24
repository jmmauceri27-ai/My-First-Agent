import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-blue-500/15 bg-[#0d1526]/90 shadow-lg shadow-black/40 backdrop-blur-sm ${className}`}
      {...props}
    />
  );
}
