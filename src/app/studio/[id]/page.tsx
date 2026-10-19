import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { loadForEdit, versionsOf } from "@/server/services/studio";
import { StoryEditor } from "@/components/story-editor";
import { ActionForm, Field, InlineAction } from "@/components/forms";
import { restoreVersionStoryAction, saveVersionAction, storyWorkflowAction } from "@/app/actions/studio";
import { Crumbs, PageHeader, StatusBadge } from "@/components/ui";
import { can } from "@/lib/permissions";
import Link from "next/link";

export const metadata = { title: "Edit story", robots: { index: false } };

export default async function EditStory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["teacher", "super_admin", "curriculum_admin", "content_editor"]);
  const u = { id: user.id, role: user.role, orgId: user.orgId };
  const s = await loadForEdit(u, id);
  if (!s) notFound();
  const versions = await versionsOf(u, id);
  const reviewer = can(user.role, "content.review");
  return (
    <div className="space-y-5">
      <Crumbs items={[{ href: "/studio", label: "Studio" }, { label: s.title }]} />
      <PageHeader title={s.title} subtitle={`Version ${s.version}`} actions={<><StatusBadge status={s.status} /><Link className="btn btn-ghost btn-sm" href={`/stories/${s.slug}`}>Open reader</Link></>} />
      <StoryEditor id={id} canPublishNote={!reviewer} initial={{ title: s.title, subtitle: s.subtitle, summary: s.summary, passageRef: s.passageRef, memoryVerseRef: s.memoryVerseRef ?? "", discussion: s.discussion, scenes: s.scenes, status: s.status }} />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Workflow</h2><div className="flex flex-wrap gap-2">
          {s.status === "draft" && <InlineAction action={storyWorkflowAction.bind(null, id, "review")} label="Submit for review" className="btn btn-primary btn-sm" />}
          {s.status === "review" && reviewer && <><InlineAction action={storyWorkflowAction.bind(null, id, "approved")} label="Approve" className="btn btn-primary btn-sm" /><InlineAction action={storyWorkflowAction.bind(null, id, "draft")} label="Back to draft" /></>}
          {s.status === "approved" && reviewer && <InlineAction action={storyWorkflowAction.bind(null, id, "published")} label="Publish" className="btn btn-primary btn-sm" />}
          {s.status === "published" && reviewer && <InlineAction action={storyWorkflowAction.bind(null, id, "draft")} label="Unpublish" />}
        </div><p className="mt-2 text-xs text-mist">Draft → review → approved → published. Published stories open to learners by their visibility setting.</p></section>
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Versions</h2>
          <ActionForm action={saveVersionAction.bind(null, id)} submit="Save a version" submitClass="btn btn-ghost btn-sm" className="flex flex-wrap items-end gap-2"><Field label="Note" name="note" /></ActionForm>
          <ul className="mt-2 space-y-1 text-sm">{versions.slice(0, 6).map((v) => <li key={v.id}>v{v.version} · {v.createdAt.toLocaleString()} <InlineAction action={restoreVersionStoryAction.bind(null, id)} label="Restore" hidden={{ version: v.id }} confirm="Restore this version? Your current text is saved first." /></li>)}</ul></section>
      </div>
    </div>
  );
}
