"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== "/login";
  const isWide = pathname === "/crm";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      {showNav && <NavBar />}
      <main
        className={`mx-auto flex w-full flex-1 flex-col px-4 py-6 ${isWide ? "max-w-none" : "max-w-6xl"}`}
      >
        {children}
      </main>
    </div>
  );
}
