import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { attendanceSummary, canManageGroup, groupProgress, roster } from "@/server/services/teaching";
import { ActionForm, Field, InlineAction, Select, TextArea } from "@/components/forms";
import { assignmentAction, attendanceAction, removeStudentAction } from "@/app/actions/teaching";
import { Crumbs, PageHeader } from "@/components/ui";

export const metadata = { title: "Class", robots: { index: false } };

export default async function ClassManage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["teacher", "org_admin", "super_admin", "curriculum_admin"]);
  const t = { id: user.id, role: user.role, orgId: user.orgId, status: user.status };
  if (!(await canManageGroup(t, id))) notFound(); // teachers only reach classes they are assigned to
  const db = await getDb();
  const [g] = await db.select().from(schema.classGroups).where(eq(schema.classGroups.id, id));
  const [students, att, prog] = await Promise.all([roster(t, id), attendanceSummary(t, id), groupProgress(t, id)]);
  const [cls] = await db.select().from(schema.classLevels).where(eq(schema.classLevels.slug, g.classLevelSlug));
  const lessons = cls ? await db.select({ id: schema.lessons.id, title: schema.lessons.title }).from(schema.lessons).where(and(eq(schema.lessons.classLevelId, cls.id), eq(schema.lessons.status, "published"), eq(schema.lessons.contentLevel, "complete"))).orderBy(asc(schema.lessons.sort)) : [];
  const exams = await db.select({ id: schema.exams.id, title: schema.exams.title }).from(schema.exams).where(and(eq(schema.exams.status, "published")));
  const assignments = await db.select().from(schema.assignments).where(eq(schema.assignments.groupId, id));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <Crumbs items={[{ href: user.role === "teacher" ? "/teacher" : "/church/classes", label: "Classes" }, { label: g.name }]} />
      <PageHeader title={g.name} subtitle={`${cls?.name ?? g.classLevelSlug} · ${students?.length ?? 0} learners`} />
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Roster</h2>
        {students?.length ? <ul className="divide-y divide-line">{students.map((s) => <li key={s.id} className="flex items-center justify-between gap-3 py-2"><span>{s.label} <span className="text-xs text-mist">@{s.username}</span></span><InlineAction action={removeStudentAction} label="Remove" confirm="Remove this learner from the class?" hidden={{ groupId: id, studentId: s.id }} /></li>)}</ul> : <p className="text-sm text-mist">No learners yet. Your church administrator adds learners to the class.</p>}
        <p className="mt-2 text-xs text-mist">The roster shows first name and surname initial only. Contact details and birth information are never shown to teachers.</p>
      </section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Take attendance</h2>
        {students?.length ? <ActionForm action={attendanceAction.bind(null, id)} submit="Save attendance"><Field label="Date" name="date" type="date" defaultValue={today} required />
          <ul className="grid gap-2 sm:grid-cols-2">{students.map((s) => <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-sand p-2"><span className="text-sm font-semibold">{s.label}</span><select name={`m_${s.id}`} className="input !w-auto !min-h-0 !py-1 text-sm" defaultValue="present" aria-label={`Attendance for ${s.label}`}><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="excused">Excused</option></select></li>)}</ul></ActionForm> : <p className="text-sm text-mist">Add learners first.</p>}
        {att && att.sessions.length > 0 && <div className="mt-4"><h3 className="font-bold">Recent sessions</h3><ul className="mt-1 text-sm">{att.sessions.slice(0, 6).map((s) => { const m = att.marks.filter((x) => x.sessionId === s.id); return <li key={s.id}>{s.date}: {m.filter((x) => x.status === "present" || x.status === "late").length} of {m.length} present</li>; })}</ul></div>}
      </section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Set an assignment</h2>
        <ActionForm action={assignmentAction.bind(null, id)} submit="Assign to class">
          <div className="grid gap-3 sm:grid-cols-2"><Select label="Type" name="kind" options={[{ value: "lesson", label: "Lesson to study" }, { value: "exam", label: "Exam or quiz" }]} />
            <Select label="Lesson (if type is lesson)" name="refId" options={[{ value: "", label: "Choose a lesson or exam" }, ...lessons.map((l) => ({ value: l.id, label: `Lesson: ${l.title}` })), ...exams.map((e) => ({ value: e.id, label: `Exam: ${e.title}` }))]} hint="Pick the item that matches the type." /></div>
          <Field label="Title" name="title" required maxLength={160} /><Field label="Due date (optional)" name="dueAt" type="date" /><TextArea label="Instructions" name="instructions" rows={2} />
        </ActionForm>
        {assignments.length > 0 && <ul className="mt-3 text-sm">{assignments.map((a) => <li key={a.id}>• {a.title} ({a.kind}){a.dueAt ? `, due ${a.dueAt.toDateString()}` : ""}</li>)}</ul>}
      </section>
      <section className="card card-pad overflow-x-auto"><h2 className="mb-2 text-lg font-bold">Progress report</h2>
        {prog?.rows.length ? <table className="table"><thead><tr><th>Learner</th><th>Lessons done</th><th>Exam average</th><th>Attendance</th></tr></thead><tbody>{prog.rows.map((r) => <tr key={r.id}><td>{r.label}</td><td>{r.lessonsDone}/{r.lessonsTotal}</td><td>{r.examAvg != null ? `${r.examAvg}% (${r.exams})` : "None yet"}</td><td>{r.attendance != null ? `${r.attendance}%` : "None yet"}</td></tr>)}</tbody></table> : <p className="text-sm text-mist">No data yet.</p>}
        <p className="mt-2 text-xs text-mist">Progress is for supporting learners. It is never shown publicly and learners are not ranked against each other.</p>
      </section>
    </div>
  );
}
