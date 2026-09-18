export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getContact, listActivitiesForContact, listCompanies, listContracts, listOpportunities } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import { listSites } from "@/lib/networkDal";
import ContactDetailClient from "./ContactDetailClient";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  const [companies, opportunities, contracts, sites, fieldClasses, activities] = await Promise.all([
    listCompanies(),
    listOpportunities(),
    listContracts(),
    listSites(),
    listFieldClasses(),
    listActivitiesForContact(id),
  ]);

  return (
    <ContactDetailClient
      contact={contact}
      companies={companies}
      opportunities={opportunities.filter((o) => o.contactIds.includes(id))}
      contracts={contracts.filter((c) => c.contactIds.includes(id))}
      sites={sites}
      fieldClasses={fieldClasses}
      activities={activities}
    />
  );
}
