export const dynamic = "force-dynamic";

import { listCompanies, listContacts, listContracts, listOpportunities } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import ContractsClient from "./ContractsClient";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; convertFrom?: string }>;
}) {
  const { open, convertFrom } = await searchParams;
  const [contracts, companies, opportunities, contacts, fieldClasses] = await Promise.all([
    listContracts(),
    listCompanies(),
    listOpportunities(),
    listContacts(),
    listFieldClasses(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">💼 CRM · Agreements</h1>
      <ContractsClient
        contracts={contracts}
        companies={companies}
        opportunities={opportunities}
        contacts={contacts}
        fieldClasses={fieldClasses}
        openContractId={open ?? null}
        convertFromOpportunityId={convertFrom ?? null}
      />
    </div>
  );
}
