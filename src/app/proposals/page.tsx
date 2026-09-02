export const dynamic = "force-dynamic";

import { listClientRateOverrides, listCompanies, listRateItems } from "@/lib/crmDal";
import RateRulesClient from "./RateRulesClient";

export default async function ProposalsPage() {
  const [rateItems, overrides, companies] = await Promise.all([
    listRateItems(),
    listClientRateOverrides(),
    listCompanies(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">📋 Proposals</h1>
      <RateRulesClient rateItems={rateItems} overrides={overrides} companies={companies} />
    </div>
  );
}
