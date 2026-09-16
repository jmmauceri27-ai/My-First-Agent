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
  // A site counts as "under contract" either directly (contractId, the Agreement's own Sites section)
  // or per-trade (a Vendor & Agreement assignment on the site itself) -- mirrors syncContractSiteCount's
  // definition of which sites belong to a contract, so this filter doesn't hide sites linked the older way.
  const sites = allSites.filter((s) => s.contractId != null || s.tradeAssignments.some((a) => a.contractId != null));

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
