"use client";

import { useMemo, useRef, useState } from "react";
import type Anthropic from "@anthropic-ai/sdk";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { Company, Contract } from "@/lib/crmTypes";
import { sendProposalChatMessageAction } from "./chatActions";

interface ChatBubble {
  role: "user" | "assistant";
  text: string;
}

/** Flattens a turn's messages down to just the text worth showing a person -- tool_use/tool_result blocks (the
 * rate-card lookups and price calculations happening behind the scenes) stay out of the transcript. */
function toBubbles(messages: Anthropic.MessageParam[]): ChatBubble[] {
  const bubbles: ChatBubble[] = [];
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    if (typeof message.content === "string") {
      bubbles.push({ role: message.role, text: message.content });
      continue;
    }
    const text = message.content
      .filter((block): block is Anthropic.TextBlockParam => block.type === "text")
      .map((block) => block.text)
      .join("\n\n")
      .trim();
    if (text) bubbles.push({ role: message.role, text });
  }
  return bubbles;
}

export default function ChatAssistant({
  companies,
  contracts,
  hasRateItems,
}: {
  companies: Company[];
  contracts: Contract[];
  hasRateItems: boolean;
}) {
  const [companyId, setCompanyId] = useState("");
  const [contractId, setContractId] = useState("");
  const [messages, setMessages] = useState<Anthropic.MessageParam[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const bubbles = toBubbles(messages);
  const contractsForClient = useMemo(
    () => (companyId ? contracts.filter((c) => c.companyId === companyId) : contracts),
    [contracts, companyId],
  );

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: Anthropic.MessageParam = { role: "user", content: [{ type: "text", text }] };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setSending(true);
    setError(null);
    scrollToBottom();

    const company = companies.find((c) => c.id === companyId);
    const contract = contracts.find((c) => c.id === contractId);
    const result = await sendProposalChatMessageAction(nextHistory, {
      companyId: companyId || undefined,
      companyName: company?.name,
      contractId: contractId || undefined,
      contractName: contract?.name,
    });

    if ("error" in result) {
      setError(result.error);
    } else {
      setMessages([...nextHistory, ...result.appended]);
    }
    setSending(false);
    scrollToBottom();
  }

  function newConversation() {
    setMessages([]);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-end justify-between gap-4 p-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Client (optional, for override pricing)</span>
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setContractId("");
              }}
              className={`${inputClass} min-w-56`}
            >
              <option value="">No client selected</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Contract (optional, for its own rate card)</span>
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className={`${inputClass} min-w-56`}
            >
              <option value="">No contract selected</option>
              {contractsForClient.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!companyId && c.companyName ? ` · ${c.companyName}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button variant="secondary" onClick={newConversation} disabled={messages.length === 0}>
          New conversation
        </Button>
      </Card>

      {!hasRateItems ? (
        <p className="text-sm text-slate-400">
          There aren&rsquo;t any rate items yet -- add some on the Rate Card tab before using the assistant.
        </p>
      ) : (
        <>
          <Card className="flex h-[28rem] flex-col overflow-hidden p-0">
            <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {bubbles.length === 0 && (
                <p className="text-sm text-slate-400">
                  Describe the proposal you want to build -- the trade, the scope, and the client -- and I&rsquo;ll
                  price it against the real rate card. Nothing here is saved yet; this is a preview.
                </p>
              )}
              {bubbles.map((bubble, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    bubble.role === "user"
                      ? "self-end bg-brand-600 text-white"
                      : "self-start bg-purple-500/10 text-slate-100"
                  }`}
                >
                  {bubble.text}
                </div>
              ))}
              {sending && <p className="self-start text-xs text-slate-500">Thinking…</p>}
            </div>

            <div className="flex items-center gap-2 border-t border-purple-400/10 p-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="e.g. I need a landscaping proposal for 40 hrs/month of mowing plus a monthly irrigation check"
                className={`${inputClass} flex-1`}
                disabled={sending}
              />
              <Button onClick={send} disabled={sending || !input.trim()}>
                Send
              </Button>
            </div>
          </Card>

          {error && <p className="text-sm text-critical">{error}</p>}
        </>
      )}
    </div>
  );
}
