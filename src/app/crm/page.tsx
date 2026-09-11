export const dynamic = "force-dynamic";

import { listCompanies, listContacts, listEmployees, listOpportunities } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import KanbanBoard from "./KanbanBoard";

export default async function CrmPage() {
  const [opportunities, companies, contacts, employees, fieldClasses] = await Promise.all([
    listOpportunities(),
    listCompanies(),
    listContacts(),
    listEmployees(),
    listFieldClasses("Opportunity"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">💼 CRM · Pipeline</h1>
      <KanbanBoard
        opportunities={opportunities}
        companies={companies}
        contacts={contacts}
        employees={employees}
        fieldClasses={fieldClasses}
      />
    </div>
  );
}
