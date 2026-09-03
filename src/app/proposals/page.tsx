export const dynamic = "force-dynamic";

import { listClientRateOverrides, listCompanies, listContracts, listRateItems } from "@/lib/crmDal";
import RateRulesClient from "./RateRulesClient";

export default async function ProposalsPage() {
  const [rateItems, overrides, companies, contracts] = await Promise.all([
    listRateItems(),
    listClientRateOverrides(),
    listCompanies(),
    listContracts(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">📋 Proposal Assistant</h1>
      <RateRulesClient rateItems={rateItems} overrides={overrides} companies={companies} contracts={contracts} />
    </div>
  );
}
