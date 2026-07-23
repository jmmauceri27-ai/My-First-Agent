export const dynamic = "force-dynamic";

import { listCompanies, listContacts } from "@/lib/crmDal";
import CrmNav from "../CrmNav";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([listContacts(), listCompanies()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">💼 CRM</h1>
      <CrmNav active="contacts" />
      <ContactsClient contacts={contacts} companies={companies} />
    </div>
  );
}
