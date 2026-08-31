"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/siteMapColor";
import { MONTHS } from "@/lib/rateSchedule";
import {
  applyMergeSelections,
  buildMergePlan,
  conflictFieldKeys,
  type FieldResolution,
  type MergeSelections,
} from "@/lib/mergeSites";
import type { Site, SiteInput } from "@/lib/networkTypes";
import { mergeSitesAction } from "../../actions";

function siteById(group: Site[], id: string): Site | undefined {
  return group.find((s) => s.id === id);
}

function groupKey(group: Site[]): string {
  return group[0]?.siteCode ?? group[0]?.id ?? "";
}

function FieldRow<T>({
  label,
  fieldKey,
  resolution,
  selected,
  onSelect,
  format,
}: {
  label: string;
  fieldKey: string;
  resolution: FieldResolution<T>;
  selected: string | undefined;
  onSelect: (fieldKey: string, siteId: string) => void;
  format: (value: T, siteId: string) => ReactNode;
}) {
  if (resolution.choices.length === 0) return null;

  if (!resolution.conflict) {
    const only = resolution.choices[0];
    return (
      <div className="flex items-center justify-between gap-3 py-1 text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-100">{format(only.value, only.siteId)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-1.5 text-sm">
      <span className="font-medium text-critical">{label} — pick one</span>
      <div className="flex flex-wrap gap-2">
        {resolution.choices.map((c) => (
          <label
            key={c.siteId}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
              selected === c.siteId ? "border-brand-500 bg-brand-500/10" : "border-purple-400/20"
            }`}
          >
            <input
              type="radio"
              name={fieldKey}
              checked={selected === c.siteId}
              onChange={() => onSelect(fieldKey, c.siteId)}
            />
            {format(c.value, c.siteId)}
          </label>
        ))}
      </div>
    </div>
  );
}

function formatMeasurements(v: Record<string, number>): string {
  const entries = Object.entries(v);
  return entries.length ? entries.map(([k, val]) => `${k}: ${val}`).join(", ") : "(empty)";
}

function GroupCard({ group, onMerged }: { group: Site[]; onMerged: () => void }) {
  const router = useRouter();
  const plan = useMemo(() => buildMergePlan(group), [group]);
  const conflicts = useMemo(() => conflictFieldKeys(plan), [plan]);
  const [selections, setSelections] = useState<MergeSelections>({});
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function select(fieldKey: string, siteId: string) {
    setSelections((prev) => ({ ...prev, [fieldKey]: siteId }));
  }

  const ready = conflicts.every((k) => Boolean(selections[k]));

  async function handleMerge() {
    if (!ready) return;
    setError(null);
    setMerging(true);
    try {
      const { input, trades, assignments } = applyMergeSelections(plan, selections);
      const fullInput: SiteInput = { ...input, trades };
      const keepId = plan.siteIds[0];
      const deleteIds = plan.siteIds.slice(1);
      const result = await mergeSitesAction(keepId, deleteIds, fullInput, assignments);
      if (result.error) {
        setError(result.error);
        return;
      }
      onMerged();
      router.refresh();
    } finally {
      setMerging(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-50">{plan.siteCode || "(no Site ID)"}</h3>
          <p className="text-xs text-slate-400">
            {plan.siteIds.length} records — {Array.from(new Set(group.map((s) => s.name))).join(" / ")}
          </p>
        </div>
        <Button type="button" onClick={handleMerge} disabled={!ready || merging}>
          {merging ? "Merging…" : "Merge into one site"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}

      <div className="mt-3 divide-y divide-purple-400/10">
        <FieldRow label="Name" fieldKey="name" resolution={plan.fields.name} selected={selections.name} onSelect={select} format={(v) => v} />
        <FieldRow
          label="Client"
          fieldKey="companyId"
          resolution={plan.fields.companyId}
          selected={selections.companyId}
          onSelect={select}
          format={(v, siteId) => siteById(group, siteId)?.companyName ?? v}
        />
        <FieldRow
          label="Opportunity"
          fieldKey="opportunityId"
          resolution={plan.fields.opportunityId}
          selected={selections.opportunityId}
          onSelect={select}
          format={(v, siteId) => siteById(group, siteId)?.opportunityName ?? v}
        />
        <FieldRow label="Address" fieldKey="address" resolution={plan.fields.address} selected={selections.address} onSelect={select} format={(v) => v} />
        <FieldRow label="City" fieldKey="city" resolution={plan.fields.city} selected={selections.city} onSelect={select} format={(v) => v} />
        <FieldRow label="State" fieldKey="state" resolution={plan.fields.state} selected={selections.state} onSelect={select} format={(v) => v} />
        <FieldRow label="Zip" fieldKey="zip" resolution={plan.fields.zip} selected={selections.zip} onSelect={select} format={(v) => v} />
        <FieldRow label="Latitude" fieldKey="lat" resolution={plan.fields.lat} selected={selections.lat} onSelect={select} format={(v) => v.toFixed(6)} />
        <FieldRow label="Longitude" fieldKey="lng" resolution={plan.fields.lng} selected={selections.lng} onSelect={select} format={(v) => v.toFixed(6)} />
        <FieldRow
          label="Measurements"
          fieldKey="measurements"
          resolution={plan.fields.measurements}
          selected={selections.measurements}
          onSelect={select}
          format={(v) => formatMeasurements(v)}
        />
        <FieldRow
          label="Counts"
          fieldKey="counts"
          resolution={plan.fields.counts}
          selected={selections.counts}
          onSelect={select}
          format={(v) => formatMeasurements(v)}
        />
        <FieldRow
          label="Last Season Snowfall"
          fieldKey="lastSeasonSnowfall"
          resolution={plan.fields.lastSeasonSnowfall}
          selected={selections.lastSeasonSnowfall}
          onSelect={select}
          format={(v) => `${v} in.`}
        />
        <FieldRow label="Notes" fieldKey="notes" resolution={plan.fields.notes} selected={selections.notes} onSelect={select} format={(v) => v} />
      </div>

      {plan.trades.map((t) => (
        <div key={t.trade} className="mt-3 border-t border-purple-400/10 pt-3">
          <p className="text-sm font-semibold text-slate-200">{t.trade}</p>
          <div className="divide-y divide-purple-400/10">
            <FieldRow
              label="Vendor"
              fieldKey={`trade:${t.trade}:vendorId`}
              resolution={t.vendorId}
              selected={selections[`trade:${t.trade}:vendorId`]}
              onSelect={select}
              format={(v, siteId) => siteById(group, siteId)?.tradeAssignments.find((a) => a.trade === t.trade)?.vendorName ?? v}
            />
            <FieldRow
              label="Sub-Vendor"
              fieldKey={`trade:${t.trade}:subVendorId`}
              resolution={t.subVendorId}
              selected={selections[`trade:${t.trade}:subVendorId`]}
              onSelect={select}
              format={(v, siteId) => siteById(group, siteId)?.tradeAssignments.find((a) => a.trade === t.trade)?.subVendorName ?? v}
            />
            <FieldRow
              label="Contract"
              fieldKey={`trade:${t.trade}:contractId`}
              resolution={t.contractId}
              selected={selections[`trade:${t.trade}:contractId`]}
              onSelect={select}
              format={(v, siteId) => siteById(group, siteId)?.tradeAssignments.find((a) => a.trade === t.trade)?.contractName ?? v}
            />
            <FieldRow
              label="Contract Value"
              fieldKey={`trade:${t.trade}:contractValue`}
              resolution={t.contractValue}
              selected={selections[`trade:${t.trade}:contractValue`]}
              onSelect={select}
              format={(v) => formatCurrency(v)}
            />
            <FieldRow
              label="Rate Schedule"
              fieldKey={`trade:${t.trade}:rateSchedule`}
              resolution={t.rateSchedule}
              selected={selections[`trade:${t.trade}:rateSchedule`]}
              onSelect={select}
              format={(v) =>
                MONTHS.filter((m) => v[m] != null)
                  .map((m) => `${m}: ${formatCurrency(v[m] as number)}`)
                  .join(", ") || "—"
              }
            />
            <FieldRow
              label="Sub Price"
              fieldKey={`trade:${t.trade}:subPrice`}
              resolution={t.subPrice}
              selected={selections[`trade:${t.trade}:subPrice`]}
              onSelect={select}
              format={(v) => formatCurrency(v)}
            />
            <FieldRow
              label="Sub-Vendor Price"
              fieldKey={`trade:${t.trade}:subVendorPrice`}
              resolution={t.subVendorPrice}
              selected={selections[`trade:${t.trade}:subVendorPrice`]}
              onSelect={select}
              format={(v) => formatCurrency(v)}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}

export default function DuplicateSitesClient({ groups }: { groups: Site[][] }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [bulkMerging, setBulkMerging] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const visibleGroups = useMemo(() => groups.filter((g) => !dismissed.has(groupKey(g))), [groups, dismissed]);

  const withPlans = useMemo(() => visibleGroups.map((group) => ({ group, plan: buildMergePlan(group) })), [visibleGroups]);
  const cleanGroups = withPlans.filter(({ plan }) => conflictFieldKeys(plan).length === 0);
  const conflictGroups = withPlans.filter(({ plan }) => conflictFieldKeys(plan).length > 0);

  function dismiss(group: Site[]) {
    setDismissed((prev) => new Set(prev).add(groupKey(group)));
  }

  async function handleBulkMerge() {
    if (cleanGroups.length === 0) return;
    setBulkError(null);
    setBulkMerging(true);
    try {
      const batchSize = 10;
      for (let i = 0; i < cleanGroups.length; i += batchSize) {
        const batch = cleanGroups.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(({ plan }) => {
            const { input, trades, assignments } = applyMergeSelections(plan, {});
            const fullInput: SiteInput = { ...input, trades };
            const keepId = plan.siteIds[0];
            const deleteIds = plan.siteIds.slice(1);
            return mergeSitesAction(keepId, deleteIds, fullInput, assignments);
          }),
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) {
          setBulkError(failed.error);
          return;
        }
        batch.forEach(({ group }) => dismiss(group));
      }
    } finally {
      setBulkMerging(false);
      router.refresh();
    }
  }

  if (groups.length === 0) {
    return <p className="text-sm text-slate-400">No duplicate Site IDs found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {cleanGroups.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-100">
              {cleanGroups.length} group{cleanGroups.length === 1 ? "" : "s"} have no conflicts
            </p>
            <p className="text-xs text-slate-400">
              Every field cleanly fills in from whichever record has it -- safe to merge automatically.
            </p>
          </div>
          <Button type="button" onClick={handleBulkMerge} disabled={bulkMerging}>
            {bulkMerging ? "Merging…" : `Merge all ${cleanGroups.length} automatically`}
          </Button>
        </Card>
      )}
      {bulkError && <p className="text-xs text-critical">{bulkError}</p>}

      {conflictGroups.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-slate-100">
            {conflictGroups.length} group{conflictGroups.length === 1 ? "" : "s"} need your input
          </p>
          {conflictGroups.map(({ group }) => (
            <GroupCard key={groupKey(group)} group={group} onMerged={() => dismiss(group)} />
          ))}
        </div>
      )}

      {cleanGroups.length === 0 && conflictGroups.length === 0 && (
        <p className="text-sm text-slate-400">All duplicate groups have been merged.</p>
      )}
    </div>
  );
}
