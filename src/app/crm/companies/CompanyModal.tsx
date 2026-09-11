"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { Company, FieldClass } from "@/lib/crmTypes";
import { deleteCompanyAction, deleteCompanyLogoAction, saveCompanyAction, uploadCompanyLogoAction } from "../actions";
import {
  assignFieldToRecordAction,
  getFieldValuesForRecordAction,
  listAssignedFieldIdsAction,
  saveFieldValuesForRecordAction,
  unassignFieldFromRecordAction,
} from "../fields/actions";
import DynamicFieldsSection from "../fields/DynamicFieldsSection";
import LogoCropModal from "./LogoCropModal";
import RemoveLogoBackgroundModal from "./RemoveLogoBackgroundModal";

export default function CompanyModal({
  company,
  fieldClasses,
  onClose,
}: {
  company: Company | null;
  fieldClasses: FieldClass[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(company?.name ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [city, setCity] = useState(company?.city ?? "");
  const [state, setState] = useState(company?.state ?? "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [notes, setNotes] = useState(company?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [assignedFieldIds, setAssignedFieldIds] = useState<string[]>([]);

  useEffect(() => {
    if (!company) return;
    getFieldValuesForRecordAction(company.id).then((values) => {
      const asStrings: Record<string, string> = {};
      for (const [fieldId, value] of Object.entries(values)) {
        if (value != null) asStrings[fieldId] = value;
      }
      setFieldValues(asStrings);
    });
    listAssignedFieldIdsAction(company.id).then(setAssignedFieldIds);
  }, [company]);

  async function handleAssignField(fieldId: string) {
    if (!company) return;
    setAssignedFieldIds((prev) => [...prev, fieldId]);
    await assignFieldToRecordAction(company.id, fieldId);
  }

  async function handleUnassignField(fieldId: string) {
    if (!company) return;
    setAssignedFieldIds((prev) => prev.filter((id) => id !== fieldId));
    setFieldValues((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    await unassignFieldFromRecordAction(company.id, fieldId);
  }

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl ?? null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [bgRemovalFile, setBgRemovalFile] = useState<File | null>(null);

  function handleLogoFileSelected() {
    const file = logoInputRef.current?.files?.[0];
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (!file) return;
    setLogoError(null);
    setCropFile(file);
  }

  function handleCropped(cropped: File) {
    setCropFile(null);
    setBgRemovalFile(cropped);
  }

  async function handleBackgroundDone(finalFile: File) {
    if (!company) return;
    setBgRemovalFile(null);
    setLogoError(null);
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.set("file", finalFile);
      const result = await uploadCompanyLogoAction(company.id, formData);
      if (result.error) {
        setLogoError(result.error);
        return;
      }
      setLogoUrl(URL.createObjectURL(finalFile));
      router.refresh();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    if (!company) return;
    setLogoError(null);
    setUploadingLogo(true);
    try {
      const result = await deleteCompanyLogoAction(company.id);
      if (result.error) {
        setLogoError(result.error);
        return;
      }
      setLogoUrl(null);
      router.refresh();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a company name.");
      return;
    }
    setSaving(true);
    try {
      const companyId = await saveCompanyAction(company?.id ?? null, {
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
      });
      await saveFieldValuesForRecordAction(
        companyId,
        Object.entries(fieldValues).map(([fieldId, value]) => ({ fieldId, value: value || null })),
      );
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save company.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!company) return;
    setDeleting(true);
    try {
      await deleteCompanyAction(company.id);
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <Card
          className="max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {company ? "Edit company" : "New company"}
          </h2>

          {company && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={`${company.name} logo`} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">No logo</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileSelected}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                  </Button>
                  {logoUrl && (
                    <Button type="button" variant="ghost" onClick={handleRemoveLogo} disabled={uploadingLogo}>
                      Remove
                    </Button>
                  )}
                </div>
                {logoError && <p className="text-xs text-critical">{logoError}</p>}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">City</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">State</span>
                <input value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Website</span>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} />
            </label>
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
              canManageCustomFields={!!company}
            />
          </div>

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
            {company && (
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {cropFile && <LogoCropModal file={cropFile} onCancel={() => setCropFile(null)} onCropped={handleCropped} />}

      {bgRemovalFile && (
        <RemoveLogoBackgroundModal
          file={bgRemovalFile}
          onCancel={() => setBgRemovalFile(null)}
          onDone={handleBackgroundDone}
        />
      )}
    </>
  );
}
