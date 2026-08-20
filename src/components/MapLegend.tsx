import { STATUS_COLORS } from "@/lib/chartPalette";

export type MapLegendProps =
  | { mode: "gradient"; min: number; max: number; format: "currency" | "percent" | "number" }
  | { mode: "categorical"; entries: { label: string; color: string }[] };

function formatValue(value: number, format: "currency" | "percent" | "number"): string {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (format === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toLocaleString();
}

export default function MapLegend(props: MapLegendProps) {
  if (props.mode === "gradient") {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{formatValue(props.min, props.format)}</span>
        <div
          className="h-2 w-32 rounded-full"
          style={{
            background: `linear-gradient(to right, ${STATUS_COLORS.critical}, ${STATUS_COLORS.warning}, ${STATUS_COLORS.good})`,
          }}
        />
        <span>{formatValue(props.max, props.format)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
      {props.entries.map((entry) => (
        <span key={entry.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.label}
        </span>
      ))}
    </div>
  );
}
