export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import {
  getOpportunity,
  getOpportunitySiteBinding,
  listCompanies,
  listContacts,
  listEmployees,
  listOpportunityFiles,
  listOpportunitySites,
} from "@/lib/crmDal";
import OpportunityDetailClient from "./OpportunityDetailClient";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  const [companies, contacts, employees, files, siteBinding, siteRows] = await Promise.all([
    listCompanies(),
    listContacts(),
    listEmployees(),
    listOpportunityFiles(id),
    getOpportunitySiteBinding(id),
    listOpportunitySites(id),
  ]);

  return (
    <OpportunityDetailClient
      opportunity={opportunity}
      companies={companies}
      contacts={contacts}
      employees={employees}
      files={files}
      siteBinding={siteBinding}
      siteRows={siteRows}
    />
  );
}
