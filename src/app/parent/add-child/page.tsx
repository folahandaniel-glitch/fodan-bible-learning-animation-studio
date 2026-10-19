import { requireUser } from "@/server/guards";
import { ActionForm, Check, Field, PasswordInput, Select } from "@/components/forms";
import { createChildAction, linkChildAction } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui";
import { getDb, schema } from "@/server/db";
import { asc } from "drizzle-orm";

export const metadata = { title: "Add or link a child" };

export default async function AddChild() {
  await requireUser(["parent"]);
  const db = await getDb();
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  return (
    <div className="space-y-6">
      <PageHeader title="Add or link a child" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card card-pad"><h2 className="text-xl font-bold">Create an account for your child</h2><p className="mb-3 text-sm text-mist">The account is linked to you straight away. Pick a username that is not their full name.</p>
          <ActionForm action={createChildAction} submit="Create child account" submitClass="btn btn-gold">
            <Field label="Child's full name" name="fullName" required maxLength={100} />
            <Field label="Username" name="username" required pattern="[A-Za-z0-9._\-]{3,30}" hint="3 to 30 letters, numbers, dots or dashes." />
            <Select label="Class" name="classLevelSlug" options={classes.map((c) => ({ value: c.slug, label: c.name }))} />
            <Select label="Age group (optional)" name="ageBand" options={[{ value: "", label: "Choose" }, { value: "under-7", label: "Under 7" }, { value: "7-9", label: "7 to 9" }, { value: "10-12", label: "10 to 12" }, { value: "13-15", label: "13 to 15" }, { value: "16+", label: "16 or older" }]} />
            <PasswordInput label="Child's password" name="password" autoComplete="new-password" showStrength />
            <PasswordInput label="Confirm password" name="confirm" autoComplete="new-password" />
            <Check name="guardian" required label="I am the parent or guardian and I agree to the child privacy notice." />
          </ActionForm></section>
        <section className="card card-pad"><h2 className="text-xl font-bold">Link a child who already registered</h2><p className="mb-3 text-sm text-mist">Your child can find their <strong>family link code</strong> on their Account page. You need both their username and the code, so nobody can link to a child by guessing.</p>
          <ActionForm action={linkChildAction} submit="Link child" submitClass="btn btn-primary"><Field label="Child's username" name="username" required /><Field label="Family link code" name="code" required placeholder="ABCD-EFGH" maxLength={9} /></ActionForm></section>
      </div>
    </div>
  );
}
