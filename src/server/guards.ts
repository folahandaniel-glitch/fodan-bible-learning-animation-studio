import "server-only";
import { redirect } from "next/navigation";
import { getSession, requestCtx, type SessionUser } from "./auth/session";
import { can, homeFor, type Perm } from "@/lib/permissions";
import type { Actor } from "./audit";
import type { Role } from "./db/schema";
import { getSetting } from "./settings";

export const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : null);

interface Opts { next?: string; allowPasswordChange?: boolean; allowPending?: boolean }

/** Server-side gate. Call at the top of EVERY protected page and action: layouts are not re-run on client navigation. */
export async function requireUser(roles?: Role[], opts: Opts = {}): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect(`/login${opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""}`);
  const u = s.user;
  if (u.mustChangePassword && !opts.allowPasswordChange) redirect("/account/password?first=1");
  if (u.status === "pending" && !opts.allowPending) redirect("/account/pending");
  if (roles && !roles.includes(u.role)) redirect(homeFor(u.role));
  return u;
}

export async function requireAdmin(perm?: Perm): Promise<SessionUser> {
  const u = await requireUser(["super_admin", "curriculum_admin", "content_editor", "media_admin", "finance_admin"]);
  if (!can(u.role, "admin.access") || (perm && !can(u.role, perm))) redirect("/admin?denied=1");
  return u;
}

export async function optionalUser() {
  return (await getSession())?.user ?? null;
}

export async function actorOf(u: SessionUser | null): Promise<Actor> {
  const ctx = await requestCtx();
  return { id: u?.id ?? null, label: u?.fullName, role: u?.role, ip: ctx.ip };
}

/** Maintenance / suspension switch (set from the developer control plane). */
export async function suspended() {
  return (await getSetting("maintenance")).suspended;
}
