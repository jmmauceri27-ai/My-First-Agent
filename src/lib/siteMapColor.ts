import { CHART_COLORS_LIGHT, STATUS_COLORS } from "./chartPalette";
import { MARGIN_METRIC_KEY, type DatasetRecord, type SiteMapBinding } from "./types";

/** Fallback pin color for rows with no color-by value under the active view. */
export const NEUTRAL_PIN_COLOR = "#898781";

/** Default pin color when no view is active ("All"). */
export const DEFAULT_PIN_COLOR = "#a78bfa";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}

/** Maps a 0..1 ratio to the app's status ramp: critical -> warning -> good. */
export function gradientColorForRatio(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  if (t < 0.5) return lerpColor(STATUS_COLORS.critical, STATUS_COLORS.warning, t / 0.5);
  return lerpColor(STATUS_COLORS.warning, STATUS_COLORS.good, (t - 0.5) / 0.5);
}

/** Resolves the raw value a color-by view should read for a row: either a real column, or the computed margin. */
export function resolveColorMetric(
  row: DatasetRecord,
  colorColumn: string,
  binding: SiteMapBinding,
): number | string | boolean | null {
  if (colorColumn === MARGIN_METRIC_KEY) {
    if (!binding.contractValueColumn || !binding.subPriceColumn) return null;
    const contractValue = Number(row[binding.contractValueColumn]);
    const subPrice = Number(row[binding.subPriceColumn]);
    if (!Number.isFinite(contractValue) || !Number.isFinite(subPrice)) return null;
    return contractValue - subPrice;
  }
  const raw = row[colorColumn];
  if (raw === null || raw === undefined || raw === "") return null;
  return raw;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Computes Contract Value - Sub Price for a row, or null if either column isn't mapped or isn't numeric. */
export function computeMargin(row: DatasetRecord, binding: SiteMapBinding): number | null {
  const raw = resolveColorMetric(row, MARGIN_METRIC_KEY, binding);
  const num = raw === null ? NaN : Number(raw);
  return Number.isFinite(num) ? num : null;
}

export function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

/** Assigns each distinct value a fixed categorical color, in first-seen order; overflow past 8 folds into "Other". */
export function buildCategoricalPalette(values: string[]): Map<string, string> {
  const distinct: string[] = [];
  for (const v of values) {
    if (!distinct.includes(v)) distinct.push(v);
  }
  const colorByValue = new Map<string, string>();
  distinct.forEach((v, i) => {
    colorByValue.set(v, i < CHART_COLORS_LIGHT.length ? CHART_COLORS_LIGHT[i] : NEUTRAL_PIN_COLOR);
  });
  return colorByValue;
}
