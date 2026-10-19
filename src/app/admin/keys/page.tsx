import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { ActionForm, Field, InlineAction, Select } from "@/components/forms";
import { createKeyAction, revokeKeyAction } from "@/app/actions/admin";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Access codes", robots: { index: false } };

export default async function Keys() {
  await requireAdmin("keys.manage");
  const db = await getDb();
  const keys = await db.select().from(schema.accessKeys).orderBy(desc(schema.accessKeys.createdAt));
  const orgs = await db.select({ id: schema.organizations.id, name: schema.organizations.name }).from(schema.organizations).orderBy(asc(schema.organizations.name));
  const plans = await db.select({ id: schema.plans.id, name: schema.plans.name }).from(schema.plans).orderBy(asc(schema.plans.sort));
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  return (
    <div className="space-y-6">
      <PageHeader title="Access codes" subtitle="Registration codes decide who may register and where they belong. They NEVER replace payment. Scholarship codes grant a time-limited plan and are the only codes that open paid content." />
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Create a code</h2>
        <ActionForm action={createKeyAction} submit="Create code" submitClass="btn btn-gold"><div className="grid gap-3 md:grid-cols-3">
          <Field label="Label" name="label" required /><Select label="Kind" name="purpose" options={[{ value: "registration", label: "Registration / invitation (no free access)" }, { value: "scholarship", label: "Scholarship (grants access)" }]} />
          <Select label="For role" name="role" options={[{ value: "", label: "Any" }, { value: "student", label: "Student" }, { value: "teacher", label: "Teacher" }, { value: "parent", label: "Parent" }]} />
          <Select label="Organisation" name="orgId" options={[{ value: "", label: "None" }, ...orgs.map((o) => ({ value: o.id, label: o.name }))]} />
          <Select label="Class" name="classLevelSlug" options={[{ value: "", label: "Any" }, ...classes.map((c) => ({ value: c.slug, label: c.name }))]} />
          <Select label="Plan features (scholarship)" name="planId" options={[{ value: "", label: "All features" }, ...plans.map((p) => ({ value: p.id, label: p.name }))]} />
          <Field label="Days of access (scholarship)" name="days" type="number" defaultValue={30} /><Field label="Number of uses" name="maxUses" type="number" defaultValue={1} /><Field label="Expires (optional)" name="expires" type="date" /></div>
          <p className="hint">The full code is shown once, right after creating it. Only a fingerprint is stored, so it can never be shown again, and the code is never written to the audit log.</p></ActionForm></section>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Label</th><th>Kind</th><th>Starts with</th><th>Role</th><th>Used</th><th>Expires</th><th>Status</th><th /></tr></thead><tbody>
        {keys.map((k) => <tr key={k.id}><td>{k.label}</td><td>{k.purpose}</td><td className="font-mono">{k.prefix}…</td><td>{k.role ?? "any"}</td><td>{k.uses}/{k.maxUses}</td><td>{k.expiresAt?.toDateString() ?? "never"}</td><td><StatusBadge status={k.revokedAt ? "revoked" : k.expiresAt && k.expiresAt < new Date() ? "expired" : k.uses >= k.maxUses ? "expired" : "active"} /></td><td>{!k.revokedAt && <InlineAction action={revokeKeyAction} label="Revoke" confirm="Revoke this code?" hidden={{ id: k.id }} />}</td></tr>)}
        {!keys.length && <tr><td colSpan={8} className="text-mist">No codes yet.</td></tr>}
      </tbody></table></div>
    </div>
  );
}
