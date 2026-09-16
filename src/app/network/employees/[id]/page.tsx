export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getEmployee, listOpportunities } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import EmployeeDetailClient from "./EmployeeDetailClient";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  const [opportunities, fieldClasses] = await Promise.all([listOpportunities(), listFieldClasses()]);
  const managedOpportunities = opportunities.filter((o) => o.salesManagerId === id);

  return <EmployeeDetailClient employee={employee} opportunities={managedOpportunities} fieldClasses={fieldClasses} />;
}
