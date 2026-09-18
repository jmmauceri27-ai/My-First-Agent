"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/formClasses";
import type { Company, Contact, FieldClass } from "@/lib/crmTypes";
import type { Site } from "@/lib/networkTypes";
import ContactModal from "./ContactModal";

type SortField = "name" | "title" | "companyName" | "email" | "phone" | "region" | "siteCount" | "canApproveWork";
type SortDirection = "asc" | "desc";

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
function compareContacts(a: Contact, b: Contact, field: SortField): number {
  if (field === "siteCount") return a.siteIds.length - b.siteIds.length;
  if (field === "canApproveWork") return Number(a.canApproveWork) - Number(b.canApproveWork);
  const av = a[field];
  const bv = b[field];
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

  const regions = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.region).filter((r): r is string => !!r))).sort((a, b) => a.localeCompare(b)),
    [contacts],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (companyFilter && c.companyId !== companyFilter) return false;
      if (regionFilter && c.region !== regionFilter) return false;
      if (approvesFilter === "yes" && !c.canApproveWork) return false;
      if (approvesFilter === "no" && c.canApproveWork) return false;
      if (query) {
        const haystack = [c.name, c.title, c.companyName, c.email, c.phone].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [contacts, search, companyFilter, regionFilter, approvesFilter]);

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    const sign = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => sign * compareContacts(a, b, sortField));
  }, [filtered, sortField, sortDirection]);

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
              {sorted.map((c) => (
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
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{c.title ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{c.companyName ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{c.email ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{c.phone ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{c.region ?? "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {c.siteIds.length > 0 ? c.siteIds.length : "—"}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    {c.canApproveWork ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Yes{c.approvalLimit != null ? ` · $${c.approvalLimit.toLocaleString()}` : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
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
