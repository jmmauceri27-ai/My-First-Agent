export const dynamic = "force-dynamic";

import { listCompanies, listContracts, listOpportunities } from "@/lib/crmDal";
import { listSites, listVendors } from "@/lib/networkDal";
import SitesClient from "./SitesClient";

export default async function SitesPage() {
  const [sites, companies, vendors, opportunities, contracts] = await Promise.all([
    listSites(),
    listCompanies(),
    listVendors(),
    listOpportunities(),
    listContracts(),
  ]);

  return (
    <SitesClient
      sites={sites}
      companies={companies}
      vendors={vendors}
      opportunities={opportunities}
      contracts={contracts}
    />
  );
}
