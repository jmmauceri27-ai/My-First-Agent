import "server-only";
import { listCompanies, listContracts, listEmployees, listOpportunities } from "./crmDal";
import { listSites, listVendors } from "./networkDal";
import type { DashboardSourceKey } from "./dashboardSources";
import type { DatasetRecord } from "./types";

/** Buckets an opportunity's amount into a fixed set of ranges, for the "Deal size" dashboard filter/breakdown. */
function dealSizeBucket(amount: number | null): string {
  if (amount === null) return "Unspecified";
  if (amount < 100_000) return "Small (< $100K)";
  if (amount < 1_000_000) return "Medium ($100K–$1M)";
  if (amount < 5_000_000) return "Large ($1M–$5M)";
  return "Extra Large ($5M+)";
}

/** Flattens each fixed dashboard source's CRM/Network entities into flat rows for kpi.ts's generic aggregations. */
export async function getSourceRows(source: DashboardSourceKey): Promise<DatasetRecord[]> {
  switch (source) {
    case "opportunities": {
      const opportunities = await listOpportunities();
      return opportunities.map((o) => ({
        trackingNumber: o.trackingNumber,
        name: o.name,
        companyName: o.companyName,
        stage: o.stage,
        amount: o.amount,
        siteCount: o.siteCount,
        trades: o.trades.join(", "),
        dealSizeBucket: dealSizeBucket(o.amount),
        expectedCloseDate: o.expectedCloseDate,
        salesManagerName: o.salesManagerName,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }));
    }

    case "contracts": {
      const contracts = await listContracts();
      return contracts.map((c) => ({
        trackingNumber: c.trackingNumber,
        name: c.name,
        companyName: c.companyName,
        workType: c.workType,
        siteCount: c.siteCount,
        rateAmount: c.rateAmount,
        rateFrequency: c.rateFrequency,
        startDate: c.startDate,
        endDate: c.endDate,
        createdAt: c.createdAt,
      }));
    }

    case "companies": {
      const companies = await listCompanies();
      return companies.map((c) => ({
        name: c.name,
        city: c.city,
        state: c.state,
        createdAt: c.createdAt,
      }));
    }

    case "employees": {
      const employees = await listEmployees();
      return employees.map((e) => ({
        name: e.name,
        department: e.department,
        title: e.title,
        createdAt: e.createdAt,
      }));
    }

    case "sites": {
      const sites = await listSites();
      return sites.map((s) => ({
        name: s.name,
        companyName: s.companyName,
        opportunityName: s.opportunityName,
        contractName:
          Array.from(new Set(s.tradeAssignments.map((a) => a.contractName).filter((n): n is string => !!n))).join(
            ", ",
          ) || null,
        siteCode: s.siteCode,
        city: s.city,
        state: s.state,
        tradeCount: s.trades.length,
        subVendorStatus: s.tradeAssignments.some((a) => a.subVendorId) ? "Assigned" : "Unassigned",
        createdAt: s.createdAt,
      }));
    }

    case "vendors": {
      const vendors = await listVendors();
      return vendors.map((v) => ({
        name: v.name,
        services: v.services,
        city: v.city,
        state: v.state,
        createdAt: v.createdAt,
      }));
    }

    case "siteTradeAssignments": {
      const sites = await listSites();
      return sites.flatMap((s) =>
        s.tradeAssignments.map((a) => ({
          siteName: s.name,
          companyName: s.companyName,
          city: s.city,
          state: s.state,
          trade: a.trade,
          vendorName: a.vendorName,
          subVendorName: a.subVendorName,
          sourcingStatus: a.subVendorId ? "Sourced" : "Unsourced",
          contractValue: a.contractValue,
          subPrice: a.subPrice,
          subVendorPrice: a.subVendorPrice,
          margin: a.contractValue !== null && a.subPrice !== null ? a.contractValue - a.subPrice : null,
        })),
      );
    }

    default: {
      const exhaustive: never = source;
      throw new Error(`Unknown dashboard source '${exhaustive}'`);
    }
  }
}
