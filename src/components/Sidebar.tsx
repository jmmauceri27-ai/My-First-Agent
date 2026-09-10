"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DASHBOARD_CATEGORIES } from "@/lib/dashboardDefinitions";
import ThemeToggle from "./ThemeToggle";

interface SubLink {
  href: string;
  label: string;
}

interface Area {
  href: string;
  label: string;
  icon: string;
  subLinks?: SubLink[];
}

const AREAS: Area[] = [
  { href: "/", label: "Overview", icon: "🏠" },
  {
    href: "/crm",
    label: "CRM",
    icon: "💼",
    subLinks: [
      { href: "/crm", label: "Pipeline" },
      { href: "/crm/contracts", label: "Contracts" },
      { href: "/crm/companies", label: "Companies" },
      { href: "/crm/contacts", label: "Contacts" },
      { href: "/crm/fields", label: "Fields" },
    ],
  },
  {
    href: "/network",
    label: "Network",
    icon: "🌐",
    subLinks: [
      { href: "/network", label: "Vendors" },
      { href: "/network/clients", label: "Clients" },
      { href: "/network/sites", label: "Sites" },
      { href: "/network/employees", label: "Employees" },
    ],
  },
  {
    href: "/dashboards",
    label: "Dashboards",
    icon: "📊",
    subLinks: DASHBOARD_CATEGORIES.map((category) => ({
      href: `/dashboards?area=${encodeURIComponent(category)}`,
      label: category,
    })),
  },
  { href: "/proposals", label: "Proposal Assistant", icon: "📋" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeDashboardArea = searchParams.get("area");

  return (
    <aside className="z-20 flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-purple-500/15 bg-white py-3 dark:bg-[#0a070f]">
      {AREAS.map((area) => {
        const active = area.href === "/" ? pathname === area.href : pathname.startsWith(area.href);
        return (
          <div key={area.href} className="group relative w-full px-2">
            <Link
              href={area.href}
              title={area.label}
              className={`flex h-12 w-full items-center justify-center rounded-lg text-xl transition-all ${
                active
                  ? "bg-brand-600 shadow-sm shadow-brand-600/40"
                  : "hover:bg-purple-500/10 dark:hover:bg-purple-500/15"
              }`}
            >
              {area.icon}
            </Link>

            {area.subLinks && (
              <div className="invisible absolute left-full top-0 z-30 pl-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
                <div className="w-52 rounded-xl border border-purple-200 bg-white p-2 shadow-xl dark:border-purple-400/30 dark:bg-[#1c1530] dark:shadow-black/50">
                  <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {area.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {area.subLinks.map((link) => {
                      const isDashboardLink = link.href.startsWith("/dashboards?area=");
                      const subActive = isDashboardLink
                        ? pathname === "/dashboards" && activeDashboardArea === link.label
                        : pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`truncate rounded-lg px-2 py-1.5 text-sm font-medium transition-all ${
                            subActive
                              ? "bg-brand-600 text-white"
                              : "text-slate-600 hover:bg-purple-500/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeToggle />
      </div>
    </aside>
  );
}
