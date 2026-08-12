"use client";

import { usePathname } from "next/navigation";
import BackgroundArt from "./BackgroundArt";
import NavBar from "./NavBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== "/login";
  const isNetworkMapRoute = pathname === "/network" || pathname === "/network/sites";
  const isWide = pathname === "/crm" || isNetworkMapRoute;
  const isFullBleed = isNetworkMapRoute;

  return (
    <div
      className={`relative isolate flex flex-col bg-background ${
        isFullBleed ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      <BackgroundArt />
      {showNav && <NavBar />}
      <main
        className={`mx-auto flex w-full flex-1 flex-col ${
          isFullBleed ? "min-h-0 overflow-hidden px-0 py-0" : "px-4 py-6"
        } ${isWide ? "max-w-none" : "max-w-6xl"}`}
      >
        {children}
      </main>
    </div>
  );
}
