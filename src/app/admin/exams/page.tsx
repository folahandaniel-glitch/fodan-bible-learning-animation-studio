import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { ExamBuilder } from "@/components/exam-builder";
import { InlineAction } from "@/components/forms";
import { examStatusAction } from "@/app/actions/teaching";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Exams", robots: { index: false } };

export default async function AdminExams() {
  await requireAdmin("exams.manage");
  const db = await getDb();
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  const exams = (await db.select().from(schema.exams).orderBy(desc(schema.exams.createdAt))).filter((e) => e.kind !== "quiz");
  return (
    <div className="space-y-6">
      <PageHeader title="CBT examinations" subtitle="Platform-wide exams, competitions and Genesis-to-Revelation papers. Teachers build their own class tests from their portal." />
      <section className="card card-pad"><h2 className="mb-3 text-lg font-bold">Create an exam</h2><ExamBuilder classes={classes} groups={[]} admin /></section>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Exam</th><th>Kind</th><th>Class</th><th>Status</th><th>Results</th><th /></tr></thead><tbody>
        {exams.map((e) => <tr key={e.id}><td className="font-semibold">{e.title}<div className="text-xs text-mist">{e.durationMin} min · {e.rules.map((r) => r.count).join("+")} questions{e.isFree ? " · free" : ""}</div></td><td>{e.kind}</td><td>{e.classLevelSlug ?? "any"}</td><td><StatusBadge status={e.status} /></td><td className="text-xs">{e.releaseResults.replace("_", " ")}</td>
          <td className="space-x-1 whitespace-nowrap"><Link className="btn btn-ghost btn-sm" href={`/admin/exams/${e.id}`}>Analytics</Link>{e.status !== "published" ? <InlineAction action={examStatusAction} label="Publish" className="btn btn-primary btn-sm" hidden={{ id: e.id, to: "published" }} /> : <InlineAction action={examStatusAction} label="Close" hidden={{ id: e.id, to: "closed" }} />}{e.releaseResults === "manual" && !e.resultsReleased && <InlineAction action={examStatusAction} label="Release results" hidden={{ id: e.id, to: "release" }} />}</td></tr>)}
        {!exams.length && <tr><td colSpan={6} className="text-mist">No exams yet.</td></tr>}
      </tbody></table></div>
    </div>
  );
}
