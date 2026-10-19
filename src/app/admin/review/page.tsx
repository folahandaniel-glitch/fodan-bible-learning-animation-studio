import Link from "next/link";
import { and, asc, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { InlineAction } from "@/components/forms";
import { approveAllAction, approvePublishOneAction } from "@/app/actions/content";
import { ActionForm, Check } from "@/components/forms";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Review queue", robots: { index: false } };

export default async function Review() {
  await requireAdmin("content.review");
  const db = await getDb();
  const lessons = await db.select({ l: schema.lessons, c: schema.classLevels.name }).from(schema.lessons).innerJoin(schema.classLevels, eq(schema.classLevels.id, schema.lessons.classLevelId)).where(and(eq(schema.lessons.contentLevel, "complete"), ne(schema.lessons.reviewStatus, "approved"))).orderBy(asc(schema.classLevels.sort), asc(schema.lessons.sort));
  const stories = await db.select().from(schema.stories).where(and(eq(schema.stories.isTemplate, false), ne(schema.stories.reviewStatus, "approved"))).orderBy(asc(schema.stories.title));
  const doctrine = await getSetting("doctrine");
  return (
    <div className="space-y-6">
      <PageHeader title="Review queue" subtitle="Lessons and stories that have not yet been theologically and pedagogically approved. Learners see a visible 'draft content' notice on each until you approve it." />
      <div className="card card-pad bg-sand text-sm"><strong>The ministry&apos;s doctrinal position (used by reviewers):</strong> {doctrine.position}</div>
      <section className="card card-pad border-gold bg-sand"><h2 className="text-lg font-bold">Approve everything at once</h2><p className="mb-2 text-sm">Marks every full lesson and story below as reviewed and approved, and publishes it. Read and Edit remain available on every row. Framework topics without lesson content and archived items are never touched.</p><ActionForm action={approveAllAction.bind(null, "all")} submit={`Approve all (${lessons.length} lessons, ${stories.length} stories)`} submitClass="btn btn-gold" confirm="Approve and publish ALL listed lessons and stories?"><Check name="confirm" required label="I confirm I am approving this content as its reviewer, and that it has been checked against Scripture and our doctrinal position." /></ActionForm><div className="mt-3 flex flex-wrap gap-4"><ActionForm action={approveAllAction.bind(null, "lessons")} submit="Approve all lessons only" submitClass="btn btn-ghost btn-sm" className="flex items-center gap-2"><Check name="confirm" required label="Confirm" /></ActionForm><ActionForm action={approveAllAction.bind(null, "stories")} submit="Approve all stories only" submitClass="btn btn-ghost btn-sm" className="flex items-center gap-2"><Check name="confirm" required label="Confirm" /></ActionForm></div></section>
      <section><h2 className="mb-2 text-lg font-bold">Lessons ({lessons.length})</h2><div className="card overflow-x-auto"><table className="table"><thead><tr><th>Class</th><th>Lesson</th><th>Status</th><th>Review</th><th /></tr></thead><tbody>
        {lessons.map(({ l, c }) => <tr key={l.id}><td>{c}</td><td>{l.title}<div className="text-xs text-mist">{l.refs.join("; ")}</div></td><td><StatusBadge status={l.status} /></td><td><StatusBadge status={l.reviewStatus} /></td><td className="space-x-1 whitespace-nowrap"><Link className="btn btn-ghost btn-sm" href={`/admin/lessons/${l.id}`}>Edit</Link><Link className="btn btn-ghost btn-sm" href={`/learn/${l.slug}`}>Read</Link><InlineAction action={approvePublishOneAction} label="Approve and publish" className="btn btn-primary btn-sm" hidden={{ id: l.id, kind: "lesson" }} /></td></tr>)}
        {!lessons.length && <tr><td colSpan={5} className="text-mist">Everything has been reviewed.</td></tr>}</tbody></table></div></section>
      <section><h2 className="mb-2 text-lg font-bold">Stories and teaching units ({stories.length})</h2><div className="card overflow-x-auto"><table className="table"><thead><tr><th>Story</th><th>Passage</th><th>Status</th><th>Review</th><th /></tr></thead><tbody>
        {stories.map((s) => <tr key={s.id}><td>{s.title}</td><td className="text-xs">{s.passageRef}</td><td><StatusBadge status={s.status} /></td><td><StatusBadge status={s.reviewStatus} /></td><td className="space-x-1 whitespace-nowrap"><Link className="btn btn-ghost btn-sm" href={`/stories/${s.slug}`}>Read</Link><Link className="btn btn-ghost btn-sm" href={`/studio/${s.id}`}>Edit</Link><InlineAction action={approvePublishOneAction} label="Approve and publish" className="btn btn-primary btn-sm" hidden={{ id: s.id, kind: "story" }} /></td></tr>)}
        {!stories.length && <tr><td colSpan={5} className="text-mist">Everything has been reviewed.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
