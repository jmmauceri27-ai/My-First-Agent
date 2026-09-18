import { ALL_TRADES } from "./crmTypes";
import type { ClientRateOverride, RateItem } from "./crmTypes";

/** One rate item chosen for a trade's quote, with how many of it (hours, each, ft, visits...). */
export interface LineItemSelection {
  rateItemId: string;
  quantity: number;
}

/** A selection resolved against its RateItem, with the extended price (rate x quantity) computed. */
export interface PricedLine {
  rateItem: RateItem;
  quantity: number;
  extendedPrice: number;
}

export interface TradePricingResult {
  trade: string;
  lines: PricedLine[];
  /** Sum of every line's extended price, before any client override. */
  subtotal: number;
  override: ClientRateOverride | null;
  /** Negative for a discount, positive for a markup; 0 when there's no override. */
  overrideAdjustment: number;
  /** subtotal + overrideAdjustment -- what this trade contributes to the proposal. */
  total: number;
}

/**
 * The rate items to price `trade` with, in priority order: (1) the selected contract's own rate card, if it
 * has one (e.g. a negotiated MSA rate sheet); (2) failing that, the selected client's own on-demand rates for
 * the trade, if any (work done for them outside any signed agreement); (3) failing that, the fully generic,
 * company-wide catalog for the trade. Each level fully replaces the one below it for a trade when present --
 * they're never merged line by line, since a real rate sheet is a complete, self-contained replacement, not a
 * partial patch.
 */
function resolveTradeRateItemsForTrade(
  rateItems: RateItem[],
  trade: string,
  contractId: string | null,
  companyId: string | null,
): RateItem[] {
  if (contractId) {
    const contractSpecific = rateItems.filter((r) => r.trade === trade && r.contractId === contractId);
    if (contractSpecific.length > 0) return contractSpecific;
  }
  if (companyId) {
    const companySpecific = rateItems.filter((r) => r.trade === trade && !r.contractId && r.companyId === companyId);
    if (companySpecific.length > 0) return companySpecific;
  }
  return rateItems.filter((r) => r.trade === trade && !r.contractId && !r.companyId);
}

/**
 * resolveTradeRateItemsForTrade for `trade`, plus (not instead of) whatever resolves for the ALL_TRADES
 * sentinel through the same contract/company/generic priority -- e.g. a trip charge scoped to ALL_TRADES shows
 * up as an extra option no matter which real trade is being priced.
 */
export function resolveTradeRateItems(
  rateItems: RateItem[],
  trade: string,
  contractId: string | null,
  companyId: string | null = null,
): RateItem[] {
  const specific = resolveTradeRateItemsForTrade(rateItems, trade, contractId, companyId);
  if (trade === ALL_TRADES) return specific;
  const universal = resolveTradeRateItemsForTrade(rateItems, ALL_TRADES, contractId, companyId);
  return [...specific, ...universal];
}

/** This client's override for `trade`, if any -- there's at most one per (client, trade), enforced by a unique constraint. */
export function findOverrideForTrade(
  overrides: ClientRateOverride[],
  companyId: string | null,
  trade: string,
): ClientRateOverride | null {
  if (!companyId) return null;
  return overrides.find((o) => o.companyId === companyId && o.trade === trade) ?? null;
}

/**
 * Composes a trade's price from a set of chosen rate items and quantities -- e.g. 3 hours of Landscape Laborer
 * + 1 Gold Mop #2 + a Dumping Charge -- then applies the client's override (if any) to the subtotal. A selected
 * item scoped to ALL_TRADES (e.g. a trip charge) is accepted alongside `trade`'s own items, matching what
 * resolveTradeRateItems already offered as choices. Pure and deterministic: the numbers always come from
 * `rateItems`/`override`, never invented, so this is safe to call from a chat-driven flow without the AI
 * touching the math itself.
 */
export function priceTradeSelections(
  trade: string,
  rateItems: RateItem[],
  selections: LineItemSelection[],
  override: ClientRateOverride | null,
): TradePricingResult {
  const byId = new Map(rateItems.map((r) => [r.id, r]));

  const lines: PricedLine[] = [];
  for (const selection of selections) {
    if (!(selection.quantity > 0)) continue;
    const rateItem = byId.get(selection.rateItemId);
    if (!rateItem || (rateItem.trade !== trade && rateItem.trade !== ALL_TRADES)) continue;
    lines.push({
      rateItem,
      quantity: selection.quantity,
      extendedPrice: rateItem.rate * selection.quantity,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.extendedPrice, 0);

  const applicableOverride = override && override.trade === trade ? override : null;
  let overrideAdjustment = 0;
  if (applicableOverride) {
    const magnitude = subtotal * (applicableOverride.overrideValue / 100);
    overrideAdjustment = applicableOverride.overrideType === "Discount %" ? -magnitude : magnitude;
  }

  return {
    trade,
    lines,
    subtotal,
    override: applicableOverride,
    overrideAdjustment,
    total: subtotal + overrideAdjustment,
  };
}

/** Grand total across every trade in a multi-trade proposal. */
export function sumTradeResults(results: TradePricingResult[]): number {
  return results.reduce((sum, r) => sum + r.total, 0);
}
