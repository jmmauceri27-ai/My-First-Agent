export const dynamic = "force-dynamic";

import { listCompanies, listContracts } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import ContractsClient from "./ContractsClient";

export default async function ContractsPage() {
  const [contracts, companies, fieldClasses] = await Promise.all([
    listContracts(),
    listCompanies(),
    listFieldClasses("Contract"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">💼 CRM · Agreements</h1>
      <ContractsClient contracts={contracts} companies={companies} fieldClasses={fieldClasses} />
    </div>
  );
}
