import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";

export const DEFAULTS = {
  brand: {
    siteName: "Fodan Bible Learning Centre",
    shortName: "FBLC",
    tagline: "Raising a Generation Grounded in God's Word",
    ministry: "Fodan Gospel Outreach",
    wing: "CROP: Child Rescue Operation Programmes",
    primary: "#1747B5", secondary: "#0B1F4B", accent: "#E3A92B", leaf: "#14877A", ivory: "#FFF8E7",
    headingFont: "serif",
  },
  contact: { email: "folahandaniel@gmail.com", phone: "", whatsapp: "2348067578112", address: "", hours: "" },
  social: { facebook: "", youtube: "", instagram: "", x: "", tiktok: "", whatsapp: "", telegram: "" },
  nav: [
    { label: "Learn", href: "/classes" },
    { label: "Stories", href: "/stories" },
    { label: "Bible", href: "/bible" },
    { label: "Timeline", href: "/timeline" },
    { label: "Ministry Wings", href: "/wings" },
    { label: "Plans", href: "/plans" },
    { label: "FAQ", href: "/faq" },
  ] as { label: string; href: string; children?: { label: string; href: string }[] }[],
  footer: {
    about: "Fodan Bible Learning Centre is a Bible education service of Fodan Gospel Outreach, serving churches, Sunday Schools, parents and students. CROP is the children's wing.",
    links: [
      { label: "Privacy notice", href: "/p/privacy" },
      { label: "Child safeguarding", href: "/p/safeguarding" },
      { label: "Terms of use", href: "/p/terms" },
      { label: "Subscription terms", href: "/p/subscription-terms" },
      { label: "Contact", href: "/contact" },
    ],
    copyright: "Fodan Gospel Outreach. All rights reserved.",
  },
  features: {
    registrationOpen: { student: true, parent: true, teacher: true, org_admin: true },
    loginMode: "both" as "both" | "email" | "username",
    bibleReaderPublic: true,
    teacherRequiresSubscription: false,
    graceDays: 0,
    requireReviewBeforePublish: false,
    maxFailedLogins: 6,
    lockMinutes: 15,
  },
  terms: [{ n: 1, name: "Term 1" }, { n: 2, name: "Term 2" }, { n: 3, name: "Term 3" }] as { n: number; name: string }[],
  logoPlacements: {} as Record<string, { light?: string; dark?: string }>,
  pageText: {} as Record<string, { kicker?: string; title?: string; subtitle?: string }>,
  maintenance: { suspended: false, message: "This service is temporarily unavailable. Please check back soon." },
  doctrine: {
    position: "This platform teaches from the Bible as the inspired Word of God and affirms the historic Christian faith. Where faithful Christians differ (for example on the timing and details of the end times), lessons present the main views fairly and say plainly that they are disputed. The ministry's approved doctrinal statement is edited by the Super Admin.",
  },
};
export type SettingKey = keyof typeof DEFAULTS;
export type Settings = typeof DEFAULTS;

const load = cache(async (): Promise<Partial<Record<string, unknown>>> => {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});

function merge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base) || typeof base !== "object") return over as T;
  const o = over as Record<string, unknown>;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(o)) out[k] = k in (base as object) ? merge((base as Record<string, unknown>)[k], o[k]) : o[k];
  return out as T;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  const all = await load();
  return merge(DEFAULTS[key], all[key]);
}

export async function setSetting(key: SettingKey, value: unknown, actorId?: string | null) {
  const db = await getDb();
  await db.insert(schema.settings).values({ key, value, updatedBy: actorId ?? null })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedBy: actorId ?? null, updatedAt: new Date() } });
}

export async function rawSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const [r] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  return (r?.value as T) ?? fallback;
}
