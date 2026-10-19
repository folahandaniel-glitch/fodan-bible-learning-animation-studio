import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { assignableRoles } from "@/server/services/admin-users";
import { ActionForm, Field, InlineAction, Select } from "@/components/forms";
import { createUserAction, resetEmailAction, roleAction, tempPasswordAction, userStatusAction } from "@/app/actions/admin";
import { approveTeacherAction } from "@/app/actions/teaching";
import { PageHeader, StatusBadge } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Users and roles", robots: { index: false } };
const PAGE = 25;

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string; p?: string }> }) {
  const me = await requireAdmin("users.manage");
  const sp = await searchParams;
  const db = await getDb();
  const page = Math.max(1, Number(sp.p) || 1);
  const conds = [];
  if (sp.q) { const like = `%${sp.q}%`; conds.push(or(ilike(schema.users.fullName, like), ilike(schema.users.email, like), ilike(schema.users.username, like))); }
  if (sp.role) conds.push(eq(schema.users.role, sp.role as never));
  if (sp.status) conds.push(eq(schema.users.status, sp.status));
  const where = conds.length ? and(...conds) : undefined;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(where);
  const rows = await db.select().from(schema.users).where(where).orderBy(desc(schema.users.createdAt)).limit(PAGE).offset((page - 1) * PAGE);
  const orgs = await db.select({ id: schema.organizations.id, name: schema.organizations.name }).from(schema.organizations).orderBy(asc(schema.organizations.name));
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  const q = new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.role ? { role: sp.role } : {}), ...(sp.status ? { status: sp.status } : {}) });
  return (
    <div className="space-y-6">
      <PageHeader title="Users and roles" subtitle="Administrators can create accounts, approve, suspend and recover access. Nobody, including you, can ever see anyone's password." />
      <details className="card card-pad"><summary className="cursor-pointer text-lg font-bold">Create an account</summary>
        <div className="mt-3"><ActionForm action={createUserAction} submit="Create account" submitClass="btn btn-gold"><div className="grid gap-3 md:grid-cols-3"><Field label="Full name" name="fullName" required /><Field label="Email" name="email" type="email" /><Field label="Username" name="username" /><Select label="Role" name="role" options={assignableRoles()} /><Select label="Church or school (optional)" name="orgId" options={[{ value: "", label: "None" }, ...orgs.map((o) => ({ value: o.id, label: o.name }))]} /><Select label="Class (students)" name="classLevelSlug" options={[{ value: "", label: "None" }, ...classes.map((c) => ({ value: c.slug, label: c.name }))]} /></div><p className="hint">A one-time temporary password is shown after creation. The person must replace it at first sign-in.</p></ActionForm></div></details>
      <form className="card card-pad grid gap-3 sm:grid-cols-4" role="search"><Field label="Search name, email or username" name="q" defaultValue={sp.q} /><Select label="Role" name="role" defaultValue={sp.role} options={[{ value: "", label: "All roles" }, ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))]} /><Select label="Status" name="status" defaultValue={sp.status} options={[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "pending", label: "Pending" }, { value: "suspended", label: "Suspended" }, { value: "deactivated", label: "Deactivated" }]} /><div className="flex items-end"><button className="btn btn-primary" type="submit">Filter</button></div></form>
      <p className="text-sm text-mist">{n} users</p>
      <div className="space-y-3">
        {rows.map((u) => (
          <article key={u.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-sans text-base font-bold">{u.fullName} <StatusBadge status={u.status} /></h2><p className="text-sm text-mist">{ROLE_LABELS[u.role]} · {u.email ?? `@${u.username}`} · joined {u.createdAt.toDateString()}{u.deletionRequestedAt ? " · deletion requested" : ""}</p>{u.orgId && <p className="text-xs text-mist">Organisation: {orgs.find((o) => o.id === u.orgId)?.name}</p>}</div>
              <div className="flex flex-wrap items-center gap-2">
                {u.status === "pending" && (u.role === "teacher" ? <InlineAction action={approveTeacherAction} label="Approve teacher" className="btn btn-primary btn-sm" hidden={{ teacherId: u.id, decision: "approve" }} /> : <InlineAction action={userStatusAction} label="Approve" className="btn btn-primary btn-sm" hidden={{ id: u.id, status: "active" }} />)}
                {u.status === "active" && u.id !== me.id && u.role !== "developer_admin" && <InlineAction action={userStatusAction} label="Suspend" confirm="Suspend this account? They will be signed out." hidden={{ id: u.id, status: "suspended" }} />}
                {(u.status === "suspended" || u.status === "deactivated") && <InlineAction action={userStatusAction} label="Reactivate" hidden={{ id: u.id, status: "active" }} />}
                {u.email && <InlineAction action={resetEmailAction} label="Send reset link" hidden={{ id: u.id }} />}
                <InlineAction action={tempPasswordAction} label="Temporary password" confirm="Issue a temporary password? The person's current password stops working and they are signed out." hidden={{ id: u.id }} />
                {me.role === "super_admin" && u.id !== me.id && u.role !== "developer_admin" && <InlineAction action={roleAction} label="Change role" hidden={{ id: u.id }}><select name="role" defaultValue={u.role} className="input !w-auto !min-h-0 !py-1 text-sm" aria-label="Role">{assignableRoles().map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></InlineAction>}
              </div>
            </div>
          </article>
        ))}
      </div>
      <nav className="flex gap-2" aria-label="Pages">{page > 1 && <Link className="btn btn-ghost btn-sm" href={`/admin/users?${q}&p=${page - 1}`}>◀ Previous</Link>}{page * PAGE < n && <Link className="btn btn-ghost btn-sm" href={`/admin/users?${q}&p=${page + 1}`}>Next ▶</Link>}</nav>
    </div>
  );
}
