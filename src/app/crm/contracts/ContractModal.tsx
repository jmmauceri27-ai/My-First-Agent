"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FilesCard from "@/components/FilesCard";
import { inputClass } from "@/components/ui/formClasses";
import { RATE_FREQUENCIES } from "@/lib/crmTypes";
import type { Company, Contract, ContractFile, ContractInput } from "@/lib/crmTypes";
import {
  deleteContractAction,
  deleteContractFileAction,
  getContractFileDownloadUrlAction,
  listContractFilesAction,
  renameContractFileAction,
  saveContractAction,
  uploadContractFileAction,
} from "../actions";

export default function ContractModal({
  contract,
  companies,
  onClose,
}: {
  contract: Contract | null;
  companies: Company[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(contract?.name ?? "");
  const [companyId, setCompanyId] = useState(contract?.companyId ?? "");
  const [workType, setWorkType] = useState(contract?.workType ?? "");
  const [siteCount, setSiteCount] = useState(contract?.siteCount != null ? String(contract.siteCount) : "");
  const [rateAmount, setRateAmount] = useState(contract?.rateAmount != null ? String(contract.rateAmount) : "");
  const [rateFrequency, setRateFrequency] = useState(contract?.rateFrequency ?? "");
  const [startDate, setStartDate] = useState(contract?.startDate ?? "");
  const [endDate, setEndDate] = useState(contract?.endDate ?? "");
  const [notes, setNotes] = useState(contract?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [files, setFiles] = useState<ContractFile[]>([]);

  useEffect(() => {
    if (!contract) return;
    let cancelled = false;
    listContractFilesAction(contract.id).then((result) => {
      if (!cancelled) setFiles(result);
    });
    return () => {
      cancelled = true;
    };
  }, [contract]);

  function refreshFiles() {
    if (!contract) return;
    listContractFilesAction(contract.id).then(setFiles);
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a contract name.");
      return;
    }
    setSaving(true);
    try {
      const input: ContractInput = {
        companyId: companyId || null,
        name: name.trim(),
        workType: workType.trim() || null,
        siteCount: siteCount.trim() ? Number(siteCount) : null,
        rateAmount: rateAmount.trim() ? Number(rateAmount) : null,
        rateFrequency: rateFrequency || null,
        startDate: startDate || null,
        endDate: endDate || null,
        notes: notes.trim() || null,
      };
      await saveContractAction(contract?.id ?? null, input);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save contract.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contract) return;
    setDeleting(true);
    try {
      await deleteContractAction(contract.id);
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-50">{contract ? "Edit contract" : "New contract"}</h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Contract name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ABC Corp — Snow Removal 2026"
              className={inputClass}
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Company</span>
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
            <span className="font-medium text-slate-300">Type of work</span>
            <input
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              placeholder="e.g. Snow removal, landscaping"
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300"># of sites</span>
              <input
                type="number"
                value={siteCount}
                onChange={(e) => setSiteCount(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Rate ($)</span>
              <input
                type="number"
                value={rateAmount}
                onChange={(e) => setRateAmount(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Rate frequency</span>
            <select value={rateFrequency} onChange={(e) => setRateFrequency(e.target.value)} className={inputClass}>
              <option value="">(none)</option>
              {RATE_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">End date</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </label>
        </div>

        {contract && (
          <div className="mt-4">
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
        )}

        {error && <p className="mt-3 text-sm text-critical">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
          {contract && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
