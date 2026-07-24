import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-blue-400/25 bg-[#16223f] shadow-xl shadow-black/50 ${className}`}
      {...props}
    />
  );
}
