export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getContract, listCompanies, listContacts, listOpportunities } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import ContractDetailClient from "./ContractDetailClient";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();

  const [companies, opportunities, contacts, fieldClasses] = await Promise.all([
    listCompanies(),
    listOpportunities(),
    listContacts(),
    listFieldClasses(),
  ]);

  return (
    <ContractDetailClient
      contract={contract}
      companies={companies}
      opportunities={opportunities}
      contacts={contacts}
      fieldClasses={fieldClasses}
    />
  );
}
