import Link from "next/link";

const LINKS = [
  { href: "/network", label: "Vendors", key: "vendors" },
  { href: "/network/clients", label: "Clients", key: "clients" },
  { href: "/network/sites", label: "Sites", key: "sites" },
  { href: "/network/employees", label: "Employees", key: "employees" },
] as const;

export default function NetworkNav({ active }: { active: "vendors" | "clients" | "sites" | "employees" }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-purple-400/10 pb-2">
      {LINKS.map((link) => {
        const isActive = link.key === active;
        return (
          <Link
            key={link.key}
            href={link.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              isActive
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                : "text-slate-400 hover:bg-purple-500/10 hover:text-slate-50"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
