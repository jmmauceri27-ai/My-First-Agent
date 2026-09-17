export const dynamic = "force-dynamic";

import { listCompanies, listContacts, listContracts, listOpportunities } from "@/lib/crmDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import { listSiteFilterTemplates, listSites, listVendors } from "@/lib/networkDal";
import SitesClient from "./SitesClient";

export default async function SitesPage() {
  const [sites, companies, vendors, opportunities, contracts, contacts, filterTemplates, fieldClasses] =
    await Promise.all([
      listSites(),
      listCompanies(),
      listVendors(),
      listOpportunities(),
      listContracts(),
      listContacts(),
      listSiteFilterTemplates(),
      listFieldClasses(),
    ]);

  return (
    <SitesClient
      sites={sites}
      companies={companies}
      vendors={vendors}
      opportunities={opportunities}
      contracts={contracts}
      contacts={contacts}
      filterTemplates={filterTemplates}
      fieldClasses={fieldClasses}
    />
  );
}
