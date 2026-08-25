"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { inputClass } from "@/components/ui/formClasses";
import { formatCurrency } from "@/lib/siteMapColor";
import { DEPARTMENTS } from "@/lib/crmTypes";
import type { Employee, EmployeeInput, Opportunity } from "@/lib/crmTypes";
import { deleteEmployeeAction, updateEmployeeAction } from "@/app/crm/actions";

export default function EmployeeDetailClient({
  employee,
  opportunities,
}: {
  employee: Employee;
  opportunities: Opportunity[];
}) {
  const router = useRouter();
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [title, setTitle] = useState(employee.title ?? "");
  const [department, setDepartment] = useState(employee.department ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setSaving(true);
    try {
      const input: EmployeeInput = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        title: title.trim() || null,
        department: department || null,
      };
      await updateEmployeeAction(employee.id, input);
      router.push("/network/employees");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEmployeeAction(employee.id);
      router.push("/network/employees");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/network/employees" className="text-sm font-medium text-brand-400 hover:underline">
          ← Back to Employees
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-50">{employee.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-50">Details</h2>

          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">Department</span>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
                <option value="">(none)</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-300">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </label>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-critical">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete employee"}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <h2 className="text-lg font-bold text-slate-50">Opportunities managed</h2>

          <div className="mt-4 flex flex-col divide-y divide-purple-400/10">
            {opportunities.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">Not managing any opportunities yet.</p>
            ) : (
              opportunities.map((o) => (
                <Link
                  key={o.id}
                  href={`/crm/opportunities/${o.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-brand-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-50">{o.name}</p>
                    <p className="text-xs text-slate-400">{o.stage}</p>
                  </div>
                  {o.amount != null && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">{formatCurrency(o.amount)}</span>
                  )}
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
