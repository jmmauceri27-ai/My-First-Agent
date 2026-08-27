import Link from "next/link";
import { listDuplicateSiteGroups } from "@/lib/networkDal";
import NetworkNav from "../../NetworkNav";
import DuplicateSitesClient from "./DuplicateSitesClient";

export const dynamic = "force-dynamic";

export default async function DuplicateSitesPage() {
  const groups = await listDuplicateSiteGroups();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-bold text-slate-50">🌐 Network</h1>
        <NetworkNav active="sites" />
      </div>
      <div>
        <Link href="/network/sites" className="text-sm font-medium text-brand-400 hover:underline">
          ← Back to Sites
        </Link>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-50">Duplicate Sites</h2>
        <p className="mt-1 text-sm text-slate-400">
          Every group of site records sharing the same Site ID -- almost always the same physical site entered more
          than once. Review each group and merge it into a single record.
        </p>
      </div>
      <DuplicateSitesClient groups={groups} />
    </div>
  );
}
