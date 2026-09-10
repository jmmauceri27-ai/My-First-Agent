"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import BackgroundArt from "./BackgroundArt";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== "/login";
  const isNetworkMapRoute = pathname === "/network" || pathname === "/network/sites";
  const isSiteDetailRoute = (pathname ?? "").startsWith("/network/sites/");
  const isWide = pathname === "/crm" || isNetworkMapRoute || isSiteDetailRoute;
  const isFullBleed = isNetworkMapRoute;

  return (
    <div className="relative isolate flex h-screen flex-col bg-background">
      <BackgroundArt />

      {showNav && (
        <header className="flex shrink-0 items-center border-b border-purple-500/15 bg-white/85 px-4 py-2 backdrop-blur-md dark:bg-[#0a070f]/85">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dvm-logo.png" alt="DVM Facility Services" className="h-7 w-auto" />
          </Link>
        </header>
      )}

      <div className="flex min-h-0 flex-1">
        {showNav && (
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
        )}
        <main
          className={`mx-auto flex w-full flex-1 flex-col overflow-y-auto ${
            isFullBleed ? "min-h-0 overflow-hidden px-0 py-0" : "px-4 py-6"
          } ${isWide ? "max-w-none" : "max-w-6xl"}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
