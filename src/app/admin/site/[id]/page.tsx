import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/guards";
import { pageVersions, pageWithDraft, sectionTypes } from "@/server/services/site";
import { ActionForm, Check, Field, InlineAction, Select } from "@/components/forms";
import { SectionEditor } from "@/components/content-editor";
import { addSectionAction, pageMetaAction, publishPageAction, restoreVersionAction, sectionOpAction } from "@/app/actions/content";
import { Crumbs, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Edit page", robots: { index: false } };
type J = string | number | boolean | null | J[] | { [k: string]: J };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin("site.edit");
  const data = await pageWithDraft(id);
  if (!data) notFound();
  const { page, sections } = data;
  const versions = await pageVersions(id);
  const previewHref = page.kind === "home" ? "/?preview=draft" : `/p/${page.slug}?preview=draft`;
  const unpublished = sections.some((s) => JSON.stringify(s.draft) !== JSON.stringify(s.published) || s.hidden !== (s.publishedHidden ?? true) || !!s.deletedAt);
  return (
    <div className="space-y-6">
      <Crumbs items={[{ href: "/admin/site", label: "Pages" }, { label: page.title }]} />
      <PageHeader title={page.title} subtitle={unpublished ? "You have changes that visitors cannot see yet." : "Everything is published."} actions={<><StatusBadge status={page.status} /><Link className="btn btn-ghost btn-sm" href={previewHref} target="_blank">Preview draft</Link><Link className="btn btn-ghost btn-sm" href={`/admin/site/${id}/preview`}>Desktop, tablet and phone preview</Link></>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card card-pad lg:col-span-2"><h2 className="mb-2 text-lg font-bold">Publish</h2>
          <ActionForm action={publishPageAction.bind(null, id)} submit="Publish now" submitClass="btn btn-gold"><Field label="Or schedule for (optional)" name="publishAt" type="datetime-local" hint="Leave empty to publish immediately." /></ActionForm></section>
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Versions</h2>
          {versions.length ? <ul className="space-y-1 text-sm">{versions.slice(0, 5).map((v) => <li key={v.id}>{v.createdAt.toLocaleString()} <InlineAction action={restoreVersionAction.bind(null, id)} label="Restore" hidden={{ version: v.id }} confirm="Restore this version as your draft?" /></li>)}</ul> : <p className="text-sm text-mist">A version is saved each time you publish.</p>}</section>
      </div>
      <details className="card card-pad"><summary className="cursor-pointer text-lg font-bold">Page settings and search appearance (SEO)</summary>
        <div className="mt-3"><ActionForm action={pageMetaAction.bind(null, id)} submit="Save settings" submitClass="btn btn-primary btn-sm"><div className="grid gap-3 md:grid-cols-2"><Field label="Page title" name="title" defaultValue={page.title} /><Field label="Address" name="slug" defaultValue={page.slug} hint={page.kind === "home" ? "The homepage address cannot change." : "Letters, numbers and dashes."} /><Field label="Search title" name="seoTitle" defaultValue={page.seoTitle ?? ""} /><Field label="Search description" name="seoDescription" defaultValue={page.seoDescription ?? ""} /></div><Check name="showInNav" label="Show in the main menu" defaultChecked={page.showInNav} /></ActionForm></div></details>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Add a section</h2>
        <ActionForm action={addSectionAction.bind(null, id)} submit="Add section" submitClass="btn btn-gold btn-sm"><Select label="Section type" name="type" options={sectionTypes.map((t) => ({ value: t, label: t }))} /></ActionForm></section>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <article key={s.id} className={`card card-pad ${s.deletedAt ? "opacity-60" : ""}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-sans text-base font-bold">{i + 1}. {s.type} {s.hidden && <span className="badge badge-warn">hidden</span>} {s.deletedAt && <span className="badge badge-bad">deleted</span>}{JSON.stringify(s.draft) !== JSON.stringify(s.published) && !s.deletedAt && <span className="badge badge-info">unpublished changes</span>}</h2>
              <div className="flex flex-wrap gap-1">
                {s.deletedAt ? <InlineAction action={sectionOpAction.bind(null, id)} label="Restore" hidden={{ id: s.id, op: "restore" }} /> : <>
                  <InlineAction action={sectionOpAction.bind(null, id)} label="↑" hidden={{ id: s.id, op: "up" }} /><InlineAction action={sectionOpAction.bind(null, id)} label="↓" hidden={{ id: s.id, op: "down" }} />
                  <InlineAction action={sectionOpAction.bind(null, id)} label={s.hidden ? "Show" : "Hide"} hidden={{ id: s.id, op: s.hidden ? "show" : "hide" }} /><InlineAction action={sectionOpAction.bind(null, id)} label="Duplicate" hidden={{ id: s.id, op: "dup" }} /><InlineAction action={sectionOpAction.bind(null, id)} label="Delete" confirm="Delete this section? You can restore it later." hidden={{ id: s.id, op: "del" }} /></>}
              </div>
            </div>
            {!s.deletedAt && <details><summary className="cursor-pointer font-semibold text-royal">Edit content</summary><div className="mt-3"><SectionEditor sectionId={s.id} pageId={id} initial={s.draft as Record<string, J>} audience={s.audience} /></div></details>}
            {["wings", "classes", "faq", "events", "testimonials", "storybook", "timeline", "featured"].includes(s.type) && <p className="mt-2 text-xs text-mist">This section shows live data. Edit its heading here; edit the items under their own menu (wings, FAQs, events, testimonies).</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
