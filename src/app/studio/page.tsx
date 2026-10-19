import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireUser } from "@/server/guards";
import { listTemplates } from "@/server/services/studio";
import { fromTemplateAction, blankStoryAction } from "@/app/actions/studio";
import { ActionForm, Field } from "@/components/forms";
import { PageHeader, StatusBadge } from "@/components/ui";
import { SceneArt } from "@/components/scene-art";
import { can } from "@/lib/permissions";

export const metadata = { title: "Story studio" };

export default async function Studio() {
  const user = await requireUser(["teacher", "super_admin", "curriculum_admin", "content_editor"]);
  const [templates, mine] = await Promise.all([listTemplates(), (async () => { const db = await getDb(); return db.select().from(schema.stories).where(and(eq(schema.stories.isTemplate, false), eq(schema.stories.authorId, user.id))).orderBy(desc(schema.stories.updatedAt)); })()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Bible Storybook and Animation Studio" subtitle="Start from a ready-made template (already filled with scenes, passages and questions), import a Word document, or write your own. Preview, narrate and submit for review." actions={<Link className="btn btn-gold" href="/studio/import">Import a Word document</Link>} />
      <section><h2 className="mb-3 text-xl font-bold">Ready-made templates</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{templates.map((t) => <li key={t.id} className="card overflow-hidden"><SceneArt art={t.coverArt} className="aspect-[3/1] w-full" /><div className="p-4"><h3 className="text-lg font-bold">{t.title}</h3><p className="text-sm text-mist">{t.passageRef} · {t.scenes.length} scenes</p><ActionForm action={fromTemplateAction.bind(null, t.slug)} submit="Use this template" submitClass="btn btn-primary btn-sm mt-3" className=""><span /></ActionForm></div></li>)}</ul></section>
      <section className="card card-pad max-w-xl"><h2 className="mb-2 text-lg font-bold">Start from scratch</h2><ActionForm action={blankStoryAction} submit="Create" submitClass="btn btn-ghost"><Field label="Title" name="title" required /><Field label="Main Bible passage" name="ref" required placeholder="John 3:1-21" /></ActionForm></section>
      <section><h2 className="mb-2 text-xl font-bold">My stories</h2>{mine.length ? <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Title</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{mine.map((s) => <tr key={s.id}><td>{s.title}</td><td><StatusBadge status={s.status} /></td><td>{s.updatedAt.toLocaleString()}</td><td><Link className="btn btn-primary btn-sm" href={`/studio/${s.id}`}>Open</Link></td></tr>)}</tbody></table></div> : <p className="text-mist">You have not created any stories yet.</p>}</section>
      {can(user.role, "media.manage") && <p className="text-sm text-mist">Optional AI animation planning is in <Link href="/admin/video">Admin → Animation</Link>. It is not needed for storybooks.</p>}
    </div>
  );
}
