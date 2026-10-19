import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";
import { getSetting } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const b = await getSetting("brand");
  return {
    title: { default: `${b.siteName} | ${b.wing}`, template: `%s | ${b.siteName}` },
    description: `${b.tagline}. A Bible education service of ${b.ministry}.`,
    applicationName: b.siteName,
    icons: { icon: [{ url: "/icons/favicon-svg", type: "image/svg+xml" }, { url: "/icons/favicon-32", sizes: "32x32", type: "image/png" }, { url: "/favicon.ico", sizes: "48x48" }], apple: "/icons/apple-180" },
    manifest: "/manifest.webmanifest",
    openGraph: { title: b.siteName, description: b.tagline, siteName: b.siteName, type: "website" },
  };
}
export const viewport: Viewport = { themeColor: "#0b1f4b", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const b = await getSetting("brand");
  const style = { "--color-royal": b.primary, "--color-navy": b.secondary, "--color-gold": b.accent, "--color-leaf": b.leaf, "--color-ivory": b.ivory } as CSSProperties;
  return (
    <html lang="en" style={style}>
      <body>{children}</body>
    </html>
  );
}
