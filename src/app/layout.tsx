import type { Metadata, Viewport } from "next";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fantasy Draft Hub",
  description: "Personal fantasy football draft prep: rankings, tiers, notes, and a live draft-day tracker.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#166030",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:pb-10">{children}</main>
      </body>
    </html>
  );
}
