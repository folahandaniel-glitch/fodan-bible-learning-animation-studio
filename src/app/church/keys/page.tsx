import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { ActionForm, Field, Select } from "@/components/forms";
import { orgKeyAction } from "@/app/actions/teaching";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Invitation codes" };

export default async function Keys() {
  const user = await requireUser(["org_admin"]);
  const db = await getDb();
  const keys = user.orgId ? await db.select().from(schema.accessKeys).where(eq(schema.accessKeys.orgId, user.orgId)).orderBy(desc(schema.accessKeys.createdAt)) : [];
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(schema.classLevels.sort);
  return (
    <div className="space-y-6">
      <PageHeader title="Invitation codes" subtitle="People who register with a code join your organisation automatically. A code does not pay for anything; learners still need a plan." />
      <section className="card card-pad max-w-xl"><h2 className="mb-2 text-lg font-bold">Create a code</h2>
        <ActionForm action={orgKeyAction} submit="Create code"><Field label="Label" name="label" placeholder="Teachers 2026" /><Select label="For" name="role" options={[{ value: "teacher", label: "Teachers (a code approves them directly)" }, { value: "student", label: "Learners" }]} /><Select label="Class (learners only)" name="classLevelSlug" options={[{ value: "", label: "Any" }, ...classes.map((c) => ({ value: c.slug, label: c.name }))]} /><Field label="Number of uses" name="maxUses" type="number" defaultValue={10} /><Field label="Expires (optional)" name="expires" type="date" /></ActionForm>
        <p className="hint mt-2">The code is shown once when you create it. We store only a fingerprint, so it cannot be shown again.</p></section>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Label</th><th>Starts with</th><th>For</th><th>Used</th><th>Status</th></tr></thead><tbody>{keys.map((k) => <tr key={k.id}><td>{k.label}</td><td className="font-mono">{k.prefix}…</td><td>{k.role}</td><td>{k.uses}/{k.maxUses}</td><td><StatusBadge status={k.revokedAt ? "revoked" : k.expiresAt && k.expiresAt < new Date() ? "expired" : "active"} /></td></tr>)}</tbody></table></div>
    </div>
  );
}
