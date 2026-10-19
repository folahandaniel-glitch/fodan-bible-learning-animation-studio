/** One-off/maintenance: approve and publish all drafted lessons and stories as the active Super Admin. Usage: npm run content:approve-all */
(process.env as Record<string, string>).NODE_ENV ||= "development";
async function main() {
  const { getDb, schema } = await import("../src/server/db");
  const { approveAndPublishAll } = await import("../src/server/services/bulk-review");
  const { and, eq } = await import("drizzle-orm");
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(and(eq(schema.users.role, "super_admin"), eq(schema.users.status, "active")));
  if (!u) throw new Error("No active Super Admin.");
  console.log(await approveAndPublishAll({ id: u.id, label: u.fullName, role: u.role }, { id: u.id, role: u.role }, "all"));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
