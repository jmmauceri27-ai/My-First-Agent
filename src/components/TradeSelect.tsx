"use client";

import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import { TRADE_OPTIONS } from "@/lib/trades";

const TRADE_MULTI_SELECT_OPTIONS = TRADE_OPTIONS.map((t) => ({ value: t, label: t }));

/** A closed-by-default dropdown (styled like a normal select) that opens a checkbox list so more than one Trade can be picked. */
export default function TradeSelect({
  value,
  onChange,
  className = "",
  placeholder = "Select trade(s)",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <MultiSelectDropdown
      options={TRADE_MULTI_SELECT_OPTIONS}
      values={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      noun="trades selected"
    />
  );
}
