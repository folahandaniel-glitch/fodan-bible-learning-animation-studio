import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "../db";
import { audit, type Actor } from "../audit";
import { friendlyCode, randomToken, sha256 } from "../crypto";
import { burnVerify, hashPassword, passwordProblem, verifyPassword } from "../auth/password";
import { rateLimit } from "../rate-limit";
import { appUrl, sendTemplate } from "./email";
import { getSetting } from "../settings";
import { grantEntitlement } from "./entitlements";
import type { Role } from "../db/schema";

export const POLICY_VERSION = "2026-1";
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const normUser = (s: string) => s.trim().toLowerCase();
const ADJ = ["Brave", "Bright", "Gentle", "Joyful", "Kind", "Swift", "Wise", "Faithful", "Happy", "Strong"];
const NOUN = ["Lion", "Dove", "Eagle", "Lamb", "Star", "Olive", "Palm", "Harp", "Shepherd", "Sparrow"];
export const makeAlias = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]} ${10 + Math.floor(Math.random() * 90)}`;

export interface RegisterInput {
  type: "student" | "parent" | "teacher" | "org_admin";
  fullName: string; displayName?: string; email?: string; username?: string; password: string; phone?: string;
  classLevelSlug?: string; ageBand?: string; relationship?: string; teachingRole?: string;
  orgId?: string; orgName?: string; orgType?: string; country?: string; accessKey?: string; guardianConsent?: boolean;
}

async function consumeKey(db: DB, raw: string, want: { role: Role }) {
  const keyHash = sha256(raw.trim().toUpperCase());
  const [k] = await db.select().from(schema.accessKeys).where(eq(schema.accessKeys.keyHash, keyHash));
  if (!k || k.revokedAt || (k.expiresAt && k.expiresAt < new Date()) || k.uses >= k.maxUses) return null;
  if (k.purpose !== "registration" || (k.role && k.role !== want.role)) return null;
  return k;
}

export async function registerUser(input: RegisterInput, ctx: { ip?: string | null } = {}): Promise<Result<{ userId: string; status: string; pendingApproval: boolean; linkCode?: string | null }>> {
  const db = await getDb();
  if (!(await rateLimit(`register:${ctx.ip ?? "x"}`, 20, 3600))) return fail("Too many sign-ups from this network. Please try again later.");
  const features = await getSetting("features");
  if (!features.registrationOpen[input.type]) return fail("Registration for this account type is closed. Please contact the administrator.");
  const fullName = input.fullName.trim();
  if (fullName.length < 2) return fail("Please enter the full name.");
  const email = input.email?.trim().toLowerCase() || null;
  const username = input.username ? normUser(input.username) : null;
  if (input.type === "student" && !username) return fail("Choose a username.");
  if (input.type !== "student" && !email) return fail("An email address is required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) return fail("Usernames use 3-30 letters, numbers, dots, dashes or underscores.");
  const problem = passwordProblem(input.password, input.type as Role, [fullName.split(" ")[0], username ?? "", email?.split("@")[0] ?? ""]);
  if (problem) return fail(problem);
  if (input.type === "student" && !input.guardianConsent) return fail("A parent or guardian must agree to the child privacy notice.");
  if (!input.classLevelSlug && input.type === "student") return fail("Choose a class.");

  if (email) {
    const dup = await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.email}) = ${email}`);
    if (dup.length) return fail("That email or username is already in use. Try signing in instead.");
  }
  if (username) {
    const dup = await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.username}) = ${username}`);
    if (dup.length) return fail("That email or username is already in use. Try signing in instead.");
  }

  let orgId = input.orgId ?? null;
  let key: typeof schema.accessKeys.$inferSelect | null = null;
  if (input.accessKey?.trim()) {
    key = await consumeKey(db, input.accessKey, { role: input.type as Role });
    if (!key) return fail("That access code is not valid (it may be expired, used up or for another account type).");
    if (key.orgId) orgId = key.orgId;
  }
  if (input.type === "org_admin") orgId = null;

  const passwordHash = await hashPassword(input.password);
  const pendingApproval = (input.type === "teacher" && !key) || input.type === "org_admin";
  const status = pendingApproval ? "pending" : "active";

  const created = await db.transaction(async (tx) => {
    if (input.type === "org_admin") {
      const name = input.orgName?.trim();
      if (!name) throw new Error("Enter the church or school name.");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "x");
      const [org] = await tx.insert(schema.organizations).values({ name, slug, type: input.orgType ?? "church", status: "pending", contactEmail: email, country: input.country ?? null }).returning();
      orgId = org.id;
    }
    const [u] = await tx.insert(schema.users).values({
      email, username, fullName, displayName: input.displayName?.trim() || fullName.split(" ")[0], gameAlias: makeAlias(), passwordHash,
      role: input.type, status, orgId, classLevelSlug: input.classLevelSlug ?? null, ageBand: input.ageBand ?? null, phone: input.phone ?? null,
      relationship: input.relationship ?? null, teachingRole: input.teachingRole ?? null,
      linkCode: input.type === "student" ? friendlyCode(2, 4) : null,
    }).returning();
    await tx.insert(schema.consents).values([
      { userId: u.id, kind: "terms", version: POLICY_VERSION, givenBy: input.type === "student" ? "guardian" : "self" },
      { userId: u.id, kind: "privacy", version: POLICY_VERSION, givenBy: input.type === "student" ? "guardian" : "self" },
      ...(input.type === "student" ? [{ userId: u.id, kind: "child_privacy", version: POLICY_VERSION, givenBy: "guardian" }] : []),
    ]);
    if (key) {
      const upd = await tx.update(schema.accessKeys).set({ uses: sql`${schema.accessKeys.uses} + 1` }).where(and(eq(schema.accessKeys.id, key.id), sql`${schema.accessKeys.uses} < ${schema.accessKeys.maxUses}`)).returning({ id: schema.accessKeys.id });
      if (!upd.length) throw new Error("That access code has just been used up.");
      if (key.classLevelSlug && input.type === "student") await tx.update(schema.users).set({ classLevelSlug: key.classLevelSlug }).where(eq(schema.users.id, u.id));
    }
    return u;
  }).catch((e: Error) => e);
  if (created instanceof Error) return fail(created.message);

  await audit({ id: created.id, label: created.fullName, role: created.role, ip: ctx.ip }, "user.register", { type: "user", id: created.id }, { role: created.role, status, viaKey: !!key });
  // A registration key never bypasses payment, unless it is an explicit scholarship key.
  if (email) await sendTemplate("welcome", email, { name: created.displayName, loginUrl: `${appUrl()}/login` }).catch(() => undefined);
  return { ok: true, userId: created.id, status, pendingApproval, linkCode: created.linkCode };
}

// ───────────── login ─────────────
export async function authenticate(identifier: string, password: string, ctx: { ip?: string | null }): Promise<Result<{ user: typeof schema.users.$inferSelect }>> {
  const db = await getDb();
  const id = normUser(identifier);
  if (!id || !password) return fail("Enter your username or email and your password.");
  if (!(await rateLimit(`login-ip:${ctx.ip ?? "x"}`, 40, 900)) || !(await rateLimit(`login-id:${id}`, 15, 900))) return fail("Too many attempts. Please wait a few minutes and try again.");
  const features = await getSetting("features");
  const cond = features.loginMode === "email" ? sql`lower(${schema.users.email}) = ${id}` : features.loginMode === "username" ? sql`lower(${schema.users.username}) = ${id}` : sql`(lower(${schema.users.email}) = ${id} OR lower(${schema.users.username}) = ${id})`;
  const [u] = await db.select().from(schema.users).where(cond);
  if (!u) { await burnVerify(password); await audit({ id: null, label: id, ip: ctx.ip }, "auth.login_failed", undefined, { reason: "unknown" }); return fail("Incorrect username/email or password."); }
  if (u.lockedUntil && u.lockedUntil > new Date()) return fail("This account is temporarily locked after repeated wrong passwords. Try again later or reset your password.");
  if (!(await verifyPassword(u.passwordHash, password))) {
    const n = u.failedLogins + 1;
    const lock = n >= features.maxFailedLogins;
    await db.update(schema.users).set({ failedLogins: lock ? 0 : n, lockedUntil: lock ? new Date(Date.now() + features.lockMinutes * 60_000) : u.lockedUntil }).where(eq(schema.users.id, u.id));
    await audit({ id: u.id, label: u.fullName, role: u.role, ip: ctx.ip }, "auth.login_failed", { type: "user", id: u.id }, { attempts: n, locked: lock });
    return fail("Incorrect username/email or password.");
  }
  if (u.status === "suspended" || u.status === "deactivated") return fail("This account is not active. Please contact the administrator.");
  await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.users.id, u.id));
  await audit({ id: u.id, label: u.fullName, role: u.role, ip: ctx.ip }, "auth.login", { type: "user", id: u.id });
  return { ok: true, user: u };
}

// ───────────── password reset / change ─────────────
export async function requestPasswordReset(identifier: string, ctx: { ip?: string | null }) {
  const db = await getDb();
  const id = normUser(identifier);
  if (!id || !(await rateLimit(`reset-ip:${ctx.ip ?? "x"}`, 10, 3600)) || !(await rateLimit(`reset-id:${id}`, 3, 3600))) return;
  const [u] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${id}`);
  if (!u || !u.email || u.status === "deactivated") return; // identical response either way (the caller shows a generic message)
  const token = randomToken(32);
  await db.insert(schema.passwordResets).values({ userId: u.id, tokenHash: sha256(token), purpose: "reset", expiresAt: new Date(Date.now() + 30 * 60_000) });
  await sendTemplate("password_reset", u.email, { name: u.displayName, link: `${appUrl()}/reset-password/${token}`, minutes: "30" }).catch(() => undefined);
  await audit({ id: u.id, label: u.fullName, role: u.role, ip: ctx.ip }, "auth.reset_requested", { type: "user", id: u.id });
}

export async function resetPasswordWithToken(token: string, newPassword: string, ctx: { ip?: string | null }): Promise<Result> {
  const db = await getDb();
  const [r] = await db.select().from(schema.passwordResets).where(and(eq(schema.passwordResets.tokenHash, sha256(token)), eq(schema.passwordResets.purpose, "reset"), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())));
  if (!r) return fail("This reset link is invalid or has expired. Please request a new one.");
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, r.userId));
  const problem = passwordProblem(newPassword, u.role, [u.fullName.split(" ")[0], u.username ?? "", u.email?.split("@")[0] ?? ""]);
  if (problem) return fail(problem);
  const hash = await hashPassword(newPassword);
  const claimed = await db.update(schema.passwordResets).set({ usedAt: new Date() }).where(and(eq(schema.passwordResets.id, r.id), isNull(schema.passwordResets.usedAt))).returning({ id: schema.passwordResets.id });
  if (!claimed.length) return fail("This reset link has already been used.");
  await db.update(schema.users).set({ passwordHash: hash, mustChangePassword: false, failedLogins: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(schema.users.id, u.id));
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(and(eq(schema.sessions.userId, u.id), isNull(schema.sessions.revokedAt)));
  await audit({ id: u.id, label: u.fullName, role: u.role, ip: ctx.ip }, "auth.password_reset", { type: "user", id: u.id });
  if (u.email) await sendTemplate("password_changed", u.email, { name: u.displayName }).catch(() => undefined);
  return { ok: true };
}

export async function changePassword(userId: string, current: string | null, next: string, ctx: { ip?: string | null }): Promise<Result> {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u) return fail("Account not found.");
  if (current !== null && !(await verifyPassword(u.passwordHash, current))) return fail("Your current password is not correct.");
  if (current !== null && current === next) return fail("Choose a password different from the current one.");
  const problem = passwordProblem(next, u.role, [u.fullName.split(" ")[0], u.username ?? "", u.email?.split("@")[0] ?? ""]);
  if (problem) return fail(problem);
  if (await verifyPassword(u.passwordHash, next)) return fail("Choose a password different from the current one.");
  await db.update(schema.users).set({ passwordHash: await hashPassword(next), mustChangePassword: false, updatedAt: new Date() }).where(eq(schema.users.id, userId));
  await audit({ id: u.id, label: u.fullName, role: u.role, ip: ctx.ip }, "auth.password_changed", { type: "user", id: u.id });
  if (u.email) await sendTemplate("password_changed", u.email, { name: u.displayName }).catch(() => undefined);
  return { ok: true };
}

// ───────────── parent ↔ child ─────────────
export async function linkChild(parentId: string, username: string, linkCode: string): Promise<Result<{ childName: string }>> {
  const db = await getDb();
  if (!(await rateLimit(`link:${parentId}`, 8, 3600))) return fail("Too many attempts. Try again later.");
  const [child] = await db.select().from(schema.users).where(and(sql`lower(${schema.users.username}) = ${normUser(username)}`, eq(schema.users.role, "student")));
  if (!child || !child.linkCode || child.linkCode !== linkCode.trim().toUpperCase()) return fail("We could not match that username and family link code.");
  const dup = await db.select().from(schema.parentLinks).where(and(eq(schema.parentLinks.parentId, parentId), eq(schema.parentLinks.studentId, child.id)));
  if (dup.length) return fail("This child is already linked to your account.");
  await db.insert(schema.parentLinks).values({ parentId, studentId: child.id, status: "active" });
  await audit({ id: parentId }, "parent.link_child", { type: "user", id: child.id });
  return { ok: true, childName: child.displayName };
}

export async function createChildByParent(parent: { id: string; orgId: string | null }, input: { fullName: string; username: string; password: string; classLevelSlug: string; ageBand?: string }): Promise<Result<{ childId: string }>> {
  const r = await registerUser({ type: "student", fullName: input.fullName, username: input.username, password: input.password, classLevelSlug: input.classLevelSlug, ageBand: input.ageBand, guardianConsent: true, orgId: parent.orgId ?? undefined });
  if (!r.ok) return r;
  const db = await getDb();
  await db.insert(schema.parentLinks).values({ parentId: parent.id, studentId: r.userId, status: "active" });
  await audit({ id: parent.id }, "parent.create_child", { type: "user", id: r.userId });
  return { ok: true, childId: r.userId };
}

export async function childrenOf(parentId: string) {
  const db = await getDb();
  return db.select({ id: schema.users.id, fullName: schema.users.fullName, displayName: schema.users.displayName, username: schema.users.username, classLevelSlug: schema.users.classLevelSlug, linkedAt: schema.parentLinks.createdAt })
    .from(schema.parentLinks).innerJoin(schema.users, eq(schema.users.id, schema.parentLinks.studentId))
    .where(and(eq(schema.parentLinks.parentId, parentId), eq(schema.parentLinks.status, "active"))).orderBy(schema.parentLinks.createdAt);
}
/** True only if the parent is actively linked to this student. Every parent-facing child read must pass this. */
export async function parentOwnsChild(parentId: string, studentId: string) {
  const db = await getDb();
  const r = await db.select({ id: schema.parentLinks.id }).from(schema.parentLinks).where(and(eq(schema.parentLinks.parentId, parentId), eq(schema.parentLinks.studentId, studentId), eq(schema.parentLinks.status, "active")));
  return r.length > 0;
}

// ───────────── access keys ─────────────
export async function createAccessKey(actor: Actor, input: { label: string; purpose: "registration" | "scholarship"; role?: Role; orgId?: string; planId?: string; classLevelSlug?: string; grantDays?: number; maxUses: number; expiresAt?: Date }) {
  const db = await getDb();
  const raw = friendlyCode(3, 4);
  await db.insert(schema.accessKeys).values({
    keyHash: sha256(raw), prefix: raw.slice(0, 4), label: input.label, purpose: input.purpose, role: input.role ?? null, orgId: input.orgId ?? null, planId: input.planId ?? null,
    classLevelSlug: input.classLevelSlug ?? null, grantDays: input.grantDays ?? null, maxUses: input.maxUses, expiresAt: input.expiresAt ?? null, createdBy: actor.id,
  });
  await audit(actor, "accesskey.create", { type: "accesskey" }, { label: input.label, purpose: input.purpose, role: input.role }); // the key value is never logged
  return raw; // shown once
}

/** A scholarship key grants an explicit, time-limited entitlement to an existing account. Registration keys never do. */
export async function redeemScholarshipKey(userId: string, raw: string): Promise<Result<{ days: number }>> {
  const db = await getDb();
  if (!(await rateLimit(`key:${userId}`, 10, 3600))) return fail("Too many attempts. Try again later.");
  const keyHash = sha256(raw.trim().toUpperCase());
  const [k] = await db.select().from(schema.accessKeys).where(eq(schema.accessKeys.keyHash, keyHash));
  if (!k || k.purpose !== "scholarship" || k.revokedAt || (k.expiresAt && k.expiresAt < new Date()) || k.uses >= k.maxUses) return fail("That code is not valid.");
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (k.role && k.role !== u.role) return fail("That code is not valid for your account type.");
  const upd = await db.update(schema.accessKeys).set({ uses: sql`${schema.accessKeys.uses} + 1` }).where(and(eq(schema.accessKeys.id, k.id), sql`${schema.accessKeys.uses} < ${schema.accessKeys.maxUses}`)).returning({ id: schema.accessKeys.id });
  if (!upd.length) return fail("That code has just been used up.");
  const days = k.grantDays ?? 30;
  await grantEntitlement({ id: u.id, label: u.fullName, role: u.role }, { userId: u.id, planId: k.planId ?? undefined, days, source: "scholarship", reason: `Scholarship key "${k.label}"` });
  return { ok: true, days };
}
