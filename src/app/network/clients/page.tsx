export const dynamic = "force-dynamic";

import { listCompanies } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage() {
  const [companies, fieldClasses] = await Promise.all([listCompanies(), listFieldClasses("Company")]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">🌐 Network · Clients</h1>
      <ClientsClient companies={companies} fieldClasses={fieldClasses} />
    </div>
  );
}
