export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getOpportunity, listCompanies, listContacts, listEmployees, listOpportunityFiles } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import { listSitesForOpportunity } from "@/lib/networkDal";
import OpportunityDetailClient from "./OpportunityDetailClient";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  const [companies, contacts, employees, files, sites, fieldClasses] = await Promise.all([
    listCompanies(),
    listContacts(),
    listEmployees(),
    listOpportunityFiles(id),
    listSitesForOpportunity(id),
    listFieldClasses("Opportunity"),
  ]);

  return (
    <OpportunityDetailClient
      opportunity={opportunity}
      companies={companies}
      contacts={contacts}
      employees={employees}
      files={files}
      sites={sites}
      fieldClasses={fieldClasses}
    />
  );
}
