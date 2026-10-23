import type { Metadata } from "next";
import Link from "next/link";
import { listClasses, unreviewedCounts } from "@/server/services/content";
import { SitePageHeader } from "@/components/site-page-header";

export const metadata: Metadata = { title: "Classes and curriculum", description: "The Primary 1 to SSS 3 Bible curriculum." };

export default async function ClassesPage() {
  const [classes, counts] = await Promise.all([listClasses(), unreviewedCounts()]);
  const stages = [...new Set(classes.map((c) => c.stage))];
  return (
    <div className="container-page py-10">
      <SitePageHeader id="classes" />
      <div className="alert alert-info mb-8 text-sm">
        <strong>Honest status:</strong> the curriculum <em>framework</em> (classes, terms, topics, passages) is complete for all 12 classes. Full lessons are being written and reviewed in stages: {classes.reduce((a, c) => a + c.readyCount, 0)} lessons are ready now, and {counts.lessons} of them are still awaiting the ministry&apos;s theological review.
      </div>
      {stages.map((st) => (
        <section key={st} className="mb-10" aria-labelledby={`st-${st}`}>
          <h2 id={`st-${st}`} className="mb-3 text-xl font-bold">{st}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.filter((c) => c.stage === st).map((c) => (
              <li key={c.id}>
                <Link href={`/classes/${c.slug}`} className="card card-hover block h-full p-5 no-underline">
                  <p className="text-xs font-bold uppercase tracking-wide text-gold-700">{c.ageBand}</p>
                  <h3 className="text-2xl font-bold">{c.name}</h3>
                  <p className="font-display text-lg text-navy">{c.title}</p>
                  <p className="mt-2 text-sm text-ink">{c.overview}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><span className="badge">{c.topicCount} topics</span><span className={`badge ${c.readyCount ? "badge-ok" : "badge-warn"}`}>{c.readyCount} lessons ready</span></div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
