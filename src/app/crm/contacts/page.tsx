export const dynamic = "force-dynamic";

import { listCompanies, listContacts } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import { listSites } from "@/lib/networkDal";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
  const [contacts, companies, sites, fieldClasses] = await Promise.all([
    listContacts(),
    listCompanies(),
    listSites(),
    listFieldClasses(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">💼 CRM · Contacts</h1>
      <ContactsClient contacts={contacts} companies={companies} sites={sites} fieldClasses={fieldClasses} />
    </div>
  );
}
