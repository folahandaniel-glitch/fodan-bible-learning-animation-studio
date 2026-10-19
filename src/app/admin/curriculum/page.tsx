import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Curriculum", robots: { index: false } };

export default async function CurriculumAdmin() {
  await requireAdmin("curriculum.write");
  const db = await getDb();
  const classes = await db.select().from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  const rows = await db.select({ c: schema.lessons.classLevelId, level: schema.lessons.contentLevel, status: schema.lessons.status, review: schema.lessons.reviewStatus, n: sql<number>`count(*)::int` }).from(schema.lessons).groupBy(schema.lessons.classLevelId, schema.lessons.contentLevel, schema.lessons.status, schema.lessons.reviewStatus);
  const total = rows.reduce((a, r) => a + r.n, 0), complete = rows.filter((r) => r.level === "complete").reduce((a, r) => a + r.n, 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Curriculum" subtitle={`${classes.length} classes, ${total} topics. ${complete} have full lesson content; the rest are framework entries. Framework entries are never shown to learners and are not counted as complete.`} />
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Class</th><th>Topics</th><th>Full lessons</th><th>Published</th><th>Reviewed</th><th /></tr></thead><tbody>
        {classes.map((c) => { const m = rows.filter((r) => r.c === c.id); const n = (f: (r: (typeof rows)[number]) => boolean) => m.filter(f).reduce((a, r) => a + r.n, 0); return <tr key={c.id}><td><strong>{c.name}</strong><div className="text-xs text-mist">{c.title}</div></td><td>{n(() => true)}</td><td>{n((r) => r.level === "complete")}</td><td>{n((r) => r.status === "published")}</td><td>{n((r) => r.review === "approved")}</td><td><Link className="btn btn-primary btn-sm" href={`/admin/curriculum/${c.slug}`}>Manage</Link></td></tr>; })}
      </tbody></table></div>
      <p className="text-sm text-mist">Lesson workflow: <strong>draft → under review → approved → published</strong>. Only a Super Admin or Curriculum Administrator can approve or publish. AI-drafted content stays marked as unreviewed until a reviewer records the theological review.</p>
    </div>
  );
}
