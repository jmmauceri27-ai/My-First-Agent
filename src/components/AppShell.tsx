"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== "/login";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      {showNav && <NavBar />}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
