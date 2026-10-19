import type { Metadata } from "next";
import Link from "next/link";
import { listStories } from "@/server/services/content";
import { optionalUser } from "@/server/guards";
import { SceneArt } from "@/components/scene-art";
import { PageHeader } from "@/components/ui";
import { getDb, schema } from "@/server/db";

export const metadata: Metadata = { title: "Bible story library" };

export default async function Stories({ searchParams }: { searchParams: Promise<{ q?: string; t?: string; c?: string }> }) {
  const sp = await searchParams;
  const user = await optionalUser();
  const db = await getDb();
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(schema.classLevels.sort);
  const stories = await listStories(user, { q: sp.q, testament: sp.t === "OT" || sp.t === "NT" ? sp.t : undefined, classSlug: sp.c });
  return (
    <div className="container-page py-10">
      <PageHeader kicker="Genesis to Revelation" title="Bible story library" subtitle="Stories and teaching units across the whole Bible, with passage-based background, discussion questions and memory verses. Books of law, poetry, prophecy and letters are taught in formats that suit them." actions={<Link href="/library/coverage" className="btn btn-ghost btn-sm">Coverage of all 66 books</Link>} />
      {!user && <div className="alert alert-info mb-6 text-sm">You are viewing the free public stories. <Link href="/register/student" className="font-bold">Register</Link> and choose a plan to open the whole library.</div>}
      <form className="card card-pad mb-6 grid gap-3 sm:grid-cols-4" role="search">
        <div className="sm:col-span-2"><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q} className="input" placeholder="Title, passage or word" /></div>
        <div><label className="label" htmlFor="t">Testament</label><select id="t" name="t" defaultValue={sp.t ?? ""} className="input"><option value="">All</option><option value="OT">Old Testament</option><option value="NT">New Testament</option></select></div>
        <div><label className="label" htmlFor="c">Class</label><select id="c" name="c" defaultValue={sp.c ?? ""} className="input"><option value="">All classes</option>{classes.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
        <div className="sm:col-span-4"><button className="btn btn-primary" type="submit">Filter</button></div>
      </form>
      <p className="mb-3 text-sm text-mist" aria-live="polite">{stories.length} stories</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((s) => (
          <li key={s.id}>
            <Link href={`/stories/${s.slug}`} className="card card-hover block h-full overflow-hidden no-underline">
              <SceneArt art={s.coverArt} className="aspect-[2/1] w-full" />
              <div className="p-4">
                <div className="flex flex-wrap gap-1"><span className="badge">{s.testament === "OT" ? "Old Testament" : "New Testament"}</span>{s.visibility === "public" ? <span className="badge badge-ok">Free</span> : !user && <span className="badge badge-warn">🔒</span>}</div>
                <h2 className="mt-2 text-lg font-bold">{s.title}</h2>
                <p className="text-sm text-mist">{s.passageRef}</p>
                <p className="mt-1 line-clamp-3 text-sm">{s.summary}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {!stories.length && <p className="mt-6 text-mist">No stories match. Try a different search.</p>}
    </div>
  );
}
