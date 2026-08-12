export const dynamic = "force-dynamic";

import { listEmployees } from "@/lib/crmDal";
import NetworkNav from "../NetworkNav";
import EmployeesClient from "./EmployeesClient";

export default async function EmployeesPage() {
  const employees = await listEmployees();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">🌐 Network</h1>
      <NetworkNav active="employees" />
      <EmployeesClient employees={employees} />
    </div>
  );
}
