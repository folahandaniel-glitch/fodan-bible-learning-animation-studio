import Link from "next/link";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { Field, Select } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Audit log", robots: { index: false } };
const PAGE = 40;

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  await requireAdmin("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const db = await getDb();
  const where = and(eq(schema.auditLogs.plane, "app"), sp.q ? ilike(schema.auditLogs.action, `%${sp.q}%`) : undefined);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.auditLogs).where(where);
  const rows = await db.select().from(schema.auditLogs).where(where).orderBy(desc(schema.auditLogs.createdAt)).limit(PAGE).offset((page - 1) * PAGE);
  void Select;
  return (
    <div className="space-y-4">
      <PageHeader title="Audit log" subtitle="Who did what and when. Passwords, tokens, access codes and payment credentials are never recorded." actions={<Link className="btn btn-ghost btn-sm" href={`/admin/audit/export${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`} prefetch={false}>Export CSV</Link>} />
      <form className="card card-pad flex flex-wrap items-end gap-3" role="search"><div className="min-w-60 flex-1"><Field label="Filter by action (for example payment, role, brand)" name="q" defaultValue={sp.q} /></div><button className="btn btn-primary" type="submit">Filter</button></form>
      <p className="text-sm text-mist">{n} entries</p>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>
        {rows.map((a) => <tr key={a.id}><td className="whitespace-nowrap text-xs">{a.createdAt.toLocaleString()}</td><td>{a.actorLabel ?? "system"}<div className="text-xs text-mist">{a.actorRole}</div></td><td className="font-mono text-xs">{a.action}</td><td className="text-xs">{a.targetType} {a.targetId?.slice(0, 8)}</td><td className="max-w-72 break-words text-xs text-mist">{Object.keys(a.meta).length ? JSON.stringify(a.meta) : ""}</td></tr>)}
      </tbody></table></div>
      <nav className="flex gap-2">{page > 1 && <Link className="btn btn-ghost btn-sm" href={`/admin/audit?p=${page - 1}${sp.q ? `&q=${sp.q}` : ""}`}>◀ Newer</Link>}{page * PAGE < n && <Link className="btn btn-ghost btn-sm" href={`/admin/audit?p=${page + 1}${sp.q ? `&q=${sp.q}` : ""}`}>Older ▶</Link>}</nav>
    </div>
  );
}
