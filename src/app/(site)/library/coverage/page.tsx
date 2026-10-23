import type { Metadata } from "next";
import Link from "next/link";
import { getDb, schema } from "@/server/db";
import { BOOKS, bookOfRef, parseRanges } from "@/lib/bible";
import { SitePageHeader } from "@/components/site-page-header";

export const metadata: Metadata = { title: "Coverage of all 66 books" };

export default async function Coverage() {
  const db = await getDb();
  const stories = await db.select({ slug: schema.stories.slug, title: schema.stories.title, ref: schema.stories.passageRef, tpl: schema.stories.isTemplate }).from(schema.stories);
  const lessons = await db.select({ slug: schema.lessons.slug, refs: schema.lessons.refs, level: schema.lessons.contentLevel }).from(schema.lessons);
  const rows = BOOKS.map((b) => {
    const st = stories.filter((s) => !s.tpl && parseRanges(s.ref).some((r) => r.book === b.i));
    const ls = lessons.filter((l) => l.refs.some((r) => bookOfRef(r) === b.i));
    return { b, st, full: ls.filter((l) => l.level === "complete").length, topics: ls.length };
  });
  const covered = rows.filter((r) => r.st.length).length;
  return (
    <div className="container-page py-10">
      <SitePageHeader id="coverage" vars={{ covered }} />
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Book</th><th>Kind of writing</th><th>Story / teaching units</th><th>Curriculum topics</th><th>Full lessons</th></tr></thead><tbody>
        {rows.map(({ b, st, full, topics }) => <tr key={b.i}><td className="font-semibold">{b.name}</td><td>{b.genre}</td><td>{st.length ? st.map((s) => <Link key={s.slug} href={`/stories/${s.slug}`} className="mr-2 inline-block">{s.title}</Link>) : <span className="badge badge-warn">Not yet developed</span>}</td><td>{topics}</td><td>{full}</td></tr>)}
      </tbody></table></div>
    </div>
  );
}
