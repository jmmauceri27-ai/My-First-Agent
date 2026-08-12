export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { listCompanies, listOpportunities } from "@/lib/crmDal";
import { getSite, listVendors } from "@/lib/networkDal";
import SiteDetailClient from "./SiteDetailClient";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const [companies, vendors, opportunities] = await Promise.all([listCompanies(), listVendors(), listOpportunities()]);

  return <SiteDetailClient site={site} companies={companies} vendors={vendors} opportunities={opportunities} />;
}
