"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { formatCurrency } from "@/lib/siteMapColor";
import { CONTACT_ACTIVITY_TYPES } from "@/lib/crmTypes";
import type { Company, Contact, ContactActivity, ContactActivityType, Contract, FieldClass, Opportunity } from "@/lib/crmTypes";
import type { Site } from "@/lib/networkTypes";
import { getFieldValuesForRecordAction, listAssignedFieldIdsAction } from "@/app/crm/fields/actions";
import ContactModal from "../ContactModal";
import { deleteContactActivityAction, saveContactActivityAction } from "../../actions";

/** A colored, iconed card used to visually separate each section of the Contact page -- the same pattern used
 * on the Site detail page, so both read the same way at a glance. */
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm text-slate-900 dark:text-slate-50">{value || <span className="text-slate-500 dark:text-slate-500">—</span>}</p>
    </div>
  );
}

const ACTIVITY_TYPE_META: Record<ContactActivityType, { icon: string; color: string }> = {
  Call: { icon: "📞", color: "#3b82f6" },
  Email: { icon: "✉️", color: "#8b5cf6" },
  Meeting: { icon: "🤝", color: "#0ca30c" },
};

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatActivityDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ContactDetailClient({
  contact,
  companies,
  opportunities,
  contracts,
  sites,
  fieldClasses,
  activities: initialActivities,
}: {
  contact: Contact;
  companies: Company[];
  opportunities: Opportunity[];
  contracts: Contract[];
  sites: Site[];
  fieldClasses: FieldClass[];
  activities: ContactActivity[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showAllSites, setShowAllSites] = useState(false);
  const responsibleSites = sites.filter((s) => contact.siteIds.includes(s.id));

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [assignedFieldIds, setAssignedFieldIds] = useState<string[]>([]);

  useEffect(() => {
    getFieldValuesForRecordAction(contact.id).then((values) => {
      const asStrings: Record<string, string> = {};
      for (const [fieldId, value] of Object.entries(values)) {
        if (value != null) asStrings[fieldId] = value;
      }
      setFieldValues(asStrings);
    });
    listAssignedFieldIdsAction(contact.id).then(setAssignedFieldIds);
  }, [contact.id]);

  const assignedFieldEntries = useMemo(() => {
    const allFields = fieldClasses.flatMap((c) => c.fields);
    return assignedFieldIds
      .map((id) => allFields.find((f) => f.id === id))
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({ label: f.label, value: fieldValues[f.id] ?? "" }));
  }, [fieldClasses, assignedFieldIds, fieldValues]);

  const [activities, setActivities] = useState<ContactActivity[]>(initialActivities);
  const [activityType, setActivityType] = useState<ContactActivityType>("Call");
  const [activityDate, setActivityDate] = useState(todayDateInputValue());
  const [activitySubject, setActivitySubject] = useState("");
  const [activityNotes, setActivityNotes] = useState("");
  const [loggingActivity, setLoggingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  async function handleLogActivity() {
    setActivityError(null);
    if (!activityDate) {
      setActivityError("Please choose a date.");
      return;
    }
    setLoggingActivity(true);
    try {
      const occurredAt = new Date(activityDate).toISOString();
      const id = await saveContactActivityAction({
        contactId: contact.id,
        type: activityType,
        subject: activitySubject.trim() || null,
        notes: activityNotes.trim() || null,
        occurredAt,
      });
      setActivities((prev) =>
        [
          { id, contactId: contact.id, type: activityType, subject: activitySubject.trim() || null, notes: activityNotes.trim() || null, occurredAt, createdAt: new Date().toISOString() },
          ...prev,
        ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
      );
      setActivitySubject("");
      setActivityNotes("");
    } catch (e) {
      setActivityError(e instanceof Error ? e.message : "Failed to log activity.");
    } finally {
      setLoggingActivity(false);
    }
  }

  async function handleDeleteActivity(id: string) {
    setDeletingActivityId(id);
    try {
      await deleteContactActivityAction(id, contact.id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeletingActivityId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/crm/contacts" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            ← Back to Contacts
          </Link>
          <div className="mt-2 flex items-center gap-3">
            {contact.companyLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contact.companyLogoUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-slate-50 object-contain dark:border-slate-800 dark:bg-slate-900"
              />
            )}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{contact.name}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {[contact.title, contact.companyName, contact.email, contact.phone].filter(Boolean).join(" · ") ||
              "No details on file"}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          ✏️ Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SectionCard icon="👤" title="Contact Info" color="#7c3ce3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title" value={contact.title} />
            <Field
              label="Client"
              value={
                contact.companyId && (
                  <Link href={`/network/clients/${contact.companyId}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                    {contact.companyName}
                  </Link>
                )
              }
            />
            <Field label="Email" value={contact.email} />
            <Field label="Phone" value={contact.phone} />
            <Field label="Region" value={contact.region} />
            <Field
              label="Approves work"
              value={
                contact.canApproveWork
                  ? `Yes${contact.approvalLimit != null ? ` · up to ${formatCurrency(contact.approvalLimit)}` : ""}`
                  : null
              }
            />
          </div>
        </SectionCard>

        <SectionCard icon="📈" title="Opportunities" color="#3b82f6">
          <div className="flex flex-col divide-y divide-purple-400/10">
            {opportunities.length === 0 ? (
              <p className="py-2 text-xs text-slate-500 dark:text-slate-400">
                No opportunities tied to this contact yet.
              </p>
            ) : (
              opportunities.map((o) => (
                <Link
                  key={o.id}
                  href={`/crm/opportunities/${o.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{o.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{o.stage}</p>
                  </div>
                  {o.amount != null && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {formatCurrency(o.amount)}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard icon="📄" title="Agreements" color="#14b8a6">
          <div className="flex flex-col divide-y divide-purple-400/10">
            {contracts.length === 0 ? (
              <p className="py-2 text-xs text-slate-500 dark:text-slate-400">
                No agreements tied to this contact yet.
              </p>
            ) : (
              contracts.map((c) => (
                <Link
                  key={c.id}
                  href={`/crm/contracts?open=${c.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{c.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.trades.length > 0 ? c.trades.join(", ") : "No trade set"}
                    </p>
                  </div>
                  {c.rateAmount != null && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {formatCurrency(c.rateAmount)}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard icon="📍" title="Sites responsible for" color="#f97316">
          {responsibleSites.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No sites assigned to this contact yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {responsibleSites.length} site{responsibleSites.length === 1 ? "" : "s"} assigned
                </p>
                <button
                  type="button"
                  onClick={() => setShowAllSites((prev) => !prev)}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {showAllSites ? "Show less" : "Show all"}
                </button>
              </div>
              {showAllSites && (
                <div className="flex flex-col divide-y divide-purple-400/10">
                  {responsibleSites.map((s) => (
                    <Link
                      key={s.id}
                      href={`/network/sites/${s.id}`}
                      className="flex items-center justify-between gap-2 py-2 hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{s.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {[s.city, s.state].filter(Boolean).join(", ") || "No location set"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard icon="🗒️" title="Activity Log" color="#ec4899" className="lg:col-span-2">
          <div className="flex flex-col gap-3 rounded-lg border border-purple-400/20 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Type</span>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as ContactActivityType)}
                  className={inputClass}
                >
                  {CONTACT_ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ACTIVITY_TYPE_META[t].icon} {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Date</span>
                <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Subject</span>
                <input
                  value={activitySubject}
                  onChange={(e) => setActivitySubject(e.target.value)}
                  placeholder="e.g. Discussed Q3 renewal"
                  className={inputClass}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Notes (optional)</span>
              <textarea
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </label>
            {activityError && <p className="text-xs text-critical">{activityError}</p>}
            <Button onClick={handleLogActivity} disabled={loggingActivity} className="w-fit">
              {loggingActivity ? "Logging…" : `+ Log ${activityType.toLowerCase()}`}
            </Button>
          </div>

          <div className="mt-4 flex flex-col divide-y divide-purple-400/10">
            {activities.length === 0 ? (
              <p className="py-2 text-xs text-slate-500 dark:text-slate-400">No calls, emails, or meetings logged yet.</p>
            ) : (
              activities.map((a) => {
                const meta = ACTIVITY_TYPE_META[a.type];
                return (
                  <div key={a.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                        style={{ backgroundColor: `${meta.color}22` }}
                      >
                        {meta.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {a.subject || a.type}
                          <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                            {a.type} · {formatActivityDate(a.occurredAt)}
                          </span>
                        </p>
                        {a.notes && <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">{a.notes}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteActivity(a.id)}
                      disabled={deletingActivityId === a.id}
                      className="shrink-0 text-xs text-slate-400 hover:text-critical"
                    >
                      {deletingActivityId === a.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard icon="📝" title="Notes" color="#78716c">
          <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-50">
            {contact.notes || <span className="text-slate-500 dark:text-slate-500">No notes yet.</span>}
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

      {editing && (
        <ContactModal
          contact={contact}
          companies={companies}
          sites={sites}
          fieldClasses={fieldClasses}
          onClose={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
