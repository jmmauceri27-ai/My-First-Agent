"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FilesCard from "@/components/FilesCard";
import SitesCard from "../SitesCard";
import { inputClass } from "@/components/ui/formClasses";
import TradeSelect from "@/components/TradeSelect";
import { RATE_FREQUENCIES } from "@/lib/crmTypes";
import { BILLING_TYPE_OPTIONS } from "@/lib/billingTypes";
import { TRADE_COLORS, type Trade } from "@/lib/trades";
import { contractStatus, formatContractDate } from "@/lib/contractStatus";
import { formatCurrency } from "@/lib/siteMapColor";
import type { Company, Contact, Contract, ContractFile, ContractInput, FieldClass, Opportunity } from "@/lib/crmTypes";
import type { Site } from "@/lib/networkTypes";
import {
  deleteContractAction,
  deleteContractFileAction,
  getContractFileDownloadUrlAction,
  listContractFilesAction,
  renameContractFileAction,
  saveContractAction,
  uploadContractFileAction,
} from "../../actions";
import { listSitesForContractAction } from "../../../network/actions";
import { getFieldValuesForRecordAction, saveFieldValuesForRecordAction } from "../../fields/actions";
import DynamicFieldsSection from "../../fields/DynamicFieldsSection";

/** A colored, iconed card used to visually separate each section of the Agreement page -- same pattern as
 * the Site and Contact detail pages. */
function SectionCard({
  icon,
  title,
  color,
  className = "",
  children,
}: {
  icon: React.ReactNode;
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
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${color}1f`, color }}>
      {trade}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm text-slate-900 dark:text-slate-50">
        {value || <span className="text-slate-500 dark:text-slate-500">—</span>}
      </p>
    </div>
  );
}

export default function ContractDetailClient({
  contract,
  companies,
  opportunities,
  contacts,
  fieldClasses,
}: {
  contract: Contract;
  companies: Company[];
  opportunities: Opportunity[];
  contacts: Contact[];
  fieldClasses: FieldClass[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");

  const [name, setName] = useState(contract.name);
  const [companyId, setCompanyId] = useState(contract.companyId ?? "");
  const [opportunityId, setOpportunityId] = useState(contract.opportunityId ?? "");
  const [trades, setTrades] = useState<string[]>(contract.trades);
  const [rateAmount, setRateAmount] = useState(contract.rateAmount != null ? String(contract.rateAmount) : "");
  const [rateFrequency, setRateFrequency] = useState(contract.rateFrequency ?? "");
  const [billingType, setBillingType] = useState(contract.billingType ?? "");
  const [startDate, setStartDate] = useState(contract.startDate ?? "");
  const [endDate, setEndDate] = useState(contract.endDate ?? "");
  const [contactIds, setContactIds] = useState<string[]>(contract.contactIds);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [files, setFiles] = useState<ContractFile[]>([]);
  useEffect(() => {
    listContractFilesAction(contract.id).then(setFiles);
  }, [contract.id]);
  function refreshFiles() {
    listContractFilesAction(contract.id).then(setFiles);
  }

  const [sites, setSites] = useState<Site[]>([]);
  useEffect(() => {
    listSitesForContractAction(contract.id).then(setSites);
  }, [contract.id]);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    getFieldValuesForRecordAction(contract.id).then((values) => {
      const asStrings: Record<string, string> = {};
      for (const [fieldId, value] of Object.entries(values)) {
        if (value != null) asStrings[fieldId] = value;
      }
      setFieldValues(asStrings);
    });
  }, [contract.id]);

  function toggleContact(id: string) {
    setContactIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  /** "notes" is a standard Agreement Field too, but it gets its own full-width, whitespace-preserved "Notes"
   * card below instead of sitting in the generic entries grid. */
  const agreementNotesFieldId = useMemo(
    () => fieldClasses.find((c) => c.recordType === "Agreement")?.fields.find((f) => f.name === "notes")?.id,
    [fieldClasses],
  );
  const notes = (agreementNotesFieldId && fieldValues[agreementNotesFieldId]) || "";

  const agreementFieldEntries = useMemo(() => {
    return fieldClasses
      .filter((c) => c.recordType === "Agreement")
      .flatMap((c) => c.fields)
      .filter((f) => f.name !== "notes")
      .map((f) => ({ label: f.label, value: fieldValues[f.id] ?? "" }));
  }, [fieldClasses, fieldValues]);

  function handleCancel() {
    setName(contract.name);
    setCompanyId(contract.companyId ?? "");
    setOpportunityId(contract.opportunityId ?? "");
    setTrades(contract.trades);
    setRateAmount(contract.rateAmount != null ? String(contract.rateAmount) : "");
    setRateFrequency(contract.rateFrequency ?? "");
    setBillingType(contract.billingType ?? "");
    setStartDate(contract.startDate ?? "");
    setEndDate(contract.endDate ?? "");
    setContactIds(contract.contactIds);
    setError(null);
    setMode("view");
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter an agreement name.");
      return;
    }
    setSaving(true);
    try {
      const input: ContractInput = {
        companyId: companyId || null,
        opportunityId: opportunityId || null,
        name: name.trim(),
        trades,
        rateAmount: rateAmount.trim() ? Number(rateAmount) : null,
        rateFrequency: rateFrequency || null,
        billingType: billingType || null,
        startDate: startDate || null,
        endDate: endDate || null,
        contactIds,
      };
      await saveContractAction(contract.id, input);
      await saveFieldValuesForRecordAction(
        contract.id,
        Object.entries(fieldValues).map(([fieldId, value]) => ({ fieldId, value: value || null })),
      );
      router.refresh();
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save agreement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteContractAction(contract.id);
      router.push("/crm/contracts");
    } finally {
      setDeleting(false);
    }
  }

  const status = contractStatus(endDate);
  const selectedCompany = useMemo(() => companies.find((c) => c.id === companyId) ?? null, [companies, companyId]);
  const selectedOpportunity = useMemo(
    () => opportunities.find((o) => o.id === opportunityId) ?? null,
    [opportunities, opportunityId],
  );
  const involvedContacts = useMemo(() => contacts.filter((c) => contactIds.includes(c.id)), [contacts, contactIds]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/crm/contracts" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            ← Back to Agreements
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {contract.trackingNumber && (
              <span className="rounded-full bg-slate-900/5 dark:bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                {contract.trackingNumber}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.badgeClassName}`}>{status.label}</span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{name}</h1>
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
          <SectionCard icon="🏢" title="Client & Source" color="#b45309">
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
                label="Source opportunity"
                value={
                  selectedOpportunity && (
                    <Link href={`/crm/opportunities/${selectedOpportunity.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                      {selectedOpportunity.name}
                    </Link>
                  )
                }
              />
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

          <SectionCard icon="💵" title="Rate & Billing" color="#0ca30c">
            <div className="flex flex-col gap-3">
              <Field
                label="Rate"
                value={
                  rateAmount.trim()
                    ? `${formatCurrency(Number(rateAmount))}${rateFrequency ? ` / ${rateFrequency}` : ""}`
                    : null
                }
              />
              <Field label="Billing type" value={billingType || null} />
              <Field label="# of sites" value={`${contract.siteCount ?? 0} (from linked sites)`} />
            </div>
          </SectionCard>

          <SectionCard icon="📅" title="Dates" color="#3b82f6">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" value={formatContractDate(startDate)} />
              <Field label="End date" value={formatContractDate(endDate)} />
            </div>
          </SectionCard>

          <SectionCard
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="9" cy="8" r="3"></circle>
                <circle cx="16" cy="10" r="2.5"></circle>
              </svg>
            }
            title="Contacts involved"
            color="#14b8a6"
          >
            {involvedContacts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No contacts linked.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {involvedContacts.map((c) => (
                  <p key={c.id} className="text-sm text-slate-900 dark:text-slate-50">
                    {c.name}
                    {c.companyName && <span className="text-xs text-slate-500 dark:text-slate-400"> ({c.companyName})</span>}
                  </p>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon="📝" title="Notes" color="#78716c">
            <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-50">
              {notes || <span className="text-slate-500 dark:text-slate-500">No notes yet.</span>}
            </p>
          </SectionCard>

          {agreementFieldEntries.length > 0 && (
            <SectionCard icon="🏷️" title="Fields" color="#6366f1">
              <div className="grid grid-cols-2 gap-3">
                {agreementFieldEntries.map((f) => (
                  <Field key={f.label} label={f.label} value={f.value} />
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      ) : (
        <Card className="p-5">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Agreement name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ABC Corp — Snow Removal 2026"
                className={inputClass}
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Client</span>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
                <option value="">(none)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Source opportunity (optional)</span>
              <select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className={inputClass}>
                <option value="">(none)</option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.trackingNumber} — {o.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-600 dark:text-slate-500">
                {contract.trackingNumber
                  ? "This agreement already carries a permanent tracking number and won't change even if you edit this."
                  : "Picking one links this agreement to that opportunity's tracking number, permanently."}
              </span>
            </label>

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Trades</span>
              <TradeSelect value={trades} onChange={setTrades} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300"># of sites</span>
                <span className="rounded-md border border-transparent px-3 py-2 text-slate-600 dark:text-slate-400">
                  {contract.siteCount ?? 0} (from linked sites)
                </span>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Rate ($)</span>
                <input
                  type="number"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Rate frequency</span>
              <select value={rateFrequency} onChange={(e) => setRateFrequency(e.target.value)} className={inputClass}>
                <option value="">(none)</option>
                {RATE_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Billing type</span>
              <select value={billingType} onChange={(e) => setBillingType(e.target.value)} className={inputClass}>
                <option value="">(none)</option>
                {BILLING_TYPE_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-600 dark:text-slate-500">Applies to every site/trade linked to this agreement.</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Start date</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">End date</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
              </label>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Contacts involved</span>
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-300 p-2 dark:border-slate-700">
                {contacts.length === 0 ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">No contacts yet — add some on the Contacts page.</span>
                ) : (
                  contacts.map((c) => (
                    <label key={c.id} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={contactIds.includes(c.id)}
                        onChange={() => toggleContact(c.id)}
                        className="accent-brand-600"
                      />
                      {c.name}
                      {c.companyName && <span className="text-xs text-slate-500 dark:text-slate-400">({c.companyName})</span>}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <DynamicFieldsSection
              classes={fieldClasses}
              recordType="Agreement"
              values={fieldValues}
              onChange={(fieldId, value) => setFieldValues((prev) => ({ ...prev, [fieldId]: value }))}
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            </div>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Card>
      )}

      <SitesCard contractId={contract.id} companyId={companyId || null} sites={sites} />

      <FilesCard
        title="Files"
        description="Site lists, signed agreements, insurance docs — any file type."
        files={files}
        onUpload={(file) => {
          const formData = new FormData();
          formData.set("file", file);
          return uploadContractFileAction(contract.id, formData);
        }}
        onDownload={(id) => getContractFileDownloadUrlAction(id)}
        onDelete={(id) => deleteContractFileAction(id)}
        onRename={(id, fileName) => renameContractFileAction(id, fileName)}
        onChange={refreshFiles}
      />
    </div>
  );
}
