import type Anthropic from "@anthropic-ai/sdk";
import { findOverrideForTrade, priceTradeSelections, resolveTradeRateItems } from "./pricingEngine";
import type { ClientRateOverride, RateItem } from "./crmTypes";

export interface ProposalToolContext {
  rateItems: RateItem[];
  overrides: ClientRateOverride[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The only way the proposal chat can touch pricing data -- it never sees rate items or overrides directly, and
 * never does the math itself. Every number in a proposal has to come back through one of these tools, so the
 * model can only select real items and quantities; compute_trade_price and sum_totals do all the arithmetic.
 */
export const PROPOSAL_CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_trades",
    description:
      'Lists every trade that has rate items on file, e.g. "Landscaping", "Snow Removal". Call this first if you don\'t already know which trades are available.',
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_rate_items",
    description:
      "Lists the real, priced line items for one trade -- labor, equipment, materials, and flat-rate service tasks -- each with its exact rateItemId, category, pricing basis, rate tier, and rate. Always call this before pricing a trade so you use real item ids and rates, never invented ones. Pass companyId when a client is selected: if that client has their own negotiated rate items for the trade (e.g. from an MSA rate card), you'll get exactly those instead of the generic catalog -- a client's rate card fully replaces the generic one for that trade, so use the same companyId here and in compute_trade_price for consistent results.",
    input_schema: {
      type: "object",
      properties: {
        trade: { type: "string", description: "Exact trade name, from list_trades." },
        companyId: {
          type: "string",
          description: "The selected client's companyId, if any -- see description above.",
        },
      },
      required: ["trade"],
    },
  },
  {
    name: "compute_trade_price",
    description:
      "Prices one trade's selected line items (rateItemId + quantity pairs) using the real rate card, and applies the client's override automatically when companyId is given. Pass the same companyId you used in list_rate_items so the ids you picked resolve correctly. Returns each line's extended price, the subtotal, the override adjustment, and the trade total. This is the ONLY way to get a trade's price -- never calculate it yourself.",
    input_schema: {
      type: "object",
      properties: {
        trade: { type: "string" },
        companyId: {
          type: "string",
          description: "The selected client's companyId, if any, so a matching override is applied.",
        },
        lineItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rateItemId: { type: "string", description: "A real id from list_rate_items -- never invent one." },
              quantity: { type: "number" },
            },
            required: ["rateItemId", "quantity"],
          },
        },
      },
      required: ["trade", "lineItems"],
    },
  },
  {
    name: "sum_totals",
    description:
      "Adds a list of trade totals together to get the proposal's grand total. Use this instead of adding numbers yourself whenever a proposal spans more than one trade.",
    input_schema: {
      type: "object",
      properties: { amounts: { type: "array", items: { type: "number" } } },
      required: ["amounts"],
    },
  },
];

export function runProposalChatTool(name: string, input: unknown, ctx: ProposalToolContext): unknown {
  switch (name) {
    case "list_trades": {
      return { trades: Array.from(new Set(ctx.rateItems.map((r) => r.trade))).sort((a, b) => a.localeCompare(b)) };
    }

    case "list_rate_items": {
      const { trade, companyId } = (input ?? {}) as { trade?: string; companyId?: string };
      if (!trade) throw new Error("trade is required.");
      const resolved = resolveTradeRateItems(ctx.rateItems, trade, companyId ?? null);
      const usingClientRateCard = resolved.length > 0 && resolved[0].companyId != null;
      const items = resolved.map((r) => ({
        rateItemId: r.id,
        category: r.category,
        itemName: r.itemName,
        pricingBasis: r.pricingBasis,
        rateTier: r.rateTier,
        rate: r.rate,
        unitLabel: r.unitLabel,
        notes: r.notes,
      }));
      return { trade, usingClientRateCard, items };
    }

    case "compute_trade_price": {
      const { trade, companyId, lineItems } = (input ?? {}) as {
        trade?: string;
        companyId?: string;
        lineItems?: { rateItemId: string; quantity: number }[];
      };
      if (!trade) throw new Error("trade is required.");
      if (!lineItems || lineItems.length === 0) throw new Error("lineItems is required and must not be empty.");

      const override = companyId ? findOverrideForTrade(ctx.overrides, companyId, trade) : null;
      const result = priceTradeSelections(trade, ctx.rateItems, lineItems, override);
      if (result.lines.length === 0) {
        throw new Error(
          "None of the given rateItemIds matched real items for this trade -- call list_rate_items again and use the exact ids returned.",
        );
      }

      return {
        trade: result.trade,
        lines: result.lines.map((l) => ({
          itemName: l.rateItem.itemName,
          pricingBasis: l.rateItem.pricingBasis,
          rate: l.rateItem.rate,
          quantity: l.quantity,
          extendedPrice: round2(l.extendedPrice),
        })),
        subtotal: round2(result.subtotal),
        override: result.override
          ? { type: result.override.overrideType, value: result.override.overrideValue }
          : null,
        overrideAdjustment: round2(result.overrideAdjustment),
        total: round2(result.total),
      };
    }

    case "sum_totals": {
      const { amounts } = (input ?? {}) as { amounts?: number[] };
      if (!amounts || amounts.length === 0) throw new Error("amounts is required and must not be empty.");
      return { total: round2(amounts.reduce((sum, a) => sum + a, 0)) };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
