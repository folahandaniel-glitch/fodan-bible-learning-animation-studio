import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { getSetting } from "../settings";
import { EMAIL_DEFAULTS } from "@/content/email-defaults";

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderTemplate(text: string, vars: Record<string, string>, html: boolean) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? (html ? esc(vars[k]) : vars[k]) : ""));
}

function layout(title: string, bodyText: string, brand: { siteName: string; ministry: string }) {
  const paras = esc(bodyText).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`).join("")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1747B5">$1</a>');
  return `<div style="background:#FFF8E7;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#0B1F4B"><div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eadfbd"><div style="background:#0B1F4B;color:#FFF8E7;padding:18px 24px;font-size:18px;font-weight:700">${esc(brand.siteName)}</div><div style="padding:24px"><h2 style="margin:0 0 14px;font-size:20px">${esc(title)}</h2>${paras}</div><div style="padding:14px 24px;background:#f6efd8;font-size:12px;color:#5b6785">${esc(brand.ministry)}</div></div></div>`;
}

/** Sends (or, when no provider is configured, HOLDS) a branded template e-mail. Nothing is ever recorded as sent unless the provider accepted it. */
export async function sendTemplate(key: string, to: string, vars: Record<string, string>) {
  const db = await getDb();
  const brand = await getSetting("brand");
  const [row] = await db.select().from(schema.emailTemplates).where(eq(schema.emailTemplates.key, key));
  const def = EMAIL_DEFAULTS.find((d) => d.key === key);
  const subjectT = row?.subject ?? def?.subject ?? "Notice";
  const bodyT = row?.body ?? def?.body ?? "{{message}}";
  const all = { siteName: brand.siteName, ...vars };
  const subject = renderTemplate(subjectT, all, false);
  const html = layout(subject, renderTemplate(bodyT, all, false), brand);
  // Reset/verification links are secrets: never keep them where an administrator could read them.
  const sensitive = key === "password_reset" || key === "verify";
  const [out] = await db.insert(schema.emailOutbox).values({ toEmail: to, templateKey: key, subject, html: sensitive ? "[content not stored: contains a one-time link]" : html, status: "held" }).returning();
  if (!emailConfigured()) return { id: out.id, status: "held" as const };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [to], subject, html }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
    await db.update(schema.emailOutbox).set({ status: "sent", providerId: data.id ?? null, sentAt: new Date() }).where(eq(schema.emailOutbox.id, out.id));
    return { id: out.id, status: "sent" as const };
  } catch (e) {
    await db.update(schema.emailOutbox).set({ status: "failed", error: (e as Error).message.slice(0, 300) }).where(eq(schema.emailOutbox.id, out.id));
    return { id: out.id, status: "failed" as const };
  }
}
