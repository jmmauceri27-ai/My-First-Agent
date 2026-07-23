"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/upload", label: "Upload Data" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/builder", label: "Dashboard Builder" },
  { href: "/explorer", label: "Data Explorer" },
  { href: "/crm", label: "CRM" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="h-1 bg-gradient-to-r from-brand-500 via-[#1baf7a] to-[#eda100]" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
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
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 dark:bg-brand-500"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
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
