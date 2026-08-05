"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { OPPORTUNITY_STAGES } from "@/lib/crmTypes";
import type {
  Company,
  Contact,
  Employee,
  Opportunity,
  OpportunityFile,
  OpportunityInput,
  OpportunitySiteBinding,
  OpportunitySiteRow,
  OpportunityStage,
} from "@/lib/crmTypes";
import {
  deleteEmployeeAction,
  deleteOpportunityAction,
  deleteOpportunityFileAction,
  getOpportunityFileDownloadUrlAction,
  saveEmployeeAction,
  saveOpportunityAction,
  uploadOpportunityFileAction,
} from "../../actions";
import SitesCard from "./SitesCard";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "📊";
  if (ext === "doc" || ext === "docx") return "📝";
  return "📎";
}

export default function OpportunityDetailClient({
  opportunity,
  companies,
  contacts,
  employees,
  files,
  siteBinding,
  siteRows,
}: {
  opportunity: Opportunity;
  companies: Company[];
  contacts: Contact[];
  employees: Employee[];
  files: OpportunityFile[];
  siteBinding: OpportunitySiteBinding | null;
  siteRows: OpportunitySiteRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState(opportunity.name);
  const [companyId, setCompanyId] = useState(opportunity.companyId ?? "");
  const [stage, setStage] = useState<OpportunityStage>(opportunity.stage);
  const [amount, setAmount] = useState(opportunity.amount != null ? String(opportunity.amount) : "");
  const [siteCount, setSiteCount] = useState(opportunity.siteCount != null ? String(opportunity.siteCount) : "");
  const [workType, setWorkType] = useState(opportunity.workType ?? "");
  const [expectedCloseDate, setExpectedCloseDate] = useState(opportunity.expectedCloseDate ?? "");
  const [notes, setNotes] = useState(opportunity.notes ?? "");
  const [contactIds, setContactIds] = useState<string[]>(opportunity.contactIds);
  const [salesManagerId, setSalesManagerId] = useState(opportunity.salesManagerId ?? "");

  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [localEmployees, setLocalEmployees] = useState(employees);
  const [removingEmployee, setRemovingEmployee] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pendingDownloadId, setPendingDownloadId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function toggleContact(id: string) {
    setContactIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleAddEmployee() {
    if (!newEmployeeName.trim()) return;
    const id = await saveEmployeeAction(newEmployeeName.trim());
    setLocalEmployees((prev) => [...prev, { id, name: newEmployeeName.trim(), createdAt: new Date().toISOString() }]);
    setSalesManagerId(id);
    setNewEmployeeName("");
    setAddingEmployee(false);
  }

  async function handleRemoveEmployee() {
    if (!salesManagerId) return;
    setRemovingEmployee(true);
    try {
      await deleteEmployeeAction(salesManagerId);
      setLocalEmployees((prev) => prev.filter((e) => e.id !== salesManagerId));
      setSalesManagerId("");
    } finally {
      setRemovingEmployee(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter an opportunity name.");
      return;
    }
    setSaving(true);
    try {
      const input: OpportunityInput = {
        name: name.trim(),
        companyId: companyId || null,
        stage,
        amount: amount.trim() ? Number(amount) : null,
        siteCount: siteCount.trim() ? Number(siteCount) : null,
        workType: workType.trim() || null,
        expectedCloseDate: expectedCloseDate || null,
        notes: notes.trim() || null,
        contactIds,
        salesManagerId: salesManagerId || null,
      };
      await saveOpportunityAction(opportunity.id, input);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteOpportunityAction(opportunity.id);
      router.push("/crm");
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setFileError("Please choose a file.");
      return;
    }
    setFileError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      await uploadOpportunityFileAction(opportunity.id, formData);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(fileId: string) {
    setPendingDownloadId(fileId);
    setFileError(null);
    try {
      const url = await getOpportunityFileDownloadUrlAction(fileId);
      window.open(url, "_blank");
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Failed to open file.");
    } finally {
      setPendingDownloadId(null);
    }
  }

  async function handleDeleteFile(fileId: string) {
    setPendingDeleteId(fileId);
    setFileError(null);
    try {
      await deleteOpportunityFileAction(fileId, opportunity.id);
      router.refresh();
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Failed to delete file.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/crm" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          ← Back to pipeline
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          {opportunity.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Details</h2>

          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Opportunity name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Company</span>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
                <option value="">(none)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Sales manager</span>
              {addingEmployee ? (
                <div className="flex gap-2">
                  <input
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    placeholder="New employee name"
                    className={inputClass}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddEmployee}>
                    Add
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={salesManagerId}
                    onChange={(e) => setSalesManagerId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">(none)</option>
                    {localEmployees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="secondary" onClick={() => setAddingEmployee(true)}>
                    + New
                  </Button>
                  {salesManagerId && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleRemoveEmployee}
                      disabled={removingEmployee}
                      title="Remove this employee from the list"
                    >
                      {removingEmployee ? "…" : "Remove"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Stage</span>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as OpportunityStage)}
                  className={inputClass}
                >
                  {OPPORTUNITY_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Amount ($)</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300"># of sites</span>
                {siteBinding ? (
                  <div className={`${inputClass} flex items-center bg-slate-100 dark:bg-slate-900`}>
                    {siteCount || 0}
                    <span className="ml-1.5 text-xs text-slate-400">(from uploaded sites, see below)</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={siteCount}
                    onChange={(e) => setSiteCount(e.target.value)}
                    className={inputClass}
                  />
                )}
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Expected close date</span>
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Type of work</span>
              <input
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                placeholder="e.g. HVAC installation, roofing, electrical"
                className={inputClass}
              />
            </label>

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Contacts involved</span>
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-300 p-2 dark:border-slate-700">
                {contacts.length === 0 ? (
                  <span className="text-xs text-slate-400">No contacts yet — add some on the Contacts page.</span>
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
                      {c.companyName && <span className="text-xs text-slate-400">({c.companyName})</span>}
                    </label>
                  ))
                )}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={inputClass} />
            </label>
          </div>

          {error && <p className="mt-3 text-sm text-critical">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete opportunity"}
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col p-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Files</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Attach proposals, quotes, site surveys — Excel, PDF, or any file type.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="text-xs text-slate-700 file:mr-2 file:rounded-lg file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-700 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-brand-400"
              />
              <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
              {fileError && <p className="text-xs text-critical">{fileError}</p>}
            </div>

            <div className="mt-4 flex flex-col divide-y divide-slate-100 dark:divide-slate-900">
              {files.length === 0 ? (
                <p className="py-2 text-xs text-slate-400">No files attached yet.</p>
              ) : (
                files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="text-lg leading-none">{fileIcon(f.fileName)}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{f.fileName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatSize(f.sizeBytes)} · {new Date(f.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => handleDownload(f.id)}
                        disabled={pendingDownloadId === f.id}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                      >
                        {pendingDownloadId === f.id ? "…" : "Download"}
                      </button>
                      <button
                        onClick={() => handleDeleteFile(f.id)}
                        disabled={pendingDeleteId === f.id}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-critical hover:bg-critical/10"
                      >
                        {pendingDeleteId === f.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <SitesCard opportunityId={opportunity.id} binding={siteBinding} rows={siteRows} />
        </div>
      </div>
    </div>
  );
}
