export const dynamic = "force-dynamic";

import { listCompanies } from "@/lib/crmDal";
import CrmNav from "../CrmNav";
import CompaniesClient from "./CompaniesClient";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">💼 CRM</h1>
      <CrmNav active="companies" />
      <CompaniesClient companies={companies} />
    </div>
  );
}
