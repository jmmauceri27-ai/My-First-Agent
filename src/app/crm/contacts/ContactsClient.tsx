"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Company, Contact } from "@/lib/crmTypes";
import ContactModal from "./ContactModal";

export default function ContactsClient({ contacts, companies }: { contacts: Contact[]; companies: Company[] }) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>+ New contact</Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No contacts yet.</p>
      ) : (
        <Card className="flex flex-col divide-y divide-slate-100 overflow-hidden dark:divide-slate-900">
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setEditingContact(c)}
              className="flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {c.name}
                  {c.title && <span className="ml-2 text-xs font-normal text-slate-400">{c.title}</span>}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {[c.companyName, c.email, c.phone].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
            </button>
          ))}
        </Card>
      )}

      {(editingContact || creating) && (
        <ContactModal
          contact={editingContact}
          companies={companies}
          onClose={() => {
            setEditingContact(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
