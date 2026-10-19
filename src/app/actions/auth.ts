"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { createSession, destroySession, requestCtx, revokeAllSessions, COOKIE } from "@/server/auth/session";
import { authenticate, changePassword, createChildByParent, linkChild, redeemScholarshipKey, registerUser, requestPasswordReset, resetPasswordWithToken } from "@/server/services/auth";
import { requireUser, safeNext, actorOf } from "@/server/guards";
import { homeFor } from "@/lib/permissions";
import { cookies } from "next/headers";
import { audit } from "@/server/audit";
import type { ActionResult } from "@/components/forms";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const raw = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function loginAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requestCtx();
  const r = await authenticate(str(f, "identifier"), raw(f, "password"), ctx);
  if (!r.ok) return { error: r.error };
  if (r.user.role === "developer_admin") return { error: "Incorrect username/email or password." }; // developers use their own sign-in
  await createSession(r.user.id, { remember: f.get("remember") === "on" }, ctx);
  if (r.user.mustChangePassword) redirect("/account/password?first=1");
  redirect(safeNext(str(f, "next")) ?? homeFor(r.user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function registerAction(type: "student" | "parent" | "teacher" | "org_admin", _: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requestCtx();
  if (raw(f, "password") !== raw(f, "confirm")) return { error: "The two passwords do not match." };
  if (f.get("terms") !== "on") return { error: "Please accept the terms and privacy notice to continue." };
  if (str(f, "website")) return { error: "Could not submit the form." }; // honeypot: real people leave this empty
  const r = await registerUser({
    type, fullName: str(f, "fullName"), displayName: str(f, "displayName") || undefined, email: str(f, "email") || undefined, username: str(f, "username") || undefined, password: raw(f, "password"),
    phone: str(f, "phone") || undefined, classLevelSlug: str(f, "classLevelSlug") || undefined, ageBand: str(f, "ageBand") || undefined, relationship: str(f, "relationship") || undefined,
    teachingRole: str(f, "teachingRole") || undefined, orgName: str(f, "orgName") || undefined, orgType: str(f, "orgType") || undefined, country: str(f, "country") || undefined,
    accessKey: str(f, "accessKey") || undefined, guardianConsent: f.get("guardian") === "on",
    orgId: str(f, "orgId") || undefined,
  }, ctx);
  if (!r.ok) return { error: r.error };
  await createSession(r.userId, { remember: false }, ctx);
  redirect(r.pendingApproval ? "/account/pending" : homeFor(type));
}

export async function forgotAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const ctx = await requestCtx();
  await requestPasswordReset(str(f, "identifier"), ctx);
  // Identical response whether or not an account exists.
  return { ok: true, message: "If an account with that email exists, we have sent a reset link. It works once and expires in 30 minutes." };
}

export async function resetAction(token: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  if (raw(f, "password") !== raw(f, "confirm")) return { error: "The two passwords do not match." };
  const r = await resetPasswordWithToken(token, raw(f, "password"), await requestCtx());
  if (!r.ok) return { error: r.error };
  redirect("/login?reset=1");
}

export async function changePasswordAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(undefined, { allowPasswordChange: true, allowPending: true });
  if (raw(f, "password") !== raw(f, "confirm")) return { error: "The two new passwords do not match." };
  const first = u.mustChangePassword;
  const r = await changePassword(u.id, first ? null : raw(f, "current"), raw(f, "password"), await requestCtx());
  if (!r.ok) return { error: r.error };
  // Other devices are signed out; this session continues.
  const tok = (await cookies()).get(COOKIE)?.value;
  await revokeAllSessions(u.id, tok);
  if (first) redirect(homeFor(u.role));
  return { ok: true, message: "Your password has been changed and other devices were signed out." };
}

export async function linkChildAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(["parent"]);
  const r = await linkChild(u.id, str(f, "username"), str(f, "code"));
  if (!r.ok) return { error: r.error };
  redirect("/parent");
}

export async function createChildAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(["parent"]);
  if (raw(f, "password") !== raw(f, "confirm")) return { error: "The two passwords do not match." };
  if (f.get("guardian") !== "on") return { error: "Please confirm that you agree to the child privacy notice as the parent or guardian." };
  const r = await createChildByParent({ id: u.id, orgId: u.orgId }, { fullName: str(f, "fullName"), username: str(f, "username"), password: raw(f, "password"), classLevelSlug: str(f, "classLevelSlug"), ageBand: str(f, "ageBand") || undefined });
  if (!r.ok) return { error: r.error };
  redirect("/parent");
}

export async function redeemKeyAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser();
  const r = await redeemScholarshipKey(u.id, str(f, "key"));
  if (!r.ok) return { error: r.error };
  return { ok: true, message: `Access granted for ${r.days} days.` };
}

/** Self-service privacy requests: export a copy of my data, or ask for deletion (handled by an administrator). */
export async function requestDataAction(kind: "export" | "deletion", _: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(undefined, { allowPending: true });
  const db = await getDb();
  const open = await db.select().from(schema.dataRequests).where(and(eq(schema.dataRequests.userId, u.id), eq(schema.dataRequests.kind, kind), eq(schema.dataRequests.status, "open")));
  if (open.length) return { error: "You already have an open request of this kind." };
  await db.insert(schema.dataRequests).values({ userId: u.id, kind, note: str(f, "note").slice(0, 500) });
  if (kind === "deletion") await db.update(schema.users).set({ deletionRequestedAt: new Date() }).where(eq(schema.users.id, u.id));
  await audit(await actorOf(u), `privacy.${kind}_request`, { type: "user", id: u.id });
  return { ok: true, message: kind === "export" ? "Request received. You can also download your data right now from this page." : "Deletion request received. An administrator will contact you to confirm. Payment records may be kept as the law requires." };
}
