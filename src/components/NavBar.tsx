"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/players", label: "Players", icon: "📋" },
  { href: "/board", label: "Tier Board", icon: "🗂️" },
  { href: "/draft", label: "Draft Day", icon: "🎯" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-gridiron-600 dark:text-gridiron-100">
            🏈 Draft Hub
          </Link>
          <div className="hidden gap-1 sm:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-gridiron-500 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-ink-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur sm:hidden dark:border-ink-800 dark:bg-ink-950/95">
        <div className="flex justify-around">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-gridiron-600 dark:text-gridiron-100" : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
