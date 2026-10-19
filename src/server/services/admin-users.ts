import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, type Actor } from "../audit";
import { hashPassword, passwordProblem } from "../auth/password";
import { friendlyCode, randomToken, temporaryPassword } from "../crypto";
import { makeAlias, normUser } from "./auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "../db/schema";

export interface Admin { id: string; role: Role }
const ASSIGNABLE: Role[] = ["super_admin", "curriculum_admin", "content_editor", "teacher", "parent", "student", "org_admin", "finance_admin", "media_admin"];
export const assignableRoles = () => ASSIGNABLE.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

/** Creates an account with a one-time TEMPORARY password. The person must replace it at first sign-in. The password is never stored in plain text. */
export async function adminCreateUser(actor: Actor, admin: Admin, input: { fullName: string; email?: string; username?: string; role: Role; orgId?: string; classLevelSlug?: string }) {
  if (!can(admin.role, "users.manage")) throw new Error("Not allowed.");
  if (!ASSIGNABLE.includes(input.role)) throw new Error("That role cannot be assigned here.");
  const email = input.email?.trim().toLowerCase() || null;
  const username = input.username ? normUser(input.username) : null;
  if (!email && !username) throw new Error("Enter an email address or a username.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  const db = await getDb();
  if (email && (await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.email}) = ${email}`)).length) throw new Error("That email is already registered.");
  if (username && (await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.username}) = ${username}`)).length) throw new Error("That username is taken.");
  const temp = temporaryPassword();
  const [u] = await db.insert(schema.users).values({
    email, username, fullName: input.fullName.trim(), displayName: input.fullName.trim().split(" ")[0], gameAlias: makeAlias(), passwordHash: await hashPassword(temp), role: input.role,
    status: "active", mustChangePassword: true, orgId: input.orgId || null, classLevelSlug: input.classLevelSlug || null, linkCode: input.role === "student" ? friendlyCode(2, 4) : null,
  }).returning();
  await audit(actor, "user.create", { type: "user", id: u.id }, { role: u.role });
  return { user: u, temporaryPassword: temp }; // shown once to the administrator, then gone
}

export async function setUserStatus(actor: Actor, admin: Admin, userId: string, status: "active" | "suspended" | "deactivated") {
  if (!can(admin.role, "users.manage")) throw new Error("Not allowed.");
  if (userId === admin.id) throw new Error("You cannot change your own status.");
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u) throw new Error("User not found.");
  if (u.role === "developer_admin") throw new Error("Developer administrators are managed in the developer control plane only.");
  if (u.role === "super_admin" && status !== "active") {
    const supers = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.role, "super_admin"), eq(schema.users.status, "active")));
    if (supers.length <= 1) throw new Error("There must always be at least one active Super Admin.");
  }
  await db.update(schema.users).set({ status, updatedAt: new Date() }).where(eq(schema.users.id, userId));
  if (status !== "active") await db.update(schema.sessions).set({ revokedAt: new Date() }).where(and(eq(schema.sessions.userId, userId), sql`${schema.sessions.revokedAt} is null`));
  if (status === "active" && u.role === "org_admin" && u.orgId) await db.update(schema.organizations).set({ status: "active" }).where(eq(schema.organizations.id, u.orgId));
  await audit(actor, `user.${status}`, { type: "user", id: userId }, { was: u.status });
}

export async function changeRole(actor: Actor, admin: Admin, userId: string, role: Role) {
  if (admin.role !== "super_admin") throw new Error("Only the Super Admin can change roles.");
  if (!ASSIGNABLE.includes(role)) throw new Error("That role cannot be assigned here.");
  if (userId === admin.id) throw new Error("You cannot change your own role.");
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u || u.role === "developer_admin") throw new Error("User not found.");
  if (u.role === "super_admin") {
    const supers = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.role, "super_admin"), eq(schema.users.status, "active")));
    if (supers.length <= 1) throw new Error("There must always be at least one active Super Admin.");
  }
  await db.update(schema.users).set({ role, updatedAt: new Date() }).where(eq(schema.users.id, userId));
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(and(eq(schema.sessions.userId, userId), sql`${schema.sessions.revokedAt} is null`));
  await audit(actor, "user.role_change", { type: "user", id: userId }, { from: u.role, to: role });
}

export async function issueTemporaryPassword(actor: Actor, admin: Admin, userId: string) {
  if (!can(admin.role, "users.manage")) throw new Error("Not allowed.");
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u || u.role === "developer_admin" || (u.role === "super_admin" && admin.role !== "super_admin")) throw new Error("Not allowed.");
  const temp = temporaryPassword();
  await db.update(schema.users).set({ passwordHash: await hashPassword(temp), mustChangePassword: true, failedLogins: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(schema.users.id, userId));
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(and(eq(schema.sessions.userId, userId), sql`${schema.sessions.revokedAt} is null`));
  await audit(actor, "user.temp_password", { type: "user", id: userId });
  return temp;
}

export async function setUserOrg(actor: Actor, admin: Admin, userId: string, orgId: string | null) {
  if (!can(admin.role, "users.manage")) throw new Error("Not allowed.");
  const db = await getDb();
  await db.update(schema.users).set({ orgId, updatedAt: new Date() }).where(eq(schema.users.id, userId));
  await audit(actor, "user.set_org", { type: "user", id: userId }, { orgId });
}

/**
 * Privacy deletion: removes learning records and personal details, keeps payment records (financial record-keeping)
 * attached to an anonymised account. Done only on an administrator's confirmation.
 */
export async function eraseUser(actor: Actor, admin: Admin, userId: string) {
  if (!can(admin.role, "privacy.handle")) throw new Error("Not allowed.");
  if (userId === admin.id) throw new Error("You cannot erase your own account.");
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u || u.role === "developer_admin") throw new Error("User not found.");
  await db.transaction(async (tx) => {
    const attempts = (await tx.select({ id: schema.examAttempts.id }).from(schema.examAttempts).where(eq(schema.examAttempts.userId, userId))).map((a) => a.id);
    if (attempts.length) { await tx.delete(schema.examResponses).where(inArray(schema.examResponses.attemptId, attempts)); await tx.delete(schema.examAttempts).where(inArray(schema.examAttempts.id, attempts)); }
    await tx.delete(schema.lessonProgress).where(eq(schema.lessonProgress.userId, userId));
    await tx.delete(schema.gameSessions).where(eq(schema.gameSessions.userId, userId));
    await tx.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
    await tx.delete(schema.parentLinks).where(sql`${schema.parentLinks.parentId} = ${userId} OR ${schema.parentLinks.studentId} = ${userId}`);
    await tx.delete(schema.groupStudents).where(eq(schema.groupStudents.studentId, userId));
    await tx.delete(schema.groupTeachers).where(eq(schema.groupTeachers.teacherId, userId));
    await tx.delete(schema.trainingProgress).where(eq(schema.trainingProgress.userId, userId));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await tx.delete(schema.passwordResets).where(eq(schema.passwordResets.userId, userId));
    await tx.update(schema.users).set({ email: null, username: null, fullName: "Deleted user", displayName: "Deleted user", gameAlias: null, phone: null, linkCode: null, passwordHash: await hashPassword(randomToken(24)), status: "deactivated", classLevelSlug: null, ageBand: null, totpSecret: null, totpEnabled: false, updatedAt: new Date() }).where(eq(schema.users.id, userId));
    await tx.update(schema.dataRequests).set({ status: "done", handledAt: new Date() }).where(and(eq(schema.dataRequests.userId, userId), eq(schema.dataRequests.kind, "deletion")));
  });
  await audit(actor, "privacy.erase_user", { type: "user", id: userId }, { role: u.role });
}
