import { CHART_COLORS_LIGHT, STATUS_COLORS } from "./chartPalette";

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

export const MARGIN_METRIC_LABEL = "Margin ($)";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Computes Contract Value - Sub Price for a site, or null if either value is missing/non-numeric. */
export function computeSiteMargin(contractValue: number | null, subPrice: number | null): number | null {
  if (contractValue === null || subPrice === null) return null;
  if (!Number.isFinite(contractValue) || !Number.isFinite(subPrice)) return null;
  return contractValue - subPrice;
}

/**
 * Computes margin as a fraction of Contract Value -- (Contract Value - Sub Price) / Contract Value -- or null
 * if either value is missing/non-numeric or Contract Value is zero (percentage would be undefined). Used to
 * rank/color sites by profitability rate rather than raw dollar margin, so a small contract with a thin
 * dollar spread doesn't get lumped in with a large contract that has the same dollar spread but a far
 * healthier margin.
 */
export function computeSiteMarginPercent(contractValue: number | null, subPrice: number | null): number | null {
  if (contractValue === null || subPrice === null) return null;
  if (!Number.isFinite(contractValue) || !Number.isFinite(subPrice)) return null;
  if (contractValue === 0) return null;
  return (contractValue - subPrice) / contractValue;
}

export function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

/** Formats a 0..1 fraction (from computeSiteMarginPercent) as e.g. "23.4%". */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSquareFeet(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} sq. ft`;
}

/** Strips currency formatting ($, commas) back to a plain numeric string. */
export function parseCurrencyInput(value: string): string {
  return value.replace(/[^0-9.-]/g, "");
}

/** Strips the "sq. ft" suffix and commas back to a plain numeric string. */
export function parseMeasurementInput(value: string): string {
  return value.replace(/sq\.?\s*ft\.?/i, "").replace(/[^0-9.-]/g, "");
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
