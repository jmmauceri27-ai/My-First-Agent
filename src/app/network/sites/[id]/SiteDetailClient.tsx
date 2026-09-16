"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import TradeSelect from "@/components/TradeSelect";
import SiteTradeAssignmentsEditor, {
  assignmentsToDrafts,
  draftsToAssignmentInputs,
  emptyDraft,
  type AssignmentDraft,
} from "@/components/SiteTradeAssignmentsEditor";
import SiteMeasurementsEditor from "@/components/SiteMeasurementsEditor";
import { formatCurrency, formatSquareFeet, parseCurrencyInput } from "@/lib/siteMapColor";
import { MONTHS } from "@/lib/rateSchedule";
import { MEASUREMENT_FIELDS, MEASUREMENT_GROUPS } from "@/lib/measurementGroups";
import { TRADE_COLORS, VENDOR_ASSIGNMENT_TRADES, type Trade } from "@/lib/trades";
import type { Company, Contract, FieldClass, Opportunity } from "@/lib/crmTypes";
import type { Site, SiteInput, SiteMeasurements, Vendor } from "@/lib/networkTypes";
import {
  assignFieldToRecordAction,
  getFieldValuesForRecordAction,
  listAssignedFieldIdsAction,
  saveFieldValuesForRecordAction,
  unassignFieldFromRecordAction,
} from "@/app/crm/fields/actions";
import DynamicFieldsSection from "@/app/crm/fields/DynamicFieldsSection";
import { deleteSiteAction, saveSiteAction, saveSiteTradeAssignmentsAction } from "../../actions";

/** A colored, iconed card used to visually separate each section of the Site page -- a left color stripe
 * plus a tinted icon badge, so "Location" reads differently at a glance from "Rate Schedule" etc. */
function SectionCard({
  icon,
  title,
  color,
  className = "",
  children,
}: {
  icon: string;
  title: string;
  color: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`p-5 ${className}`} style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
          style={{ backgroundColor: `${color}22` }}
        >
          {icon}
        </span>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function TradeChip({ trade }: { trade: string }) {
  const color = TRADE_COLORS[trade as Trade] ?? "#78716c";
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {trade}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm text-slate-900 dark:text-slate-50">{value || <span className="text-slate-500 dark:text-slate-500">—</span>}</p>
    </div>
  );
}

function monthsSummary(schedule: Partial<Record<(typeof MONTHS)[number], number>>): string {
  const parts = MONTHS.filter((m) => schedule[m] != null).map((m) => `${m} ${formatCurrency(schedule[m] as number)}`);
  return parts.join(" · ");
}

export default function SiteDetailClient({
  site,
  companies,
  vendors,
  opportunities,
  contracts,
  fieldClasses,
}: {
  site: Site;
  companies: Company[];
  vendors: Vendor[];
  opportunities: Opportunity[];
  contracts: Contract[];
  fieldClasses: FieldClass[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");

  const [siteCode, setSiteCode] = useState(site.siteCode ?? "");
  const [name, setName] = useState(site.name);
  const [companyId, setCompanyId] = useState(site.companyId ?? "");
  const [opportunityId, setOpportunityId] = useState(site.opportunityId ?? "");
  const [address, setAddress] = useState(site.address ?? "");
  const [city, setCity] = useState(site.city ?? "");
  const [state, setState] = useState(site.state ?? "");
  const [zip, setZip] = useState(site.zip ?? "");
  const [lat, setLat] = useState(site.lat != null ? String(site.lat) : "");
  const [lng, setLng] = useState(site.lng != null ? String(site.lng) : "");
  const [trades, setTrades] = useState<string[]>(site.trades ?? []);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>(
    assignmentsToDrafts(site.tradeAssignments),
  );
  const [notes, setNotes] = useState(site.notes ?? "");
  const [measurements, setMeasurements] = useState<SiteMeasurements>(site.measurements);
  const [counts, setCounts] = useState<SiteMeasurements>(site.counts);
  const [lastSeasonSnowfall, setLastSeasonSnowfall] = useState(
    site.lastSeasonSnowfall != null ? String(site.lastSeasonSnowfall) : "",
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [assignedFieldIds, setAssignedFieldIds] = useState<string[]>([]);

  useEffect(() => {
    getFieldValuesForRecordAction(site.id).then((values) => {
      const asStrings: Record<string, string> = {};
      for (const [fieldId, value] of Object.entries(values)) {
        if (value != null) asStrings[fieldId] = value;
      }
      setFieldValues(asStrings);
    });
    listAssignedFieldIdsAction(site.id).then(setAssignedFieldIds);
  }, [site.id]);

  async function handleAssignField(fieldId: string) {
    setAssignedFieldIds((prev) => [...prev, fieldId]);
    await assignFieldToRecordAction(site.id, fieldId);
  }

  async function handleUnassignField(fieldId: string) {
    setAssignedFieldIds((prev) => prev.filter((id) => id !== fieldId));
    setFieldValues((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    await unassignFieldFromRecordAction(site.id, fieldId);
  }

  const opportunitiesForCompany = useMemo(
    () => (companyId ? opportunities.filter((o) => o.companyId === companyId) : opportunities),
    [opportunities, companyId],
  );

  const contractsForCompany = useMemo(
    () => (companyId ? contracts.filter((c) => c.companyId === companyId) : contracts),
    [contracts, companyId],
  );

  const assignmentTrades = useMemo(
    () => trades.filter((t) => VENDOR_ASSIGNMENT_TRADES.includes(t as (typeof VENDOR_ASSIGNMENT_TRADES)[number])),
    [trades],
  );

  const groupedMeasurements = useMemo(() => {
    const knownLabels = new Set(MEASUREMENT_FIELDS);
    const groups = MEASUREMENT_GROUPS.map((g) => ({
      label: g.label,
      entries: g.fields.filter((f) => f in measurements).map((f): [string, number] => [f, measurements[f]]),
    }));
    const other = Object.entries(measurements).filter(([label]) => !knownLabels.has(label));
    if (other.length > 0) groups.push({ label: "Other", entries: other });
    return groups.filter((g) => g.entries.length > 0);
  }, [measurements]);

  const countEntries = useMemo(() => Object.entries(counts), [counts]);

  const selectedCompany = useMemo(() => companies.find((c) => c.id === companyId) ?? null, [companies, companyId]);
  const selectedOpportunity = useMemo(
    () => opportunities.find((o) => o.id === opportunityId) ?? null,
    [opportunities, opportunityId],
  );

  const assignedFieldEntries = useMemo(() => {
    const allFields = fieldClasses.flatMap((c) => c.fields);
    return assignedFieldIds
      .map((id) => allFields.find((f) => f.id === id))
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({ label: f.label, value: fieldValues[f.id] ?? "" }));
  }, [fieldClasses, assignedFieldIds, fieldValues]);

  function updateAssignmentDraft(trade: string, patch: Partial<AssignmentDraft>) {
    setAssignmentDrafts((prev) => ({ ...prev, [trade]: { ...(prev[trade] ?? emptyDraft()), ...patch } }));
  }

  function updateMonthSchedule(
    trade: string,
    field: "rateSchedule" | "vendorExpenseSchedule" | "subVendorExpenseSchedule",
    month: (typeof MONTHS)[number],
    value: string,
  ) {
    const current = assignmentDrafts[trade] ?? emptyDraft();
    updateAssignmentDraft(trade, { [field]: { ...current[field], [month]: value } });
  }

  function scheduleTotal(schedule: Partial<Record<(typeof MONTHS)[number], string>>): number {
    return MONTHS.reduce((sum, m) => {
      const raw = schedule[m];
      const num = raw ? Number(parseCurrencyInput(raw)) : 0;
      return sum + (Number.isFinite(num) ? num : 0);
    }, 0);
  }

  function scheduleToNumbers(schedule: Partial<Record<(typeof MONTHS)[number], string>>): Partial<Record<(typeof MONTHS)[number], number>> {
    const out: Partial<Record<(typeof MONTHS)[number], number>> = {};
    for (const m of MONTHS) {
      const raw = schedule[m];
      if (!raw) continue;
      const num = Number(parseCurrencyInput(raw));
      if (Number.isFinite(num)) out[m] = num;
    }
    return out;
  }

  function resetFromSite() {
    setSiteCode(site.siteCode ?? "");
    setName(site.name);
    setCompanyId(site.companyId ?? "");
    setOpportunityId(site.opportunityId ?? "");
    setAddress(site.address ?? "");
    setCity(site.city ?? "");
    setState(site.state ?? "");
    setZip(site.zip ?? "");
    setLat(site.lat != null ? String(site.lat) : "");
    setLng(site.lng != null ? String(site.lng) : "");
    setTrades(site.trades ?? []);
    setAssignmentDrafts(assignmentsToDrafts(site.tradeAssignments));
    setNotes(site.notes ?? "");
    setMeasurements(site.measurements);
    setCounts(site.counts);
    setLastSeasonSnowfall(site.lastSeasonSnowfall != null ? String(site.lastSeasonSnowfall) : "");
    setError(null);
  }

  function handleCancel() {
    resetFromSite();
    setMode("view");
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a site name.");
      return;
    }
    setSaving(true);
    try {
      const input: SiteInput = {
        companyId: companyId || null,
        opportunityId: opportunityId || null,
        // Not editable from this form -- managed from the Agreement's own Sites section instead, so
        // preserve whatever this site already had rather than accidentally clearing it on every save.
        contractId: site.contractId,
        siteCode: siteCode.trim() || null,
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip.trim() || null,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        trades,
        measurements,
        counts,
        lastSeasonSnowfall:
          trades.includes("Snow Removal") && lastSeasonSnowfall.trim() ? Number(lastSeasonSnowfall) : null,
        notes: notes.trim() || null,
      };
      const result = await saveSiteAction(site.id, input);
      if (result.error) {
        setError(result.error);
        return;
      }
      const assignmentsResult = await saveSiteTradeAssignmentsAction(
        site.id,
        draftsToAssignmentInputs(assignmentTrades, assignmentDrafts),
      );
      if (assignmentsResult.error) {
        setError(assignmentsResult.error);
        return;
      }
      await saveFieldValuesForRecordAction(
        site.id,
        Object.entries(fieldValues).map(([fieldId, value]) => ({ fieldId, value: value || null })),
      );
      router.refresh();
      setMode("view");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteSiteAction(site.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/network/sites");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/network/sites" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            ← Back to Sites
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{name}</h1>
          {siteCode && <p className="text-sm text-slate-500 dark:text-slate-400">Site ID: {siteCode}</p>}
        </div>
        {mode === "view" ? (
          <Button onClick={() => setMode("edit")}>✏️ Edit</Button>
        ) : (
          <Button variant="ghost" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-critical">{error}</p>}

      {mode === "view" ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <SectionCard icon="🏢" title="Client & Opportunity" color="#7c3ce3">
            <div className="flex flex-col gap-3">
              <Field
                label="Client"
                value={
                  selectedCompany && (
                    <Link href={`/network/clients/${selectedCompany.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                      {selectedCompany.name}
                    </Link>
                  )
                }
              />
              <Field
                label="Opportunity"
                value={
                  selectedOpportunity && (
                    <Link href={`/crm/opportunities/${selectedOpportunity.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                      {selectedOpportunity.name}
                    </Link>
                  )
                }
              />
              <Field
                label="Agreement"
                value={
                  site.contractId && (
                    <Link href={`/crm/contracts?open=${site.contractId}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                      {site.contractName}
                    </Link>
                  )
                }
              />
            </div>
          </SectionCard>

          <SectionCard icon="📍" title="Location" color="#3b82f6">
            <div className="flex flex-col gap-3">
              <Field label="Address" value={address} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City" value={city} />
                <Field label="State" value={state} />
                <Field label="Zip" value={zip} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude" value={lat} />
                <Field label="Longitude" value={lng} />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon="🛠️" title="Trades" color="#475569">
            {trades.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No trades assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trades.map((t) => (
                  <TradeChip key={t} trade={t} />
                ))}
              </div>
            )}
          </SectionCard>

          {assignmentTrades.length > 0 && (
            <SectionCard icon="🤝" title="Vendor & Agreement" color="#14b8a6" className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {assignmentTrades.map((trade) => {
                  const draft = assignmentDrafts[trade] ?? emptyDraft();
                  const vendor = vendors.find((v) => v.id === draft.vendorId) ?? null;
                  const subVendor = vendors.find((v) => v.id === draft.subVendorId) ?? null;
                  const contract = contractsForCompany.find((c) => c.id === draft.contractId) ?? null;
                  return (
                    <div key={trade} className="rounded-lg border border-purple-400/20 p-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{trade}</p>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <Field
                          label="Vendor"
                          value={
                            vendor && (
                              <Link href={`/network/vendors/${vendor.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                                {vendor.name}
                              </Link>
                            )
                          }
                        />
                        <Field
                          label="Sub-Vendor"
                          value={
                            subVendor && (
                              <Link href={`/network/vendors/${subVendor.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                                {subVendor.name}
                              </Link>
                            )
                          }
                        />
                        <Field
                          label="Agreement"
                          value={
                            contract && (
                              <Link href={`/crm/contracts?open=${contract.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                                {contract.name}
                              </Link>
                            )
                          }
                        />
                        <Field label="Billing type" value={contract?.billingType ?? null} />
                        <Field label="Agreement value" value={draft.contractValue.trim() ? formatCurrency(Number(parseCurrencyInput(draft.contractValue))) : null} />
                        <Field label="Sub price (to Vendor)" value={draft.subPrice.trim() ? formatCurrency(Number(parseCurrencyInput(draft.subPrice))) : null} />
                        <Field label="Sub-Vendor price" value={draft.subVendorPrice.trim() ? formatCurrency(Number(parseCurrencyInput(draft.subVendorPrice))) : null} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard icon="📐" title="Measurements & Counts" color="#f97316">
            {groupedMeasurements.length === 0 && countEntries.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No measurements or counts yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-3">
                  {groupedMeasurements.map((group) => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{group.label}</p>
                      {group.entries.map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-slate-700 dark:text-slate-300">{label}</span>
                          <span className="tabular-nums text-slate-900 dark:text-slate-50">{formatSquareFeet(value)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  {countEntries.length > 0 && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Counts</p>
                  )}
                  {countEntries.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{label}</span>
                      <span className="tabular-nums text-slate-900 dark:text-slate-50">{value.toLocaleString("en-US")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {trades.includes("Snow Removal") && (
            <SectionCard icon="❄️" title="Last Season Snowfall" color="#06b6d4">
              <Field label="Total snowfall" value={lastSeasonSnowfall ? `${lastSeasonSnowfall} in.` : null} />
            </SectionCard>
          )}

          {assignmentTrades.length > 0 && (
            <SectionCard icon="💵" title="Rate Schedule" color="#0ca30c" className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {assignmentTrades.map((trade) => {
                  const draft = assignmentDrafts[trade] ?? emptyDraft();
                  const monthly = scheduleToNumbers(draft.rateSchedule);
                  const monthlyTotal = scheduleTotal(draft.rateSchedule);
                  return (
                    <div key={trade}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{trade}</p>
                        <Field label="Annual Rate Total" value={draft.annualRateTotal.trim() ? formatCurrency(Number(parseCurrencyInput(draft.annualRateTotal))) : null} />
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                        {monthsSummary(monthly) || "No monthly breakdown set."}
                      </p>
                      {monthlyTotal > 0 && (
                        <p className="text-xs text-slate-600 dark:text-slate-500">Sum of months: {formatCurrency(monthlyTotal)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {assignmentTrades.length > 0 && (
            <SectionCard icon="🧾" title="Expense Schedule" color="#ec4899" className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {assignmentTrades.map((trade) => {
                  const draft = assignmentDrafts[trade] ?? emptyDraft();
                  const vendorName = vendors.find((v) => v.id === draft.vendorId)?.name ?? null;
                  const subVendorName = vendors.find((v) => v.id === draft.subVendorId)?.name ?? null;
                  const vendorMonthly = scheduleToNumbers(draft.vendorExpenseSchedule);
                  const subVendorMonthly = scheduleToNumbers(draft.subVendorExpenseSchedule);
                  return (
                    <div key={trade}>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{trade}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                        Vendor{vendorName ? `: ${vendorName}` : " (not assigned)"} — {monthsSummary(vendorMonthly) || "no schedule set"}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-500">
                        Sub-Vendor{subVendorName ? `: ${subVendorName}` : " (not assigned)"} — {monthsSummary(subVendorMonthly) || "no schedule set"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard icon="📝" title="Notes" color="#78716c">
            <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-50">
              {notes || <span className="text-slate-500 dark:text-slate-500">No notes yet.</span>}
            </p>
          </SectionCard>

          {assignedFieldEntries.length > 0 && (
            <SectionCard icon="🏷️" title="Custom Fields" color="#6366f1">
              <div className="grid grid-cols-2 gap-3">
                {assignedFieldEntries.map((f) => (
                  <Field key={f.label} label={f.label} value={f.value} />
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Card className="p-5 xl:col-span-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Details</h2>

            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Site name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Site ID</span>
                  <input
                    value={siteCode}
                    onChange={(e) => setSiteCode(e.target.value)}
                    placeholder="Your own code, e.g. TDC0234"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Client</span>
                  <select
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      setOpportunityId("");
                    }}
                    className={inputClass}
                  >
                    <option value="">(none)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Opportunity</span>
                  <select
                    value={opportunityId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setOpportunityId(nextId);
                      const opportunity = opportunities.find((o) => o.id === nextId);
                      if (trades.length === 0 && opportunity && opportunity.trades.length > 0) {
                        setTrades(opportunity.trades);
                      }
                    }}
                    className={inputClass}
                  >
                    <option value="">(none)</option>
                    {opportunitiesForCompany.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Trade</span>
                  <TradeSelect value={trades} onChange={setTrades} />
                </label>
              </div>

              {assignmentTrades.length > 0 && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Vendor & Agreement assignments</span>
                  <p className="-mt-0.5 text-xs text-slate-600 dark:text-slate-500">
                    A site often uses a different vendor -- and can be covered under a different signed agreement --
                    per trade, e.g. one for Land, another for Snow Removal.
                  </p>
                  <SiteTradeAssignmentsEditor
                    trades={assignmentTrades}
                    vendors={vendors}
                    contracts={contractsForCompany}
                    value={assignmentDrafts}
                    onChange={setAssignmentDrafts}
                  />
                </div>
              )}

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Address</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
              </label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">State</span>
                  <input value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Zip</span>
                  <input value={zip} onChange={(e) => setZip(e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Latitude</span>
                  <input type="number" value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Longitude</span>
                  <input type="number" value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Notes</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
              </label>
            </div>

            <div className="mt-4">
              <DynamicFieldsSection
                classes={fieldClasses}
                values={fieldValues}
                assignedFieldIds={assignedFieldIds}
                onChange={(fieldId, value) => setFieldValues((prev) => ({ ...prev, [fieldId]: value }))}
                onAssign={handleAssignField}
                onUnassign={handleUnassignField}
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete site"}
              </Button>
            </div>
          </Card>

          <div className="flex flex-col gap-6 xl:col-span-2">
            <Card className="p-5">
              <SiteMeasurementsEditor
                measurements={measurements}
                onChangeMeasurements={setMeasurements}
                counts={counts}
                onChangeCounts={setCounts}
              />
            </Card>

            {trades.includes("Snow Removal") && (
              <Card className="p-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Last Season Snowfall</h2>
                <label className="mt-3 flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Total snowfall (in.)</span>
                  <input
                    type="number"
                    value={lastSeasonSnowfall}
                    onChange={(e) => setLastSeasonSnowfall(e.target.value)}
                    className={`${inputClass} max-w-[10rem]`}
                  />
                </label>
              </Card>
            )}

            {assignmentTrades.length > 0 && (
              <Card className="p-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Rate Schedule</h2>
                <p className="-mt-0.5 text-xs text-slate-600 dark:text-slate-500">
                  Annual Rate Total is a flat yearly figure you set directly. The monthly breakdown below (which
                  months this trade gets paid, and how much) is tracked separately and isn&rsquo;t derived from it --
                  the two aren&rsquo;t kept in sync.
                </p>
                <div className="mt-3 flex flex-col gap-4">
                  {assignmentTrades.map((trade) => {
                    const draft = assignmentDrafts[trade] ?? emptyDraft();
                    const billingType = contractsForCompany.find((c) => c.id === draft.contractId)?.billingType ?? null;
                    const monthlyTotal = scheduleTotal(draft.rateSchedule);
                    return (
                      <div key={trade} className="rounded-lg border border-purple-400/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{trade}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-500">
                              {billingType ?? "No billing type (set on the Agreement)"}
                            </p>
                          </div>
                          <label className="flex flex-col gap-1 text-xs">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Annual Rate Total</span>
                            <input
                              value={draft.annualRateTotal}
                              onChange={(e) => updateAssignmentDraft(trade, { annualRateTotal: e.target.value })}
                              onBlur={() => {
                                const num = Number(parseCurrencyInput(draft.annualRateTotal));
                                if (draft.annualRateTotal.trim() && Number.isFinite(num)) {
                                  updateAssignmentDraft(trade, { annualRateTotal: formatCurrency(num) });
                                }
                              }}
                              placeholder="—"
                              className={`${inputClass} w-32 px-2 py-1 text-xs`}
                            />
                          </label>
                        </div>
                        <p className="mt-3 text-xs text-slate-600 dark:text-slate-500">Monthly breakdown (optional)</p>
                        <div className="mt-1 grid grid-cols-4 gap-2">
                          {MONTHS.map((month) => (
                            <label key={month} className="flex flex-col gap-1 text-xs">
                              <span className="font-medium text-slate-500 dark:text-slate-400">{month}</span>
                              <input
                                value={draft.rateSchedule[month] ?? ""}
                                onChange={(e) => updateMonthSchedule(trade, "rateSchedule", month, e.target.value)}
                                onBlur={() => {
                                  const raw = draft.rateSchedule[month] ?? "";
                                  const num = Number(parseCurrencyInput(raw));
                                  if (raw.trim() && Number.isFinite(num)) {
                                    updateMonthSchedule(trade, "rateSchedule", month, formatCurrency(num));
                                  }
                                }}
                                placeholder="—"
                                className={`${inputClass} px-2 py-1 text-xs`}
                              />
                            </label>
                          ))}
                        </div>
                        {monthlyTotal > 0 && (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Sum of months: {formatCurrency(monthlyTotal)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {assignmentTrades.length > 0 && (
              <Card className="p-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Expense Schedule</h2>
                <p className="-mt-0.5 text-xs text-slate-600 dark:text-slate-500">
                  Which months the Vendor and Sub-Vendor are paid for this trade, and how much. Repeats every year
                  until changed; tracked separately from Sub Price/Sub-Vendor Price above.
                </p>
                <div className="mt-3 flex flex-col gap-4">
                  {assignmentTrades.map((trade) => {
                    const draft = assignmentDrafts[trade] ?? emptyDraft();
                    const vendorName = vendors.find((v) => v.id === draft.vendorId)?.name ?? null;
                    const subVendorName = vendors.find((v) => v.id === draft.subVendorId)?.name ?? null;
                    const vendorTotal = scheduleTotal(draft.vendorExpenseSchedule);
                    const subVendorTotal = scheduleTotal(draft.subVendorExpenseSchedule);
                    return (
                      <div key={trade} className="rounded-lg border border-purple-400/20 p-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{trade}</p>

                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-slate-600 dark:text-slate-500">Vendor{vendorName ? `: ${vendorName}` : " (not assigned)"}</p>
                          {vendorTotal > 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Annual total:{" "}
                              <span className="font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(vendorTotal)}</span>
                            </p>
                          )}
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-2">
                          {MONTHS.map((month) => (
                            <label key={month} className="flex flex-col gap-1 text-xs">
                              <span className="font-medium text-slate-500 dark:text-slate-400">{month}</span>
                              <input
                                value={draft.vendorExpenseSchedule[month] ?? ""}
                                onChange={(e) => updateMonthSchedule(trade, "vendorExpenseSchedule", month, e.target.value)}
                                onBlur={() => {
                                  const raw = draft.vendorExpenseSchedule[month] ?? "";
                                  const num = Number(parseCurrencyInput(raw));
                                  if (raw.trim() && Number.isFinite(num)) {
                                    updateMonthSchedule(trade, "vendorExpenseSchedule", month, formatCurrency(num));
                                  }
                                }}
                                placeholder="—"
                                className={`${inputClass} px-2 py-1 text-xs`}
                              />
                            </label>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-slate-600 dark:text-slate-500">
                            Sub-Vendor{subVendorName ? `: ${subVendorName}` : " (not assigned)"}
                          </p>
                          {subVendorTotal > 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Annual total:{" "}
                              <span className="font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(subVendorTotal)}</span>
                            </p>
                          )}
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-2">
                          {MONTHS.map((month) => (
                            <label key={month} className="flex flex-col gap-1 text-xs">
                              <span className="font-medium text-slate-500 dark:text-slate-400">{month}</span>
                              <input
                                value={draft.subVendorExpenseSchedule[month] ?? ""}
                                onChange={(e) =>
                                  updateMonthSchedule(trade, "subVendorExpenseSchedule", month, e.target.value)
                                }
                                onBlur={() => {
                                  const raw = draft.subVendorExpenseSchedule[month] ?? "";
                                  const num = Number(parseCurrencyInput(raw));
                                  if (raw.trim() && Number.isFinite(num)) {
                                    updateMonthSchedule(trade, "subVendorExpenseSchedule", month, formatCurrency(num));
                                  }
                                }}
                                placeholder="—"
                                className={`${inputClass} px-2 py-1 text-xs`}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
