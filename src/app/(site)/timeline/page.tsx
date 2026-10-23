import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { rawSetting } from "@/server/settings";
import { SitePageHeader } from "@/components/site-page-header";
import { BibleMap } from "@/components/bible-map";
import { SceneArt } from "@/components/scene-art";

export const metadata: Metadata = { title: "Bible timeline and map" };
const LEVEL: Record<string, string> = { strong: "badge-ok", moderate: "badge-info", debated: "badge-warn", none: "badge" };

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ era?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const meta = await rawSetting<{ intro: string; note: string; eras: { key: string; label: string }[] }>("timeline.meta", { intro: "", note: "", eras: [] });
  const all = await db.select().from(schema.timelineEvents).orderBy(asc(schema.timelineEvents.sort));
  const events = all.filter((e) => !sp.era || e.era === sp.era);
  return (
    <div className="container-page py-10">
      <SitePageHeader id="timeline" fallbackSubtitle={meta.intro} />
      <div className="alert alert-warn mb-6 text-sm"><strong>About dates:</strong> {meta.note} Events are shown in <em>biblical narrative order</em>. A date label marked &ldquo;uncertain&rdquo; is approximate or debated and is never presented as settled.</div>
      <nav aria-label="Periods" className="mb-6 flex flex-wrap gap-2"><Link href="/timeline" className={`btn btn-sm ${!sp.era ? "btn-navy" : "btn-ghost"}`}>All periods</Link>{meta.eras.map((e) => <Link key={e.key} href={`/timeline?era=${e.key}`} className={`btn btn-sm ${sp.era === e.key ? "btn-navy" : "btn-ghost"}`}>{e.label}</Link>)}</nav>
      <ol className="relative space-y-4 border-l-4 border-gold pl-6">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span aria-hidden className="absolute -left-[2.15rem] top-4 h-5 w-5 rounded-full border-4 border-gold bg-white" />
            <details className="card overflow-hidden">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-gold-700">{meta.eras.find((x) => x.key === e.era)?.label ?? e.era}</p><h2 className="text-lg font-bold">{e.title}</h2><p className="text-sm text-mist">{e.ref}</p></div>
                <span className={`badge ${e.dateBasis === "uncertain" ? "badge-warn" : "badge-info"}`}>{e.dateBasis === "uncertain" ? "Date uncertain" : "Proposed date"}</span>
              </summary>
              <div className="space-y-3 border-t border-line p-4">
                <p className="text-sm text-mist"><strong>When:</strong> {e.dateLabel}. {e.confidence}</p>
                <p>{e.summary}</p>
                <div><h3 className="font-bold">Why it matters</h3><p>{e.theology}</p></div>
                {!!e.people.length && <p className="text-sm"><strong>People:</strong> {e.people.join(", ")}</p>}
                {!!e.evidence.length && <div><h3 className="font-bold">What history and archaeology say</h3><ul className="mt-1 space-y-1.5 text-sm">{e.evidence.map((v) => <li key={v.item}><span className={`badge ${LEVEL[v.level] ?? ""} mr-2`}>{v.level}</span><strong>{v.item}.</strong> {v.note}</li>)}</ul></div>}
                {!!e.lessonSlugs.length && <div><h3 className="font-bold">Related lessons and stories</h3><ul className="mt-1 flex flex-wrap gap-2">{e.lessonSlugs.map((x) => { const [k, slug] = x.split(":"); return <li key={x}><Link className="btn btn-ghost btn-sm" href={k === "lesson" ? `/learn/${slug}` : `/stories/${slug}`}>{k === "lesson" ? "Lesson" : "Story"}: {slug.replace(/-/g, " ").slice(0, 40)}</Link></li>; })}</ul></div>}
              </div>
            </details>
          </li>
        ))}
      </ol>
      <section className="mt-12" aria-labelledby="map-h"><h2 id="map-h" className="mb-3 text-2xl font-bold">Bible lands map</h2><BibleMap /></section>
      <div className="mt-10 hidden"><SceneArt art="day:hills:sun" /></div>
    </div>
  );
}
