import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { storageUsage } from "./media";
import { integrationStatus } from "./integrations";

export async function dashboardMetrics() {
  const db = await getDb();
  const now = new Date();
  const c = (rows: { n: number }[]) => rows[0]?.n ?? 0;
  const roleRows = await db.select({ role: schema.users.role, status: schema.users.status, n: sql<number>`count(*)::int` }).from(schema.users).groupBy(schema.users.role, schema.users.status);
  const roleCount = (r: string, st?: string) => roleRows.filter((x) => x.role === r && (st ? x.status === st : true)).reduce((a, x) => a + x.n, 0);
  const subs = await db.select({ status: schema.subscriptions.status, ends: schema.subscriptions.endsAt, starts: schema.subscriptions.startsAt, userId: schema.subscriptions.userId, orgId: schema.subscriptions.orgId }).from(schema.subscriptions);
  const live = subs.filter((s) => s.status === "active" && s.starts <= now && s.ends > now);
  const expired = subs.filter((s) => s.status === "active" && s.ends <= now);
  const pays = await db.select({ status: schema.payments.status, currency: schema.payments.currency, n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${schema.payments.amountMinor}),0)::bigint::int` }).from(schema.payments).groupBy(schema.payments.status, schema.payments.currency);
  const orgs = c(await db.select({ n: sql<number>`count(*)::int` }).from(schema.organizations));
  const lessons = await db.select({ level: schema.lessons.contentLevel, status: schema.lessons.status, review: schema.lessons.reviewStatus, n: sql<number>`count(*)::int` }).from(schema.lessons).groupBy(schema.lessons.contentLevel, schema.lessons.status, schema.lessons.reviewStatus);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const attempts = await db.select({ n: sql<number>`count(*)::int`, avg: sql<number>`coalesce(round(avg(${schema.examAttempts.percent})),0)::int` }).from(schema.examAttempts).where(and(gte(schema.examAttempts.startedAt, since)));
  const completed = c(await db.select({ n: sql<number>`count(*)::int` }).from(schema.lessonProgress).where(eq(schema.lessonProgress.status, "completed")));
  const games = c(await db.select({ n: sql<number>`count(*)::int` }).from(schema.gameSessions).where(gte(schema.gameSessions.startedAt, since)));
  const storage = await storageUsage();
  const recent = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.plane, "app")).orderBy(desc(schema.auditLogs.createdAt)).limit(8);
  const weeks: { label: string; n: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const from = new Date(Date.now() - (i + 1) * 7 * 86_400_000), to = new Date(Date.now() - i * 7 * 86_400_000);
    const n = c(await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(and(gte(schema.users.createdAt, from), lt(schema.users.createdAt, to))));
    weeks.push({ label: to.toLocaleDateString("en", { day: "numeric", month: "short" }), n });
  }
  const pendingPay = pays.filter((p) => p.status === "pending").reduce((a, p) => a + p.n, 0);
  const enq = c(await db.select({ n: sql<number>`count(*)::int` }).from(schema.enquiries).where(eq(schema.enquiries.status, "new")));
  const dr = c(await db.select({ n: sql<number>`count(*)::int` }).from(schema.dataRequests).where(eq(schema.dataRequests.status, "open")));
  return {
    users: roleRows.reduce((a, r) => a + r.n, 0), students: roleCount("student"), parents: roleCount("parent"), teachers: roleCount("teacher", "active"), pendingTeachers: roleCount("teacher", "pending"), orgs,
    activeSubs: live.length, expiredSubs: expired.length, pendingPay,
    verifiedRevenue: pays.filter((p) => p.status === "success").map((p) => ({ currency: p.currency, total: p.total, n: p.n })),
    lessonsPublished: lessons.filter((l) => l.level === "complete" && l.status === "published").reduce((a, l) => a + l.n, 0),
    lessonsFramework: lessons.filter((l) => l.level === "framework").reduce((a, l) => a + l.n, 0),
    lessonsUnreviewed: lessons.filter((l) => l.status === "published" && l.review === "unreviewed").reduce((a, l) => a + l.n, 0),
    attempts30: attempts[0]?.n ?? 0, avgScore30: attempts[0]?.avg ?? 0, lessonCompletions: completed, games30: games, storage, recent, weeks, enquiries: enq, openDataRequests: dr,
    integrations: integrationStatus(),
  };
}
