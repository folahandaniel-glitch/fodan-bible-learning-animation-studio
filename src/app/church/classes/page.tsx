import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { myGroups, orgUsers } from "@/server/services/teaching";
import { ActionForm, Field, InlineAction, Select } from "@/components/forms";
import { assignTeacherAction, createGroupAction, enrolAction } from "@/app/actions/teaching";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Classes" };

export default async function ChurchClasses() {
  const user = await requireUser(["org_admin"]);
  const db = await getDb();
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  const groups = await myGroups({ id: user.id, role: user.role, orgId: user.orgId, status: user.status });
  const teachers = user.orgId ? (await orgUsers(user.orgId, "teacher")).filter((t) => t.status === "active") : [];
  const students = user.orgId ? await orgUsers(user.orgId, "student") : [];
  return (
    <div className="space-y-6">
      <PageHeader title="Classes" subtitle="Teachers only see the classes you assign them to." />
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Create a class</h2><ActionForm action={createGroupAction} submit="Create class"><div className="grid gap-3 sm:grid-cols-3"><Field label="Class name" name="name" required placeholder="Primary 3 Sunday School" /><Select label="Curriculum level" name="classLevelSlug" options={classes.map((c) => ({ value: c.slug, label: c.name }))} /><Select label="Term" name="termNo" options={[{ value: "1", label: "Term 1" }, { value: "2", label: "Term 2" }, { value: "3", label: "Term 3" }]} /></div></ActionForm></section>
      {groups.map((g) => (
        <section key={g.id} className="card card-pad"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{g.name}</h2><Link href={`/teacher/classes/${g.id}`} className="btn btn-ghost btn-sm">Open</Link></div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div><h3 className="font-bold">Assign a teacher</h3><InlineAction action={assignTeacherAction} label="Assign" className="btn btn-primary btn-sm" hidden={{ groupId: g.id }}><select name="teacherId" className="input !w-auto !min-h-0 !py-1" aria-label="Teacher">{teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select></InlineAction></div>
            <div><h3 className="font-bold">Add a learner</h3><InlineAction action={enrolAction} label="Add" className="btn btn-primary btn-sm" hidden={{ groupId: g.id }}><select name="studentId" className="input !w-auto !min-h-0 !py-1" aria-label="Learner">{students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select></InlineAction></div>
          </div></section>
      ))}
      {!groups.length && <p className="text-mist">No classes yet.</p>}
    </div>
  );
}
