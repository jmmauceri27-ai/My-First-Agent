export const dynamic = "force-dynamic";

import { listCompanies } from "@/lib/crmDal";
import NetworkNav from "../NetworkNav";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage() {
  const companies = await listCompanies();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">🌐 Network</h1>
      <NetworkNav active="clients" />
      <ClientsClient companies={companies} />
    </div>
  );
}
