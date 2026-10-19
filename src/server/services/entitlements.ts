import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema, type Executor } from "../db";
import { audit, type Actor } from "../audit";
import { getSetting } from "../settings";
import { isStaffRole } from "@/lib/permissions";
import type { Role } from "../db/schema";

/** Feature keys a plan can grant. Everything protected maps to one of these. */
export const FEATURES = {
  lessons: "Paid lessons and teaching notes",
  quizzes: "Lesson quizzes and practice tests",
  exams: "CBT examinations",
  stories: "Members-only Bible storybooks",
  games: "Bible games and trivia",
  timeline: "Interactive Bible timeline activities",
  downloads: "Printable materials and downloads",
  explanations: "Answer explanations",
  reports: "Progress reports",
  teacher_tools: "Teacher tools",
} as const;
export type Feature = keyof typeof FEATURES;
export const ALL_FEATURES = Object.keys(FEATURES) as Feature[];

export interface Entitlement {
  active: boolean;
  features: Set<string>;
  source: "staff" | "own" | "parent" | "organisation" | "none";
  endsAt: Date | null;
  reason?: string;
}
const NONE: Entitlement = { active: false, features: new Set(), source: "none", endsAt: null };

type Sub = typeof schema.subscriptions.$inferSelect;

/** A subscription counts only while active, started and inside its paid period (plus the configured grace days). */
export function subIsLive(s: Pick<Sub, "status" | "startsAt" | "endsAt">, now: Date, graceDays: number) {
  if (s.status !== "active") return false;
  if (s.startsAt.getTime() > now.getTime()) return false;
  return now.getTime() < s.endsAt.getTime() + graceDays * 86_400_000;
}

function merge(subs: Sub[], source: Entitlement["source"]): Entitlement {
  if (!subs.length) return NONE;
  const features = new Set<string>();
  let endsAt: Date | null = null;
  for (const s of subs) {
    for (const f of s.features) features.add(f);
    if (!endsAt || s.endsAt > endsAt) endsAt = s.endsAt;
  }
  return { active: true, features, source, endsAt };
}

async function liveSubs(db: Executor, where: ReturnType<typeof eq>, now: Date, graceDays: number) {
  const rows = await db.select().from(schema.subscriptions).where(where);
  return rows.filter((s) => subIsLive(s, now, graceDays));
}

/**
 * The single server-side source of truth for paid access.
 * Considers: account status, subscription status and dates, grace period, parent-child links and limits,
 * organisation membership, scholarships/admin grants (they are subscriptions with a source), suspension and revocation.
 */
export async function getEntitlement(userId: string, opts: { db?: Executor; now?: Date } = {}): Promise<Entitlement> {
  const db = opts.db ?? (await getDb());
  const now = opts.now ?? new Date();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u) return NONE;
  if (u.status !== "active") return { ...NONE, reason: `Account is ${u.status}.` };
  const role = u.role as Role;
  if (isStaffRole(role)) return { active: true, features: new Set(ALL_FEATURES), source: "staff", endsAt: null };
  const grace = (await getSetting("features")).graceDays;

  const own = await liveSubs(db, eq(schema.subscriptions.userId, userId), now, grace);
  if (own.length) return merge(own, "own");

  if (role === "student") {
    // A parent's family plan covers at most `maxChildren` linked children, in the order they were linked.
    const links = await db.select().from(schema.parentLinks).where(and(eq(schema.parentLinks.studentId, userId), eq(schema.parentLinks.status, "active")));
    for (const l of links) {
      const psubs = await liveSubs(db, eq(schema.subscriptions.userId, l.parentId), now, grace);
      const covering = psubs.filter((s) => s.maxChildren > 0);
      if (!covering.length) continue;
      const cap = Math.max(...covering.map((s) => s.maxChildren));
      const kids = await db.select().from(schema.parentLinks).where(and(eq(schema.parentLinks.parentId, l.parentId), eq(schema.parentLinks.status, "active"))).orderBy(asc(schema.parentLinks.createdAt), asc(schema.parentLinks.id));
      const rank = kids.findIndex((k) => k.studentId === userId);
      if (rank >= 0 && rank < cap) return merge(covering, "parent");
    }
  }
  if (u.orgId && (role === "student" || role === "teacher")) {
    const osubs = await liveSubs(db, eq(schema.subscriptions.orgId, u.orgId), now, grace);
    if (osubs.length) {
      const seatCap = Math.max(...osubs.map((s) => s.seats));
      const members = await db.select({ id: schema.users.id }).from(schema.users)
        .where(and(eq(schema.users.orgId, u.orgId), inArray(schema.users.role, ["student", "teacher"]), eq(schema.users.status, "active"))).orderBy(asc(schema.users.createdAt), asc(schema.users.id));
      const rank = members.findIndex((m) => m.id === userId);
      if (rank >= 0 && rank < seatCap) return merge(osubs, "organisation");
      return { ...NONE, reason: "Your organisation's plan has no free seats." };
    }
  }
  return NONE;
}

export const hasFeature = (e: Entitlement, f: Feature) => e.active && e.features.has(f);

// ───────────── administrative changes (always audited, always with a reason) ─────────────
export interface GrantInput { userId?: string; orgId?: string; planId?: string; days: number; features?: string[]; maxChildren?: number; seats?: number; source: "scholarship" | "admin" | "access_key" | "trial"; reason: string }

export async function grantEntitlement(actor: Actor, input: GrantInput, db?: Executor) {
  const d = db ?? (await getDb());
  if (!input.reason.trim()) throw new Error("A reason is required.");
  if (!input.userId && !input.orgId) throw new Error("A user or organisation is required.");
  let plan: typeof schema.plans.$inferSelect | undefined;
  if (input.planId) [plan] = await d.select().from(schema.plans).where(eq(schema.plans.id, input.planId));
  const now = new Date();
  const [row] = await d.insert(schema.subscriptions).values({
    userId: input.userId ?? null, orgId: input.orgId ?? null, planId: plan?.id ?? null, planName: plan?.name ?? (input.source === "scholarship" ? "Scholarship" : "Administrator grant"),
    status: "active", source: input.source, startsAt: now, endsAt: new Date(now.getTime() + input.days * 86_400_000),
    maxChildren: input.maxChildren ?? plan?.maxChildren ?? 1, seats: input.seats ?? plan?.maxSeats ?? 1,
    features: input.features ?? plan?.features ?? ALL_FEATURES, reason: input.reason, createdBy: actor.id,
  }).returning();
  await audit(actor, "entitlement.grant", { type: "subscription", id: row.id }, { userId: input.userId, orgId: input.orgId, days: input.days, source: input.source, reason: input.reason }, { db: d });
  return row;
}

export async function changeEntitlement(actor: Actor, subId: string, change: { action: "extend" | "suspend" | "reactivate" | "revoke"; days?: number; reason: string }) {
  const db = await getDb();
  if (!change.reason.trim()) throw new Error("A reason is required.");
  const [s] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, subId));
  if (!s) throw new Error("Subscription not found.");
  const set: Partial<Sub> = {};
  if (change.action === "extend") {
    const base = s.endsAt > new Date() ? s.endsAt : new Date();
    set.endsAt = new Date(base.getTime() + (change.days ?? 30) * 86_400_000);
    set.status = s.status === "revoked" ? "revoked" : "active";
  } else if (change.action === "suspend") set.status = "suspended";
  else if (change.action === "reactivate") set.status = "active";
  else if (change.action === "revoke") set.status = "revoked";
  await db.update(schema.subscriptions).set(set).where(eq(schema.subscriptions.id, subId));
  await audit(actor, `entitlement.${change.action}`, { type: "subscription", id: subId }, { reason: change.reason, days: change.days });
}

/** Live subscriptions list for a user (for dashboards). */
export async function listSubscriptions(userId: string) {
  const db = await getDb();
  return db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId)).orderBy(asc(schema.subscriptions.createdAt));
}
