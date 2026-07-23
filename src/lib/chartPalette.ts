// Validated categorical palette (8 slots), CVD-checked in both modes via
// scripts/validate_palette.js from the dataviz skill. Order is the
// CVD-safety mechanism — do not reorder without re-validating.
export const CHART_COLORS_LIGHT = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export const CHART_COLORS_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

// Ordinal (single-hue, light->dark) ramp for severity/aging buckets — validated
// with `node scripts/validate_palette.js "<hexes>" --ordinal --mode <mode>`.
// Index order is least-severe -> most-severe; on the dark surface the near-zero
// end recedes toward the dark background instead of white, so its step order
// is reversed relative to the light ramp even though the hex set overlaps.
export const AGING_COLORS_LIGHT = [
  "#86b6ef", // 1-7 days
  "#5598e7", // 8-14 days
  "#2a78d6", // 15-30 days
  "#1c5cab", // 31-60 days
  "#104281", // 61+ days
];

export const AGING_COLORS_DARK = [
  "#184f95", // 1-7 days
  "#256abf", // 8-14 days
  "#3987e5", // 15-30 days
  "#6da7ec", // 31-60 days
  "#9ec5f4", // 61+ days
];
