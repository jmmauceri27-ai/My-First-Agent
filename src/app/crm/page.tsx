export const dynamic = "force-dynamic";

import { listCompanies, listContacts, listConvertedOpportunityIds, listEmployees, listOpportunities } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import KanbanBoard from "./KanbanBoard";

export default async function CrmPage() {
  const [opportunities, companies, contacts, employees, fieldClasses, convertedIds] = await Promise.all([
    listOpportunities(),
    listCompanies(),
    listContacts(),
    listEmployees(),
    listFieldClasses("Opportunity"),
    listConvertedOpportunityIds(),
  ]);
  // A converted opportunity drops off the pipeline once it's moved past Won -- but a Won opportunity is
  // always converted now (moving to Won auto-creates its agreement), so Won itself is an exception: it
  // stays visible here, otherwise the Won column would always be empty.
  const pipelineOpportunities = opportunities.filter((o) => o.stage === "Won" || !convertedIds.has(o.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">💼 CRM · Pipeline</h1>
      <KanbanBoard
        opportunities={pipelineOpportunities}
        companies={companies}
        contacts={contacts}
        employees={employees}
        fieldClasses={fieldClasses}
      />
    </div>
  );
}
