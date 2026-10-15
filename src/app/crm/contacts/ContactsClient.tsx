"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/formClasses";
import type { Company, Contact, FieldClass } from "@/lib/crmTypes";
import type { Site } from "@/lib/networkTypes";
import { getFieldValuesForRecordsAction } from "@/app/crm/fields/actions";
import ContactModal from "./ContactModal";

type SortField = "name" | "title" | "companyName" | "email" | "phone" | "region" | "siteCount" | "canApproveWork";
type SortDirection = "asc" | "desc";

/** Title/email/phone/region/canApproveWork/approvalLimit are standard Contact Fields now, not columns -- this
 * is a contact's resolved values for them, derived from bulk-fetched Field values. */
interface ContactExtra {
  title: string;
  email: string;
  phone: string;
  region: string;
  canApproveWork: boolean;
  approvalLimit: number | null;
}

const EMPTY_EXTRA: ContactExtra = { title: "", email: "", phone: "", region: "", canApproveWork: false, approvalLimit: null };

const COLUMNS: { field: SortField; label: string; align?: "right" | "center" }[] = [
  { field: "name", label: "Name" },
  { field: "title", label: "Title" },
  { field: "companyName", label: "Client" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "region", label: "Region" },
  { field: "siteCount", label: "Sites", align: "right" },
  { field: "canApproveWork", label: "Approves", align: "center" },
];

/** Missing values always sort to the end regardless of direction; siteCount/canApproveWork compare numerically
 * (a boolean coerces to 0/1), everything else is a case-insensitive string comparison. */
function compareContacts(a: Contact, b: Contact, field: SortField, extras: Record<string, ContactExtra>): number {
  if (field === "siteCount") return a.siteIds.length - b.siteIds.length;
  const ea = extras[a.id] ?? EMPTY_EXTRA;
  const eb = extras[b.id] ?? EMPTY_EXTRA;
  if (field === "canApproveWork") return Number(ea.canApproveWork) - Number(eb.canApproveWork);
  const av = field === "companyName" ? a.companyName : field === "name" ? a.name : ea[field];
  const bv = field === "companyName" ? b.companyName : field === "name" ? b.name : eb[field];
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av.toLowerCase().localeCompare(bv.toLowerCase());
}

export default function ContactsClient({
  contacts,
  companies,
  sites,
  fieldClasses,
}: {
  contacts: Contact[];
  companies: Company[];
  sites: Site[];
  fieldClasses: FieldClass[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [approvesFilter, setApprovesFilter] = useState<"" | "yes" | "no">("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const contactFieldIds = useMemo(() => {
    const contactFields = fieldClasses.find((c) => c.recordType === "Contact")?.fields ?? [];
    return Object.fromEntries(contactFields.map((f) => [f.name, f.id])) as Record<string, string | undefined>;
  }, [fieldClasses]);

  const [fieldValuesByContact, setFieldValuesByContact] = useState<Record<string, Record<string, string | null>>>({});

  useEffect(() => {
    if (contacts.length === 0) return;
    getFieldValuesForRecordsAction(contacts.map((c) => c.id)).then(setFieldValuesByContact);
  }, [contacts]);

  const extras = useMemo(() => {
    const result: Record<string, ContactExtra> = {};
    for (const c of contacts) {
      const values = fieldValuesByContact[c.id] ?? {};
      const get = (name: string) => (contactFieldIds[name] ? (values[contactFieldIds[name]!] ?? "") : "");
      const approvalLimitRaw = get("approval_limit");
      result[c.id] = {
        title: get("title"),
        email: get("email"),
        phone: get("phone"),
        region: get("region"),
        canApproveWork: get("can_approve_work") === "true",
        approvalLimit: approvalLimitRaw ? Number(approvalLimitRaw) : null,
      };
    }
    return result;
  }, [contacts, fieldValuesByContact, contactFieldIds]);

  const regions = useMemo(
    () =>
      Array.from(new Set(Object.values(extras).map((e) => e.region).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [extras],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((c) => {
      const e = extras[c.id] ?? EMPTY_EXTRA;
      if (companyFilter && c.companyId !== companyFilter) return false;
      if (regionFilter && e.region !== regionFilter) return false;
      if (approvesFilter === "yes" && !e.canApproveWork) return false;
      if (approvesFilter === "no" && e.canApproveWork) return false;
      if (query) {
        const haystack = [c.name, e.title, c.companyName, e.email, e.phone].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [contacts, extras, search, companyFilter, regionFilter, approvesFilter]);

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    const sign = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => sign * compareContacts(a, b, sortField, extras));
  }, [filtered, sortField, sortDirection, extras]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const hasActiveFilters = !!(search || companyFilter || regionFilter || approvesFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, title, email, phone…"
            className={`${inputClass} w-56`}
          />
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className={inputClass}>
            <option value="">All clients</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={inputClass}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={approvesFilter}
            onChange={(e) => setApprovesFilter(e.target.value as "" | "yes" | "no")}
            className={inputClass}
          >
            <option value="">Approves: any</option>
            <option value="yes">Can approve work</option>
            <option value="no">Cannot approve work</option>
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCompanyFilter("");
                setRegionFilter("");
                setApprovesFilter("");
              }}
              className="text-xs text-slate-500 hover:underline dark:text-slate-400"
            >
              Clear filters
            </button>
          )}
        </div>
        <Button onClick={() => setCreating(true)}>+ New contact</Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No contacts yet.</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No contacts match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-purple-400/10 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-3"></th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.field}
                    onClick={() => handleSort(c.field)}
                    className={`cursor-pointer select-none py-2 pr-3 hover:text-slate-900 dark:hover:text-slate-50 ${
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""
                    }`}
                  >
                    {c.label}
                    {sortField === c.field && (sortDirection === "asc" ? " ▲" : " ▼")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const e = extras[c.id] ?? EMPTY_EXTRA;
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/crm/contacts/${c.id}`)}
                    className="cursor-pointer border-b border-purple-400/5 hover:bg-purple-500/5"
                  >
                    <td className="py-2 pr-3">
                      {c.companyLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.companyLogoUrl}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full border border-slate-200 bg-slate-50 object-contain dark:border-slate-800 dark:bg-slate-900"
                        />
                      ) : (
                        <span className="block h-7 w-7 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
                      )}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-50">{c.name}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.title || "—"}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{c.companyName ?? "—"}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.email || "—"}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.phone || "—"}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{e.region || "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {c.siteIds.length > 0 ? c.siteIds.length : "—"}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {e.canApproveWork ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Yes{e.approvalLimit != null ? ` · $${e.approvalLimit.toLocaleString()}` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <ContactModal
          contact={null}
          companies={companies}
          sites={sites}
          fieldClasses={fieldClasses}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
