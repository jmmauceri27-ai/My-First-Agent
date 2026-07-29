"use client";

import { usePathname } from "next/navigation";
import BackgroundArt from "./BackgroundArt";
import NavBar from "./NavBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== "/login";
  const isWide = pathname === "/crm" || pathname === "/procurement";
  const isFullBleed = pathname === "/procurement";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <BackgroundArt />
      {showNav && <NavBar />}
      <main
        className={`mx-auto flex w-full flex-1 flex-col ${
          isFullBleed ? "h-[calc(100vh-3.75rem)] overflow-hidden px-0 py-0" : "px-4 py-6"
        } ${isWide ? "max-w-none" : "max-w-6xl"}`}
      >
        {children}
      </main>
    </div>
  );
}
