export const dynamic = "force-dynamic";

import { listClientRateOverrides, listCompanies, listRateItems } from "@/lib/crmDal";
import CrmNav from "../CrmNav";
import RateRulesClient from "./RateRulesClient";

export default async function RateRulesPage() {
  const [rateItems, overrides, companies] = await Promise.all([
    listRateItems(),
    listClientRateOverrides(),
    listCompanies(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">💼 CRM</h1>
      <CrmNav active="rate-rules" />
      <RateRulesClient rateItems={rateItems} overrides={overrides} companies={companies} />
    </div>
  );
}
