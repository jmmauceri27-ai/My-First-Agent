"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import type { ClientRateOverride, Company, RateRule } from "@/lib/crmTypes";
import RateRuleModal from "./RateRuleModal";
import ClientRateOverrideModal from "./ClientRateOverrideModal";

export default function RateRulesClient({
  rateRules,
  overrides,
  companies,
}: {
  rateRules: RateRule[];
  overrides: ClientRateOverride[];
  companies: Company[];
}) {
  const [editingRule, setEditingRule] = useState<RateRule | null>(null);
  const [creatingRule, setCreatingRule] = useState(false);
  const [editingOverride, setEditingOverride] = useState<ClientRateOverride | null>(null);
  const [creatingOverride, setCreatingOverride] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-50">Base Rates by Trade</h2>
            <p className="text-xs text-slate-400">
              Each trade&rsquo;s default pricing formula -- what a proposal quotes unless a client below has an
              override for that trade.
            </p>
          </div>
          <Button onClick={() => setCreatingRule(true)}>+ New rate rule</Button>
        </div>

        {rateRules.length === 0 ? (
          <p className="text-sm text-slate-400">No rate rules yet.</p>
        ) : (
          <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
            {rateRules.map((r) => (
              <button
                key={r.id}
                onClick={() => setEditingRule(r)}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-purple-500/5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-50">{r.trade}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {r.pricingBasis}
                    {r.unitLabel ? ` -- ${r.unitLabel}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-50">{formatCurrency(r.baseRate)}</p>
              </button>
            ))}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-50">Client Overrides</h2>
            <p className="text-xs text-slate-400">
              A specific client&rsquo;s negotiated rate for one trade -- takes precedence over that trade&rsquo;s base
              rate above.
            </p>
          </div>
          <Button onClick={() => setCreatingOverride(true)} disabled={companies.length === 0}>
            + New override
          </Button>
        </div>

        {overrides.length === 0 ? (
          <p className="text-sm text-slate-400">No client overrides yet.</p>
        ) : (
          <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
            {overrides.map((o) => (
              <button
                key={o.id}
                onClick={() => setEditingOverride(o)}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-purple-500/5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-50">
                    {o.companyName ?? "Unknown client"} <span className="font-normal text-slate-500">&middot;</span>{" "}
                    {o.trade}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{o.overrideType}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-50">
                  {o.overrideType === "Fixed Rate" ? formatCurrency(o.overrideValue) : `${o.overrideValue}%`}
                </p>
              </button>
            ))}
          </Card>
        )}
      </div>

      {(editingRule || creatingRule) && (
        <RateRuleModal
          rule={editingRule}
          onClose={() => {
            setEditingRule(null);
            setCreatingRule(false);
          }}
        />
      )}

      {(editingOverride || creatingOverride) && (
        <ClientRateOverrideModal
          override={editingOverride}
          companies={companies}
          onClose={() => {
            setEditingOverride(null);
            setCreatingOverride(false);
          }}
        />
      )}
    </div>
  );
}
