import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { InlineAction } from "@/components/forms";
import { storyStatusAction, storyVisibilityAction } from "@/app/actions/content";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Stories", robots: { index: false } };

export default async function AdminStories({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireAdmin("stories.write");
  const sp = await searchParams;
  const db = await getDb();
  const rows = await db.select().from(schema.stories).where(and(eq(schema.stories.isTemplate, false), sp.s ? eq(schema.stories.status, sp.s as never) : undefined)).orderBy(asc(schema.stories.createdAt));
  return (
    <div className="space-y-4">
      <PageHeader title="Stories and teaching units" subtitle={`${rows.length} shown. Public stories are free for everyone and may appear on the homepage. Everything else needs an active plan.`} actions={<Link className="btn btn-gold" href="/studio">Open the story studio</Link>} />
      <nav className="flex flex-wrap gap-2">{["", "draft", "review", "approved", "published", "archived"].map((s) => <Link key={s} href={s ? `/admin/stories?s=${s}` : "/admin/stories"} className={`btn btn-sm ${(sp.s ?? "") === s ? "btn-navy" : "btn-ghost"}`}>{s || "All"}</Link>)}</nav>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Story</th><th>Passage</th><th>Status</th><th>Review</th><th>Who can read</th><th /></tr></thead><tbody>
        {rows.map((s) => <tr key={s.id}><td className="font-semibold">{s.title}</td><td className="text-xs">{s.passageRef}</td><td><StatusBadge status={s.status} /></td><td><StatusBadge status={s.reviewStatus} /></td><td><InlineAction action={storyVisibilityAction} label={s.visibility === "public" ? "Public (make members-only)" : "Members (make public)"} hidden={{ id: s.id, visibility: s.visibility === "public" ? "members" : "public" }} /></td>
          <td className="space-x-1 whitespace-nowrap"><Link className="btn btn-ghost btn-sm" href={`/studio/${s.id}`}>Edit</Link>{s.status !== "published" ? <InlineAction action={storyStatusAction} label="Publish" className="btn btn-primary btn-sm" hidden={{ id: s.id, to: "published" }} /> : <InlineAction action={storyStatusAction} label="Unpublish" hidden={{ id: s.id, to: "draft" }} />}<InlineAction action={storyStatusAction} label="Archive" hidden={{ id: s.id, to: "archived" }} confirm="Archive this story?" /></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
