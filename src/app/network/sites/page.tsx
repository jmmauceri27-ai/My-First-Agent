export const dynamic = "force-dynamic";

import { listCompanies, listOpportunities } from "@/lib/crmDal";
import { listSites, listVendors } from "@/lib/networkDal";
import SitesClient from "./SitesClient";

export default async function SitesPage() {
  const [sites, companies, vendors, opportunities] = await Promise.all([
    listSites(),
    listCompanies(),
    listVendors(),
    listOpportunities(),
  ]);

  return <SitesClient sites={sites} companies={companies} vendors={vendors} opportunities={opportunities} />;
}
