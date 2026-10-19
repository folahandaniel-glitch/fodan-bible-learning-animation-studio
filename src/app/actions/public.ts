"use server";
import { getDb, schema } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { requestCtx } from "@/server/auth/session";
import type { ActionResult } from "@/components/forms";

export async function contactAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requestCtx();
  if (String(f.get("website") ?? "").trim()) return { ok: true, message: "Thank you. Your message has been sent." }; // honeypot: pretend success, store nothing
  if (!(await rateLimit(`contact:${ctx.ip ?? "x"}`, 5, 3600))) return { error: "You have sent several messages recently. Please wait a while and try again." };
  const name = String(f.get("name") ?? "").trim().slice(0, 100), email = String(f.get("email") ?? "").trim().slice(0, 160), message = String(f.get("message") ?? "").trim().slice(0, 3000);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 5) return { error: "Please enter your name, a valid email and a message." };
  const db = await getDb();
  await db.insert(schema.enquiries).values({ name, email, subject: String(f.get("subject") ?? "").trim().slice(0, 160) || null, message });
  return { ok: true, message: "Thank you. Your message has been sent and we will reply as soon as we can." };
}
