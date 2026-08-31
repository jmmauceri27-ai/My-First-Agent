export const dynamic = "force-dynamic";

import { listSites } from "@/lib/networkDal";
import NetworkNav from "../NetworkNav";
import RatesClient from "./RatesClient";

export default async function RatesPage() {
  const sites = await listSites();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">🌐 Network</h1>
      <NetworkNav active="rates" />
      <RatesClient sites={sites} />
    </div>
  );
}
