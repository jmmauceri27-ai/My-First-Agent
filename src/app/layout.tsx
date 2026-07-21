import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

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
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${oswald.variable}`}>
      <body className="font-sans antialiased">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:pb-10">{children}</main>
      </body>
    </html>
  );
}
