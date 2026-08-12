export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCompany, listContacts, listContracts, listOpportunities } from "@/lib/crmDal";
import { listSitesForCompany } from "@/lib/networkDal";
import ClientDetailClient from "./ClientDetailClient";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const [contacts, opportunities, contracts, sites] = await Promise.all([
    listContacts(),
    listOpportunities(),
    listContracts(),
    listSitesForCompany(id),
  ]);

  return (
    <ClientDetailClient
      company={company}
      contacts={contacts.filter((c) => c.companyId === id)}
      opportunities={opportunities.filter((o) => o.companyId === id)}
      contracts={contracts.filter((c) => c.companyId === id)}
      sites={sites}
    />
  );
}
