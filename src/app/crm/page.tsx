export const dynamic = "force-dynamic";

import { listCompanies, listContacts, listOpportunities } from "@/lib/crmDal";
import CrmNav from "./CrmNav";
import KanbanBoard from "./KanbanBoard";

export default async function CrmPage() {
  const [opportunities, companies, contacts] = await Promise.all([
    listOpportunities(),
    listCompanies(),
    listContacts(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">💼 CRM</h1>
      <CrmNav active="pipeline" />
      <KanbanBoard opportunities={opportunities} companies={companies} contacts={contacts} />
    </div>
  );
}
