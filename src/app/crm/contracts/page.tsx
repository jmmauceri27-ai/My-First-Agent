export const dynamic = "force-dynamic";

import { listCompanies, listContracts } from "@/lib/crmDal";
import CrmNav from "../CrmNav";
import ContractsClient from "./ContractsClient";

export default async function ContractsPage() {
  const [contracts, companies] = await Promise.all([listContracts(), listCompanies()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">💼 CRM</h1>
      <CrmNav active="contracts" />
      <ContractsClient contracts={contracts} companies={companies} />
    </div>
  );
}
