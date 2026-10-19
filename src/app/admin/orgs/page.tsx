import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { ActionForm, Field, InlineAction, Select } from "@/components/forms";
import { orgCreateAction, orgStatusAction } from "@/app/actions/admin";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Churches and schools", robots: { index: false } };

export default async function Orgs() {
  await requireAdmin("orgs.manage");
  const db = await getDb();
  const orgs = await db.select().from(schema.organizations).orderBy(desc(schema.organizations.createdAt));
  const counts = await db.select({ orgId: schema.users.orgId, role: schema.users.role, n: sql<number>`count(*)::int` }).from(schema.users).where(sql`${schema.users.orgId} is not null`).groupBy(schema.users.orgId, schema.users.role);
  void asc; void eq;
  return (
    <div className="space-y-6">
      <PageHeader title="Churches and schools" subtitle="Each organisation sees only its own classes, teachers and learners." />
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Add an organisation</h2><ActionForm action={orgCreateAction} submit="Add" submitClass="btn btn-gold"><div className="grid gap-3 md:grid-cols-4"><Field label="Name" name="name" required /><Select label="Type" name="type" options={[{ value: "church", label: "Church" }, { value: "school", label: "School" }, { value: "centre", label: "Learning centre" }]} /><Field label="Country" name="country" /><Field label="Contact email" name="email" type="email" /></div></ActionForm></section>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Type</th><th>Country</th><th>People</th><th>Status</th><th /></tr></thead><tbody>
        {orgs.map((o) => { const c = counts.filter((x) => x.orgId === o.id); const n = (r: string) => c.filter((x) => x.role === r).reduce((a, x) => a + x.n, 0); return <tr key={o.id}><td className="font-semibold">{o.name}</td><td>{o.type}</td><td>{o.country}</td><td className="text-xs">{n("teacher")} teachers · {n("student")} learners · {n("org_admin")} admins</td><td><StatusBadge status={o.status} /></td><td className="space-x-2 whitespace-nowrap">{o.status !== "active" && <InlineAction action={orgStatusAction} label="Approve" className="btn btn-primary btn-sm" hidden={{ id: o.id, status: "active" }} />}{o.status === "active" && <InlineAction action={orgStatusAction} label="Suspend" confirm="Suspend this organisation?" hidden={{ id: o.id, status: "suspended" }} />}<Link className="btn btn-ghost btn-sm" href={`/admin/data/organisations?edit=${o.id}`}>Edit</Link></td></tr>; })}
        {!orgs.length && <tr><td colSpan={6} className="text-mist">No organisations yet.</td></tr>}
      </tbody></table></div>
    </div>
  );
}
