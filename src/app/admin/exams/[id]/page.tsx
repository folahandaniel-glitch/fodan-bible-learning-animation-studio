import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { examAnalytics } from "@/server/services/exams";
import { Crumbs, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Exam analytics", robots: { index: false } };

export default async function ExamStats({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin("exams.manage");
  const db = await getDb();
  const [e] = await db.select().from(schema.exams).where(eq(schema.exams.id, id));
  if (!e) notFound();
  const a = await examAnalytics(id);
  return (
    <div className="space-y-6">
      <Crumbs items={[{ href: "/admin/exams", label: "Exams" }, { label: e.title }]} />
      <PageHeader title={e.title} subtitle="Question difficulty analysis and completion data." actions={<Link className="btn btn-ghost btn-sm" href={`/api/export/exam/${id}`} prefetch={false}>Export results (CSV)</Link>} />
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Submitted attempts" value={a.attempts} /><Stat label="Average score" value={a.average != null ? `${a.average}%` : "—"} /><Stat label="Average time" value={a.avgSeconds != null ? `${Math.round(a.avgSeconds / 60)} min` : "—"} /></div>
      <section className="card card-pad overflow-x-auto"><h2 className="mb-2 text-lg font-bold">Questions, hardest first</h2><table className="table"><thead><tr><th>Question</th><th>Topic</th><th>Attempts</th><th>Answered correctly</th></tr></thead><tbody>{a.perQuestion.map((q) => <tr key={q.id}><td className="max-w-md">{q.text}</td><td>{q.topic}</td><td>{q.attempted}</td><td>{q.correctRate != null ? `${q.correctRate}%` : "—"}</td></tr>)}{!a.perQuestion.length && <tr><td colSpan={4} className="text-mist">No attempts yet.</td></tr>}</tbody></table></section>
    </div>
  );
}
