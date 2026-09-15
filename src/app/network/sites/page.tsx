export const dynamic = "force-dynamic";

import { listCompanies, listContracts, listOpportunities } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import { listSiteFilterTemplates, listSites, listVendors } from "@/lib/networkDal";
import SitesClient from "./SitesClient";

export default async function SitesPage() {
  const [allSites, companies, vendors, opportunities, contracts, filterTemplates, fieldClasses] = await Promise.all([
    listSites(),
    listCompanies(),
    listVendors(),
    listOpportunities(),
    listContracts(),
    listSiteFilterTemplates(),
    listFieldClasses(),
  ]);

  // Only sites under a signed Agreement belong here -- an Opportunity's site count is just a manual
  // estimate (see OpportunityModal), with no real located Site records behind it until it converts.
  const sites = allSites.filter((s) => s.contractId != null);

  return (
    <SitesClient
      sites={sites}
      companies={companies}
      vendors={vendors}
      opportunities={opportunities}
      contracts={contracts}
      filterTemplates={filterTemplates}
      fieldClasses={fieldClasses}
    />
  );
}
