import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { ActionForm, Field, InlineAction, Select, TextArea } from "@/components/forms";
import { addTopicAction, archiveTopicAction, saveClassAction, topicOrderAction } from "@/app/actions/content";
import { Crumbs, PageHeader, StatusBadge } from "@/components/ui";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Manage class", robots: { index: false } };

export default async function ManageClass({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireAdmin("curriculum.write");
  const db = await getDb();
  const [c] = await db.select().from(schema.classLevels).where(eq(schema.classLevels.slug, slug));
  if (!c) notFound();
  const terms = await getSetting("terms");
  const topics = await db.select({ t: schema.topics, l: schema.lessons }).from(schema.topics).leftJoin(schema.lessons, eq(schema.lessons.topicId, schema.topics.id)).where(eq(schema.topics.classLevelId, c.id)).orderBy(asc(schema.topics.sort));
  return (
    <div className="space-y-6">
      <Crumbs items={[{ href: "/admin/curriculum", label: "Curriculum" }, { label: c.name }]} />
      <PageHeader title={`${c.name}: ${c.title}`} subtitle="Edit the class overview, then manage topics and lessons." />
      <details className="card card-pad"><summary className="cursor-pointer text-lg font-bold">Class overview and objectives</summary>
        <div className="mt-3"><ActionForm action={saveClassAction} submit="Save class" submitClass="btn btn-primary"><input type="hidden" name="id" value={c.id} />
          <div className="grid gap-3 md:grid-cols-2"><Field label="Name" name="name" defaultValue={c.name} required /><Field label="Title" name="title" defaultValue={c.title} required /><Field label="Age band" name="ageBand" defaultValue={c.ageBand} /></div>
          <TextArea label="Overview" name="overview" defaultValue={c.overview} rows={3} /><TextArea label="Purpose" name="purpose" defaultValue={c.purpose} rows={2} /><TextArea label="Objectives (one per line)" name="objectives" defaultValue={c.objectives.join("\n")} rows={4} /><TextArea label="Parent support notes" name="parentSupport" defaultValue={c.parentSupport} rows={3} /><TextArea label="Teacher preparation guide" name="teacherPrep" defaultValue={c.teacherPrep} rows={3} /></ActionForm></div></details>
      <details className="card card-pad"><summary className="cursor-pointer text-lg font-bold">Add a topic</summary>
        <div className="mt-3"><ActionForm action={addTopicAction} submit="Add topic" submitClass="btn btn-gold"><input type="hidden" name="classId" value={c.id} /><input type="hidden" name="classSlug" value={c.slug} /><div className="grid gap-3 md:grid-cols-3"><Field label="Title" name="title" required /><Field label="Main Bible passage" name="ref" placeholder="Genesis 1:1-31" /><Select label="Term" name="termNo" options={terms.map((t) => ({ value: String(t.n), label: t.name }))} /></div></ActionForm></div></details>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>#</th><th>Topic</th><th>Passage</th><th>Term</th><th>Lesson</th><th>Review</th><th /></tr></thead><tbody>
        {topics.map(({ t, l }) => (
          <tr key={t.id} className={t.archived ? "opacity-50" : ""}>
            <td>{t.sort}</td><td className="font-semibold">{t.title}</td><td className="text-xs">{t.primaryRef}</td><td>{terms.find((x) => x.n === t.termNo)?.name ?? t.termNo}</td>
            <td>{l ? <><StatusBadge status={l.contentLevel === "framework" ? "framework" : l.status} /></> : "—"}</td><td>{l && l.contentLevel === "complete" ? <StatusBadge status={l.reviewStatus} /> : ""}</td>
            <td className="space-x-1 whitespace-nowrap">{l && <Link className="btn btn-ghost btn-sm" href={`/admin/lessons/${l.id}`}>{l.contentLevel === "framework" ? "Write lesson" : "Edit"}</Link>}<InlineAction action={topicOrderAction} label="↑" hidden={{ id: t.id, dir: "up" }} /><InlineAction action={topicOrderAction} label="↓" hidden={{ id: t.id, dir: "down" }} /><InlineAction action={archiveTopicAction} label={t.archived ? "Restore" : "Archive"} hidden={{ id: t.id, restore: t.archived ? "1" : "0" }} confirm={t.archived ? undefined : "Archive this topic and hide its lesson? Learner records are kept."} /></td>
          </tr>
        ))}
      </tbody></table></div>
    </div>
  );
}
