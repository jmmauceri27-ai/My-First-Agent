"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { DASHBOARD_CATEGORIES } from "@/lib/dashboardDefinitions";
import ThemeToggle from "./ThemeToggle";

interface SubLink {
  href: string;
  label: string;
}

interface Area {
  href: string;
  label: string;
  icon: ReactNode;
  subLinks?: SubLink[];
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  "aria-hidden": true,
} as const;

const AREAS: Area[] = [
  {
    href: "/crm",
    label: "CRM",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="8" width="18" height="12" rx="1.5"></rect>
        <path d="M9 8V6a3 3 0 0 1 6 0v2"></path>
      </svg>
    ),
    subLinks: [
      { href: "/crm", label: "Pipeline" },
      { href: "/crm/contracts", label: "Agreements" },
      { href: "/crm/companies", label: "Clients" },
      { href: "/crm/contacts", label: "Contacts" },
      { href: "/crm/fields", label: "Fields" },
    ],
  },
  {
    href: "/network",
    label: "Network",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9"></circle>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="12" y1="3" x2="12" y2="21"></line>
      </svg>
    ),
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
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="4" y="4" width="7" height="7" rx="1"></rect>
        <rect x="13" y="4" width="7" height="7" rx="1"></rect>
        <rect x="4" y="13" width="7" height="7" rx="1"></rect>
        <rect x="13" y="13" width="7" height="7" rx="1"></rect>
      </svg>
    ),
    subLinks: DASHBOARD_CATEGORIES.map((category) => ({
      href: `/dashboards?area=${encodeURIComponent(category)}`,
      label: category,
    })),
  },
  {
    href: "/proposals",
    label: "Proposal Assistant",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="5" y="3" width="14" height="18" rx="1.5"></rect>
        <line x1="8" y1="8" x2="16" y2="8"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
        <line x1="8" y1="16" x2="13" y2="16"></line>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeDashboardArea = searchParams.get("area");

  return (
    <aside className="z-20 flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-surface-border bg-surface py-3">
      {AREAS.map((area) => {
        const active = pathname.startsWith(area.href);
        return (
          <div key={area.href} className="group relative w-full px-2">
            <Link
              href={area.href}
              title={area.label}
              className={`flex h-12 w-full items-center justify-center rounded-lg transition-all ${
                active
                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-400"
                  : "text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              {area.icon}
            </Link>

            {area.subLinks && (
              <div className="invisible absolute left-full top-0 z-[2000] pl-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
                <div className="w-52 rounded-xl border border-surface-border bg-surface p-2 shadow-xl dark:shadow-black/50">
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
                              ? "bg-brand-600 text-white dark:bg-brand-500"
                              : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-slate-50"
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
