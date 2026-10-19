import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { can } from "@/lib/permissions";
import { ActionForm, Check, Field, InlineAction, Select, TextArea } from "@/components/forms";
import { duplicateLessonAction, lessonReviewAction, lessonStatusAction, saveLessonAction } from "@/app/actions/content";
import { Crumbs, PageHeader, StatusBadge } from "@/components/ui";
import { getPassages } from "@/server/bible-data";
import { BibleText } from "@/components/bible-text";
import Link from "next/link";

export const metadata = { title: "Edit lesson", robots: { index: false } };
const NEXT: Record<string, { to: string; label: string }[]> = { draft: [{ to: "review", label: "Submit for review" }], review: [{ to: "approved", label: "Approve" }, { to: "draft", label: "Back to draft" }], approved: [{ to: "published", label: "Publish" }, { to: "review", label: "Back to review" }], published: [{ to: "approved", label: "Unpublish" }], archived: [{ to: "draft", label: "Restore as draft" }] };
const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function EditLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin("curriculum.write");
  const db = await getDb();
  const [l] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id));
  if (!l) notFound();
  const [c] = await db.select().from(schema.classLevels).where(eq(schema.classLevels.id, l.classLevelId));
  const versions = await db.select({ v: schema.lessonVersions.version, at: schema.lessonVersions.createdAt }).from(schema.lessonVersions).where(eq(schema.lessonVersions.lessonId, id)).orderBy(desc(schema.lessonVersions.createdAt)).limit(10);
  const classes = await db.select({ id: schema.classLevels.id, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  const b = l.body, t = l.teacherNotes;
  const reviewer = can(user.role, "content.review");
  const passages = l.refs.flatMap((r) => getPassages(r, "kjv"));
  return (
    <div className="space-y-6">
      <Crumbs items={[{ href: "/admin/curriculum", label: "Curriculum" }, { href: `/admin/curriculum/${c.slug}`, label: c.name }, { label: l.title }]} />
      <PageHeader title={l.title} subtitle={`Version ${l.version} · ${l.origin === "ai_drafted" ? "AI-drafted for review" : l.origin}`} actions={<><StatusBadge status={l.contentLevel === "framework" ? "framework" : l.status} /><StatusBadge status={l.reviewStatus} /><Link className="btn btn-ghost btn-sm" href={`/learn/${l.slug}`}>Preview as learner</Link></>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card card-pad lg:col-span-2"><h2 className="mb-2 text-lg font-bold">Workflow</h2>
          <div className="flex flex-wrap gap-2">{(NEXT[l.status] ?? []).map((n) => <InlineAction key={n.to} action={lessonStatusAction} label={n.label} className={`btn btn-sm ${n.to === "published" || n.to === "approved" ? "btn-primary" : "btn-ghost"}`} hidden={{ id: l.id, to: n.to }} />)}</div>
          {!reviewer && <p className="mt-2 text-sm text-mist">You can edit and submit for review. A reviewer approves and publishes.</p>}
          <h2 className="mb-2 mt-5 text-lg font-bold">Theological and pedagogical review</h2>
          {reviewer ? <ActionForm action={lessonReviewAction} submit="Record review" submitClass="btn btn-gold btn-sm" className="space-y-2"><input type="hidden" name="id" value={l.id} /><Select label="Review result" name="to" defaultValue={l.reviewStatus} options={[{ value: "unreviewed", label: "Not yet reviewed" }, { value: "in_review", label: "In review" }, { value: "changes_requested", label: "Changes requested" }, { value: "approved", label: "Reviewed and approved (doctrine, age-appropriateness, accuracy)" }]} /><TextArea label="Reviewer notes" name="notes" rows={2} defaultValue={l.editorialNotes} /></ActionForm> : <p className="text-sm text-mist">Status: {l.reviewStatus.replace("_", " ")}.</p>}
        </section>
        <aside className="space-y-4">
          <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Duplicate or adapt</h2><ActionForm action={duplicateLessonAction} submit="Duplicate" submitClass="btn btn-ghost btn-sm" className="space-y-2"><input type="hidden" name="id" value={l.id} /><Select label="Into class" name="classId" defaultValue={l.classLevelId} options={classes.map((x) => ({ value: x.id, label: x.name }))} /></ActionForm></section>
          <section className="card card-pad"><h2 className="mb-1 text-lg font-bold">Versions</h2>{versions.length ? <ul className="text-sm">{versions.map((v) => <li key={v.v}>v{v.v} · {v.at.toLocaleString()}</li>)}</ul> : <p className="text-sm text-mist">No earlier versions.</p>}</section>
        </aside>
      </div>
      {passages.length > 0 && <details className="card card-pad"><summary className="cursor-pointer text-lg font-bold">Compare with Scripture (KJV): {l.refs.join("; ")}</summary><div className="mt-3"><BibleText passages={passages} compact /><p className="mt-2 text-sm text-mist">Check every statement in the lesson against these verses. Remove or correct anything the text does not support.</p></div></details>}
      <ActionForm action={saveLessonAction.bind(null, l.id)} submit="Save lesson" submitClass="btn btn-primary">
        <div className="grid gap-4 md:grid-cols-2"><Field label="Title" name="title" defaultValue={l.title} required /><Field label="Memory verse reference" name="memoryVerseRef" defaultValue={l.memoryVerseRef ?? ""} hint="The verse text is read from the Bible data; never typed here." /><Field label="Scheduled publication (optional)" name="publishAt" type="datetime-local" defaultValue={dt(l.publishAt)} /><div className="pt-6"><Check name="isFree" label="Free sample lesson (open to everyone)" defaultChecked={l.isFree} /></div></div>
        <TextArea label="Bible passages (one per line)" name="refs" defaultValue={l.refs.join("\n")} rows={2} />
        <TextArea label="One-line summary" name="summary" defaultValue={b.scriptureSummary ?? ""} rows={2} />
        <TextArea label="Learning objectives (one per line)" name="objectives" defaultValue={(b.objectives ?? []).join("\n")} rows={3} />
        <TextArea label="Background (Markdown)" name="background" defaultValue={b.background ?? ""} rows={4} />
        <TextArea label="Lesson explanation (Markdown)" name="explanation" defaultValue={b.explanation ?? ""} rows={10} hint="Explain what the passage says in its context. Do not invent history, word meanings or fulfilments." />
        <TextArea label="Important words (word | meaning, one per line)" name="keyWords" defaultValue={(b.keyWords ?? []).map((k) => `${k.word} | ${k.meaning}`).join("\n")} rows={3} />
        <TextArea label="Application" name="application" defaultValue={b.application ?? ""} rows={3} />
        <TextArea label="Discussion questions (one per line)" name="discussion" defaultValue={(b.discussion ?? []).join("\n")} rows={3} />
        <div className="grid gap-4 md:grid-cols-2"><TextArea label="Classroom activity" name="activity" defaultValue={b.activity ?? ""} rows={3} /><TextArea label="Homework or family activity" name="homework" defaultValue={b.homework ?? ""} rows={3} /><TextArea label="Practical application" name="practical" defaultValue={b.practical ?? ""} rows={2} /><TextArea label="Age-appropriate vocabulary (one per line)" name="vocabulary" defaultValue={(b.vocabulary ?? []).join("\n")} rows={2} /></div>
        <fieldset className="rounded-xl border border-royal bg-[#f3f7ff] p-4"><legend className="px-2 font-bold">Teachers only (never shown to students)</legend>
          <TextArea label="Teacher preparation guide" name="prep" defaultValue={t.preparation ?? ""} rows={2} /><TextArea label="Teaching notes" name="tnotes" defaultValue={t.notes ?? ""} rows={3} /><TextArea label="Fuller scholarly notes (disputed points, sources)" name="advanced" defaultValue={t.advanced ?? ""} rows={4} /><TextArea label="Assessment rubric" name="rubric" defaultValue={t.rubric ?? ""} rows={2} /></fieldset>
        <TextArea label="Parent and guardian notes" name="parentNotes" defaultValue={l.parentNotes} rows={2} />
        <TextArea label="Sources (one per line)" name="sources" defaultValue={l.sources.join("\n")} rows={2} />
        <TextArea label="Editorial notes (editors only)" name="editorialNotes" defaultValue={l.editorialNotes} rows={2} />
        <p className="hint">Saving creates a new version. Saving content into a framework entry turns it into a full lesson record, but it stays hidden from learners until it is reviewed and published.</p>
      </ActionForm>
    </div>
  );
}
