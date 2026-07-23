import Link from "next/link";

const LINKS = [
  { href: "/crm", label: "Pipeline", key: "pipeline" },
  { href: "/crm/companies", label: "Companies", key: "companies" },
  { href: "/crm/contacts", label: "Contacts", key: "contacts" },
] as const;

export default function CrmNav({ active }: { active: "pipeline" | "companies" | "contacts" }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800">
      {LINKS.map((link) => {
        const isActive = link.key === active;
        return (
          <Link
            key={link.key}
            href={link.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              isActive
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 dark:bg-brand-500"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
