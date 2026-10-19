"use server";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { authenticate } from "@/server/services/auth";
import { createSession, destroySession, requestCtx, getSession } from "@/server/auth/session";
import { requireDeveloper, verifyTotp, SOFTNET_NAME } from "@/server/softnet";
import { audit } from "@/server/audit";
import { setSetting } from "@/server/settings";
import { rateLimit } from "@/server/rate-limit";
import { requireAdmin, actorOf } from "@/server/guards";
import type { ActionResult } from "@/components/forms";
import { revalidatePath } from "next/cache";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function softnetLoginAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requestCtx();
  if (!(await rateLimit(`softnet:${ctx.ip ?? "x"}`, 10, 900))) return { error: "Too many attempts. Please wait." };
  const r = await authenticate(str(f, "identifier"), String(f.get("password") ?? ""), ctx);
  const generic = "Those details were not accepted.";
  if (!r.ok) return { error: generic };
  const u = r.user;
  const db = await getDb();
  if (u.role !== "developer_admin" || !u.totpEnabled || !u.totpSecret || !verifyTotp(u.totpSecret, str(f, "code"))) {
    await audit({ id: u.id, label: u.fullName, role: u.role, ip: ctx.ip }, "softnet.login_failed", { type: "user", id: u.id }, {}, { plane: "softnet" });
    return { error: generic };
  }
  await createSession(u.id, { remember: false, mfaOk: true }, ctx);
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, u.id));
  await audit({ id: u.id, label: u.fullName, role: u.role, ip: ctx.ip }, "softnet.login", { type: "user", id: u.id }, {}, { plane: "softnet" });
  redirect("/softnet");
}

export async function softnetLogoutAction() { await destroySession(); redirect("/softnet/login"); }

/** Suspend or restore the whole application (maintenance mode). Needs a written reason and is audited on the developer plane. */
export async function appStateAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await requireDeveloper();
  const suspend = str(f, "to") === "suspend";
  const reason = str(f, "reason");
  if (reason.length < 10) return { error: "Write a clear reason (at least 10 characters). It is recorded." };
  await setSetting("maintenance", { suspended: suspend, message: str(f, "message") || "This service is temporarily unavailable. Please check back soon." }, s.user.id);
  await audit({ id: s.user.id, label: s.user.fullName, role: s.user.role, ip: (await requestCtx()).ip }, suspend ? "softnet.app_suspend" : "softnet.app_restore", undefined, { reason }, { plane: "softnet" });
  revalidatePath("/", "layout");
  return { ok: true, message: suspend ? "The application is now suspended for the public." : "The application is live again." };
}

export async function noteAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await requireDeveloper();
  const note = str(f, "note");
  if (note.length < 5) return { error: "Write the intervention note." };
  await audit({ id: s.user.id, label: s.user.fullName, role: s.user.role }, "softnet.intervention_note", undefined, { note }, { plane: "softnet" });
  revalidatePath("/softnet");
  return { ok: true, message: "Recorded." };
}

/** The ministry owner can withdraw a developer administrator's access at any time. */
export async function revokeDeveloperAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireAdmin("users.manage");
  if (u.role !== "super_admin") return { error: "Only the Super Admin can revoke developer access." };
  const db = await getDb();
  const id = str(f, "id");
  await db.update(schema.users).set({ status: "deactivated", totpEnabled: false, totpSecret: null }).where(eq(schema.users.id, id));
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.userId, id));
  await audit(await actorOf(u), "softnet.developer_revoked", { type: "user", id });
  revalidatePath("/admin/integrations");
  return { ok: true, message: "Developer access revoked." };
}

void sql; void getSession; void SOFTNET_NAME;
