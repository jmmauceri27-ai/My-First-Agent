"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Employee } from "@/lib/crmTypes";
import EmployeeModal from "./EmployeeModal";

export default function EmployeesClient({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>+ New employee</Button>
      </div>

      {employees.length === 0 ? (
        <p className="text-sm text-slate-400">No employees yet.</p>
      ) : (
        <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
          {employees.map((e) => (
            <button
              key={e.id}
              onClick={() => router.push(`/network/employees/${e.id}`)}
              className="flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-purple-500/5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-50">{e.name}</p>
                <p className="text-xs text-slate-400">
                  {[e.title, e.email, e.phone].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
            </button>
          ))}
        </Card>
      )}

      {creating && (
        <EmployeeModal onClose={() => setCreating(false)} onSaved={(id) => router.push(`/network/employees/${id}`)} />
      )}
    </div>
  );
}
