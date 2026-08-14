"use client";

import { inputClass } from "@/components/ui/formClasses";
import { TRADE_OPTIONS } from "@/lib/trades";

/** Multi-select dropdown of the fixed Trade list (Ctrl/Cmd-click, or tap, to select more than one). */
export default function TradeSelect({
  value,
  onChange,
  className = "",
  size = 6,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  size?: number;
}) {
  return (
    <select
      multiple
      size={size}
      value={value}
      onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
      className={`${inputClass} ${className}`}
    >
      {TRADE_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
