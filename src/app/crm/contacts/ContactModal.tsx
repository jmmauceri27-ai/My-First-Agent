"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import type { Company, Contact } from "@/lib/crmTypes";
import { deleteContactAction, saveContactAction } from "../actions";

export default function ContactModal({
  contact,
  companies,
  onClose,
}: {
  contact: Contact | null;
  companies: Company[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(contact?.name ?? "");
  const [companyId, setCompanyId] = useState(contact?.companyId ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [title, setTitle] = useState(contact?.title ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a contact name.");
      return;
    }
    setSaving(true);
    try {
      await saveContactAction(contact?.id ?? null, {
        name: name.trim(),
        companyId: companyId || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        title: title.trim() || null,
        notes: notes.trim() || null,
      });
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contact) return;
    setDeleting(true);
    try {
      await deleteContactAction(contact.id);
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {contact ? "Edit contact" : "New contact"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Company</span>
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
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </label>
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
          {contact && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
