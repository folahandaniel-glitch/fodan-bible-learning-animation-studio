import Link from "next/link";
import { requireAdmin } from "@/server/guards";
import { listPages } from "@/server/services/site";
import { ActionForm, Field } from "@/components/forms";
import { createPageAction } from "@/app/actions/content";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Homepage and pages", robots: { index: false } };

export default async function SitePages() {
  await requireAdmin("site.edit");
  const pages = await listPages();
  return (
    <div className="space-y-6">
      <PageHeader title="Homepage and pages" subtitle="Every section of the homepage and of your own pages can be edited, reordered, hidden, previewed and published without touching code." />
      <section className="card card-pad max-w-xl"><h2 className="mb-2 text-lg font-bold">Create a new page</h2><ActionForm action={createPageAction} submit="Create page" submitClass="btn btn-gold"><Field label="Title" name="title" required /><Field label="Address (letters, numbers and dashes)" name="slug" required placeholder="our-story" hint="It will appear at /p/our-story" /></ActionForm></section>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Page</th><th>Address</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>
        {pages.map((p) => <tr key={p.id}><td className="font-semibold">{p.title}</td><td className="font-mono text-xs">{p.kind === "home" ? "/" : `/p/${p.slug}`}</td><td><StatusBadge status={p.status} /></td><td>{p.updatedAt.toLocaleDateString()}</td><td><Link className="btn btn-primary btn-sm" href={`/admin/site/${p.id}`}>Edit</Link></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
