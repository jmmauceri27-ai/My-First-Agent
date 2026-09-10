export const dynamic = "force-dynamic";

import { listEmployees } from "@/lib/crmDal";
import EmployeesClient from "./EmployeesClient";

export default async function EmployeesPage() {
  const employees = await listEmployees();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">🌐 Network · Employees</h1>
      <EmployeesClient employees={employees} />
    </div>
  );
}
