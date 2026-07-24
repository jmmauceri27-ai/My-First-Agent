import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-purple-400/40 bg-[#3c2b6b] shadow-xl shadow-black/50 ${className}`}
      {...props}
    />
  );
}
