"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient, PROPOSAL_CHAT_MODEL } from "@/lib/anthropicClient";
import { listClientRateOverrides, listRateItems } from "@/lib/crmDal";
import { PROPOSAL_CHAT_TOOLS, runProposalChatTool } from "@/lib/proposalChatTools";

const MAX_TOOL_ROUNDS = 8;

export interface ProposalChatContext {
  companyId?: string;
  companyName?: string;
}

const SYSTEM_PROMPT_INTRO = `You are the Proposal Assistant, an internal tool that helps this facility maintenance company's account managers build a client proposal by talking through the scope of work, then pricing it against the company's real rate card.

Ground rules:
- NEVER invent a price, rate, or line item. Every number in your answer must come from a tool result.
- Call list_rate_items before pricing a trade -- use the exact rateItemId, name, and rate it returns. Don't guess item names or ids, and don't reuse an id from a different trade.
- Call compute_trade_price to price a trade's selected line items (rateItemId + quantity pairs). It applies the client's override automatically when you pass companyId.
- If a proposal spans more than one trade, price each trade separately with compute_trade_price, then combine the trade totals with sum_totals -- never add the numbers yourself.
- Ask clarifying questions when the scope is ambiguous (which trade, what quantities, which client) instead of guessing.
- Once you have enough to price something, do it -- don't make the user ask twice.
- Present a finished proposal clearly: per trade, each line item (name, quantity, rate, extended price), the trade subtotal, any override adjustment, and the trade total, then the grand total across trades.
- This is an in-app preview only -- nothing here is saved or sent to a client. Say so if asked.`;

function buildSystemPrompt(tradesAvailable: string[], context: ProposalChatContext): string {
  const tradesLine = `\n\nTrades with rate items on file: ${tradesAvailable.length > 0 ? tradesAvailable.join(", ") : "none yet -- tell the user to populate the rate card first."}`;
  const clientLine = context.companyId
    ? `\n\nClient context: the user is building this proposal for "${context.companyName ?? "this client"}" (companyId: ${context.companyId}). Pass this companyId to compute_trade_price so any client-specific override is applied automatically.`
    : `\n\nNo client is selected right now. If pricing should reflect a client override, ask the user to pick one from the Client dropdown above the chat; otherwise proceed without a companyId.`;
  return SYSTEM_PROMPT_INTRO + tradesLine + clientLine;
}

export async function sendProposalChatMessageAction(
  history: Anthropic.MessageParam[],
  context: ProposalChatContext,
): Promise<{ appended: Anthropic.MessageParam[] } | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error: "ANTHROPIC_API_KEY is not configured for this environment -- add it to enable the Proposal Assistant.",
    };
  }

  const [rateItems, overrides] = await Promise.all([listRateItems(), listClientRateOverrides()]);
  const tradesAvailable = Array.from(new Set(rateItems.map((r) => r.trade))).sort((a, b) => a.localeCompare(b));
  const system = buildSystemPrompt(tradesAvailable, context);

  const client = createAnthropicClient();
  const messages: Anthropic.MessageParam[] = [...history];
  const appended: Anthropic.MessageParam[] = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: PROPOSAL_CHAT_MODEL,
        max_tokens: 2048,
        system,
        tools: PROPOSAL_CHAT_TOOLS,
        messages,
      });

      const assistantMessage: Anthropic.MessageParam = {
        role: "assistant",
        content: response.content as unknown as Anthropic.ContentBlockParam[],
      };
      messages.push(assistantMessage);
      appended.push(assistantMessage);

      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );
      if (toolUses.length === 0) {
        return { appended };
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = toolUses.map((toolUse) => {
        try {
          const result = runProposalChatTool(toolUse.name, toolUse.input, { rateItems, overrides });
          return { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) };
        } catch (e) {
          return {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: e instanceof Error ? e.message : "Tool failed." }),
            is_error: true,
          };
        }
      });

      const toolResultMessage: Anthropic.MessageParam = { role: "user", content: toolResults };
      messages.push(toolResultMessage);
      appended.push(toolResultMessage);
    }

    appended.push({
      role: "assistant",
      content: [
        { type: "text", text: "I'm having trouble wrapping this up -- could you narrow down what you need priced?" },
      ],
    });
    return { appended };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reach the Proposal Assistant." };
  }
}
