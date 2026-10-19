import { and, desc, eq, ilike } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { can } from "@/lib/permissions";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`; // neutralise spreadsheet formulas

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || !can(s.user.role, "audit.view")) return new Response("Forbidden", { status: 403 });
  const q = new URL(req.url).searchParams.get("q");
  const db = await getDb();
  const rows = await db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.plane, "app"), q ? ilike(schema.auditLogs.action, `%${q}%`) : undefined)).orderBy(desc(schema.auditLogs.createdAt)).limit(5000);
  await audit({ id: s.user.id, label: s.user.fullName, role: s.user.role }, "audit.export", undefined, { rows: rows.length });
  const lines = ["when,actor,role,action,target_type,target_id,details", ...rows.map((a) => [a.createdAt.toISOString(), a.actorLabel, a.actorRole, a.action, a.targetType, a.targetId, JSON.stringify(a.meta)].map(csv).join(","))];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="audit-log.csv"', "Cache-Control": "no-store" } });
}
