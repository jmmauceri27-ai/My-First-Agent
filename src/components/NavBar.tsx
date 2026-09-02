"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/crm", label: "CRM" },
  { href: "/network", label: "Network" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/proposals", label: "Proposal Assistant" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-purple-500/15 bg-[#0a070f]/85 backdrop-blur-md">
      <div className="h-1 bg-gradient-to-r from-brand-700 via-brand-400 to-purple-300" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-50">
          <span className="text-lg">🛠️</span> Facility Maintenance Dashboard
        </span>

        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/40"
                    : "text-slate-400 hover:bg-purple-500/10 hover:text-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
