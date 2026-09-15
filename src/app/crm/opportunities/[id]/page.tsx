export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import {
  getContractForOpportunity,
  getOpportunity,
  listCompanies,
  listContacts,
  listEmployees,
  listOpportunityFiles,
} from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import OpportunityDetailClient from "./OpportunityDetailClient";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  const [companies, contacts, employees, files, fieldClasses, linkedContract] = await Promise.all([
    listCompanies(),
    listContacts(),
    listEmployees(),
    listOpportunityFiles(id),
    listFieldClasses(),
    getContractForOpportunity(id),
  ]);

  return (
    <OpportunityDetailClient
      opportunity={opportunity}
      companies={companies}
      contacts={contacts}
      employees={employees}
      files={files}
      fieldClasses={fieldClasses}
      linkedContract={linkedContract}
    />
  );
}
