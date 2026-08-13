"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DEPARTMENTS } from "@/lib/crmTypes";
import type { Employee } from "@/lib/crmTypes";
import EmployeeModal from "./EmployeeModal";

const UNASSIGNED = "Unassigned";

export default function EmployeesClient({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const groups = useMemo(() => {
    const byDepartment = new Map<string, Employee[]>();
    for (const dept of DEPARTMENTS) byDepartment.set(dept, []);
    byDepartment.set(UNASSIGNED, []);
    for (const e of employees) {
      const key = e.department && byDepartment.has(e.department) ? e.department : UNASSIGNED;
      byDepartment.get(key)!.push(e);
    }
    return Array.from(byDepartment.entries()).filter(([, list]) => list.length > 0);
  }, [employees]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>+ New employee</Button>
      </div>

      {employees.length === 0 ? (
        <p className="text-sm text-slate-400">No employees yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([department, list]) => (
            <div key={department} className="flex flex-col gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                {department} <span className="font-normal text-slate-500">({list.length})</span>
              </h2>
              <Card className="flex flex-col divide-y divide-purple-400/10 overflow-hidden">
                {list.map((e) => (
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
            </div>
          ))}
        </div>
      )}

      {creating && (
        <EmployeeModal onClose={() => setCreating(false)} onSaved={(id) => router.push(`/network/employees/${id}`)} />
      )}
    </div>
  );
}
