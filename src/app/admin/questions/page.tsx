import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { listQuestions } from "@/server/services/question-admin";
import { ActionForm, Field, InlineAction, Select, TextArea } from "@/components/forms";
import { approveAllQuestionsAction, questionStatusAction, saveQuestionAction } from "@/app/actions/content";
import { Check } from "@/components/forms";
import { QuestionImporter } from "@/components/question-importer";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Question bank", robots: { index: false } };

export default async function Questions({ searchParams }: { searchParams: Promise<{ q?: string; c?: string; s?: string; edit?: string }> }) {
  const u = await requireAdmin("questions.write");
  const sp = await searchParams;
  const db = await getDb();
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  const qs = await listQuestions({ id: u.id, role: u.role, orgId: u.orgId }, { q: sp.q, classLevelSlug: sp.c, status: sp.s });
  const editing = sp.edit ? qs.find((x) => x.id === sp.edit) : undefined;
  const pending = qs.filter((x) => x.status === "draft" || x.status === "review").length;
  const letters = "abcdefgh";
  return (
    <div className="space-y-6">
      <PageHeader title="Question bank" subtitle="Questions for exams, quizzes and games. Each can carry a Bible reference, explanation, topic, difficulty and source." actions={<Link className="btn btn-ghost btn-sm" href="/api/export/questions" prefetch={false}>Export CSV</Link>} />
      <section className="card card-pad border-gold bg-sand"><h2 className="text-lg font-bold">Approve everything at once</h2><p className="mb-2 text-sm">Publishes every question that is still a draft or under review ({pending} now). Read and Edit stay available on every row.</p><ActionForm action={approveAllQuestionsAction} submit={`Approve all (${pending})`} submitClass="btn btn-gold"><Check name="confirm" required label="I confirm I am approving these questions as reviewer." /></ActionForm></section>
      <details className="card card-pad" open={!!editing}><summary className="cursor-pointer text-lg font-bold">{editing ? "Edit question" : "Add one question"}</summary>
        <div className="mt-3"><ActionForm key={editing?.id ?? "new"} action={saveQuestionAction} submit="Save question" submitClass="btn btn-gold"><input type="hidden" name="id" value={editing?.id ?? ""} />
          <div className="grid gap-3 md:grid-cols-3"><Select label="Type" name="type" defaultValue={editing?.type} options={[{ value: "mcq", label: "Multiple choice" }, { value: "tf", label: "True or false" }, { value: "multi", label: "Multiple select" }, { value: "fill", label: "Fill in the blank" }, { value: "short", label: "Short answer" }, { value: "essay", label: "Essay (teacher marks)" }]} /><Select label="Class" name="classLevelSlug" options={[{ value: "", label: "Any" }, ...classes.map((c) => ({ value: c.slug, label: c.name }))]} /><Field label="Topic" name="topic" /></div>
          <TextArea label="Question" name="text" rows={2} required defaultValue={editing?.text} /><TextArea label="Options (one per line, for choice questions)" name="options" rows={4} defaultValue={editing?.type === "tf" ? "" : editing?.options.map((o) => o.text).join("\n")} /><Field label="Correct answer(s): letter such as b, or true/false for true or false" name="correct" defaultValue={editing ? (editing.type === "tf" ? editing.options.find((o) => o.correct)?.id : editing.options.map((o, i) => (o.correct ? letters[i] : "")).filter(Boolean).join(",")) : ""} /><TextArea label="Accepted answers (one per line, for fill-in and short answers)" name="accepted" rows={2} /><TextArea label="Marking rubric (essays)" name="rubric" rows={2} />
          <div className="grid gap-3 md:grid-cols-4"><Field label="Bible reference" name="ref" defaultValue={editing?.ref ?? ""} /><Field label="Difficulty (1 easy, 3 hard)" name="difficulty" type="number" defaultValue={2} /><Field label="Marks" name="marks" type="number" defaultValue={1} /><Select label="Save as" name="status" options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]} /></div>
          <TextArea label="Explanation (shown after results when allowed)" name="explanation" rows={2} defaultValue={editing?.explanation} /><div className="grid gap-3 md:grid-cols-3"><Field label="Tags (comma separated)" name="tags" /><Field label="Source" name="source" /><Field label="Licence (if relevant)" name="licence" /></div></ActionForm></div></details>
      <section><h2 className="mb-2 text-xl font-bold">Import from Word, Excel, CSV or text</h2><QuestionImporter classes={classes} admin /></section>
      <form className="card card-pad grid gap-3 sm:grid-cols-4" role="search"><Field label="Search" name="q" defaultValue={sp.q} /><Select label="Class" name="c" defaultValue={sp.c} options={[{ value: "", label: "All" }, ...classes.map((c) => ({ value: c.slug, label: c.name }))]} /><Select label="Status" name="s" defaultValue={sp.s} options={[{ value: "", label: "All" }, { value: "draft", label: "Draft" }, { value: "review", label: "Review" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} /><div className="flex items-end"><button className="btn btn-primary" type="submit">Filter</button></div></form>
      <p className="text-sm text-mist">Showing up to 400 questions: {qs.length} match.</p>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Question</th><th>Type</th><th>Class</th><th>Topic</th><th>Status</th><th /></tr></thead><tbody>
        {qs.slice(0, 100).map((q) => <tr key={q.id}><td className="max-w-md">{q.text}<div className="text-xs text-mist">{q.ref}</div><details className="mt-1 text-xs"><summary className="cursor-pointer font-semibold text-royal">Read</summary><ul className="mt-1">{q.options.map((o) => <li key={o.id} className={o.correct ? "font-bold text-leaf" : ""}>{o.correct ? "✓ " : "• "}{o.text}</li>)}{q.acceptedAnswers.length > 0 && <li>Accepted: {q.acceptedAnswers.join(" | ")}</li>}{q.explanation && <li className="mt-1 text-mist">{q.explanation}</li>}</ul></details></td><td>{q.type}</td><td>{q.classLevelSlug ?? (q.classMin ? `${q.classMin}-${q.classMax}` : "any")}</td><td>{q.topic}</td><td><StatusBadge status={q.status} /></td><td className="space-x-1 whitespace-nowrap"><Link className="btn btn-ghost btn-sm" href={`/admin/questions?edit=${q.id}`}>Edit</Link>{q.status !== "published" ? <InlineAction action={questionStatusAction} label="Publish" className="btn btn-primary btn-sm" hidden={{ id: q.id, to: "published" }} /> : <InlineAction action={questionStatusAction} label="Unpublish" hidden={{ id: q.id, to: "draft" }} />}<InlineAction action={questionStatusAction} label="Archive" hidden={{ id: q.id, to: "archived" }} confirm="Archive this question?" /></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
