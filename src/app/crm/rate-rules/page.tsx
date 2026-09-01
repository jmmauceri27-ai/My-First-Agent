export const dynamic = "force-dynamic";

import { listClientRateOverrides, listCompanies, listRateRules } from "@/lib/crmDal";
import CrmNav from "../CrmNav";
import RateRulesClient from "./RateRulesClient";

export default async function RateRulesPage() {
  const [rateRules, overrides, companies] = await Promise.all([
    listRateRules(),
    listClientRateOverrides(),
    listCompanies(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">💼 CRM</h1>
      <CrmNav active="rate-rules" />
      <RateRulesClient rateRules={rateRules} overrides={overrides} companies={companies} />
    </div>
  );
}
