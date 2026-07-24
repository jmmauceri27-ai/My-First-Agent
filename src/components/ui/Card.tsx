import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-blue-400/40 bg-[#263a66] shadow-xl shadow-black/50 ${className}`}
      {...props}
    />
  );
}
