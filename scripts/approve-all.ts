/** Maintenance: approve and publish all drafted lessons, stories and questions as the active Super Admin. Usage: npm run content:approve-all */
(process.env as Record<string, string>).NODE_ENV ||= "development";
async function main() {
  const { getDb, schema } = await import("../src/server/db");
  const { approveAndPublishAll, approveAllQuestions } = await import("../src/server/services/bulk-review");
  const { and, eq, sql } = await import("drizzle-orm");
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(and(eq(schema.users.role, "super_admin"), eq(schema.users.status, "active")));
  if (!u) throw new Error("No active Super Admin.");
  const actor = { id: u.id, label: u.fullName, role: u.role }, who = { id: u.id, role: u.role };
  console.log(await approveAndPublishAll(actor, who, "all"), await approveAllQuestions(actor, who));
  console.log("questions by status:", await db.select({ s: schema.questions.status, n: sql<number>`count(*)::int` }).from(schema.questions).groupBy(schema.questions.status));
  console.log("timeline by status:", await db.select({ s: schema.timelineEvents.status, n: sql<number>`count(*)::int` }).from(schema.timelineEvents).groupBy(schema.timelineEvents.status));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
