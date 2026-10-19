import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { myGroups } from "@/server/services/teaching";
import { examAnalytics } from "@/server/services/exams";
import { ExamBuilder } from "@/components/exam-builder";
import { InlineAction } from "@/components/forms";
import { examStatusAction } from "@/app/actions/teaching";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Exams" };

export default async function TeacherExams() {
  const user = await requireUser(["teacher", "org_admin"]);
  const db = await getDb();
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  const groups = await myGroups({ id: user.id, role: user.role, orgId: user.orgId, status: user.status });
  const exams = await db.select().from(schema.exams).where(and(eq(schema.exams.createdBy, user.id))).orderBy(desc(schema.exams.createdAt));
  const stats = await Promise.all(exams.map((e) => examAnalytics(e.id)));
  return (
    <div className="space-y-6">
      <PageHeader title="Exams and quizzes" subtitle="Questions come from the Bible question bank and from questions you import for your own church." actions={<Link href="/teacher/exams/import" className="btn btn-gold">Import questions</Link>} />
      <section className="card card-pad"><h2 className="mb-3 text-lg font-bold">Create an exam</h2><ExamBuilder classes={classes} groups={groups.map((g) => ({ id: g.id, name: g.name }))} admin={false} /></section>
      <section><h2 className="mb-2 text-lg font-bold">My exams</h2>
        {exams.length ? <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Title</th><th>Status</th><th>Attempts</th><th>Average</th><th>Actions</th></tr></thead><tbody>{exams.map((e, i) => <tr key={e.id}><td>{e.title}<div className="text-xs text-mist">{e.durationMin} min · release: {e.releaseResults.replace("_", " ")}</div></td><td><StatusBadge status={e.status} /></td><td>{stats[i].attempts}</td><td>{stats[i].average != null ? `${stats[i].average}%` : "—"}</td><td className="space-y-1">{e.status !== "published" && <InlineAction action={examStatusAction} label="Publish" className="btn btn-primary btn-sm" hidden={{ id: e.id, to: "published" }} />}{e.status === "published" && <InlineAction action={examStatusAction} label="Close" hidden={{ id: e.id, to: "closed" }} />}{e.releaseResults === "manual" && !e.resultsReleased && <InlineAction action={examStatusAction} label="Release results" hidden={{ id: e.id, to: "release" }} />}</td></tr>)}</tbody></table></div> : <p className="text-mist">You have not created any exams yet.</p>}
      </section>
    </div>
  );
}
