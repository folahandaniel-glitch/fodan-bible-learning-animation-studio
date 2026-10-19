import { eq } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { can } from "@/lib/permissions";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

/** Exam results as CSV: only for staff with exam rights, the exam's creator, or an administrator of the same organisation. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await getSession();
  if (!s) return new Response("Sign in required", { status: 401 });
  const db = await getDb();
  const [e] = await db.select().from(schema.exams).where(eq(schema.exams.id, id));
  if (!e) return new Response("Not found", { status: 404 });
  const u = s.user;
  const ok = can(u.role, "exams.manage") || e.createdBy === u.id || (u.role === "org_admin" && !!u.orgId && e.orgId === u.orgId);
  if (!ok) return new Response("Forbidden", { status: 403 });
  const rows = await db.select({ a: schema.examAttempts, n: schema.users.displayName, c: schema.users.classLevelSlug, org: schema.users.orgId }).from(schema.examAttempts).innerJoin(schema.users, eq(schema.users.id, schema.examAttempts.userId)).where(eq(schema.examAttempts.examId, id));
  const visible = rows.filter((r) => can(u.role, "exams.manage") || !e.orgId || r.org === e.orgId);
  await audit({ id: u.id, label: u.fullName, role: u.role }, "export.exam_results", { type: "exam", id }, { rows: visible.length });
  const lines = ["learner,class,attempt,status,score,max,percent,minutes,started", ...visible.map(({ a, n, c }) => [n, c, a.attemptNo, a.status, a.score, a.maxScore, a.percent, a.submittedAt ? Math.round((a.submittedAt.getTime() - a.startedAt.getTime()) / 60000) : "", a.startedAt.toISOString()].map(csv).join(","))];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="exam-results.csv"`, "Cache-Control": "no-store" } });
}
