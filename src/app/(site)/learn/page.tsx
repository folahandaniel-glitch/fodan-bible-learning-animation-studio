import type { Metadata } from "next";
import { SitePageHeader } from "@/components/site-page-header";
import Link from "next/link";
import { getClassOutline, listClasses, progressSummary } from "@/server/services/content";
import { optionalUser } from "@/server/guards";
import { getEntitlement } from "@/server/services/entitlements";
import { Crumbs, ProgressBar } from "@/components/ui";
import { getDb, schema } from "@/server/db";
import { and, eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Lessons" };

export default async function LearnIndex({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const user = await optionalUser();
  const sp = await searchParams;
  const classes = await listClasses();
  const slug = sp.class ?? user?.classLevelSlug ?? "primary-1";
  const outline = await getClassOutline(slug);
  const ent = user ? await getEntitlement(user.id) : null;
  const prog = user ? await progressSummary(user.id, slug) : null;
  let done = new Set<string>();
  if (user && outline) {
    const db = await getDb();
    const rows = await db.select().from(schema.lessonProgress).where(and(eq(schema.lessonProgress.userId, user.id), eq(schema.lessonProgress.status, "completed")));
    done = new Set(rows.map((r) => r.lessonId));
  }
  const ready = outline?.topics.filter((t) => t.lesson?.status === "published" && t.lesson.contentLevel === "complete") ?? [];
  return (
    <div className="container-page py-10">
      <Crumbs items={[{ label: "Lessons" }]} />
      <SitePageHeader id="lessons" />
      <nav aria-label="Classes" className="mb-6 flex flex-wrap gap-2">{classes.map((c) => <Link key={c.id} href={`/learn?class=${c.slug}`} aria-current={c.slug === slug ? "page" : undefined} className={`btn btn-sm ${c.slug === slug ? "btn-navy" : "btn-ghost"}`}>{c.name}</Link>)}</nav>
      {user?.role === "student" && !ent?.active && <div className="alert alert-warn mb-6">Your plan is not active yet, so only free sample lessons open. <Link href="/plans" className="font-bold">Choose a plan</Link> to unlock everything.</div>}
      {prog && prog.total > 0 && <div className="card card-pad mb-6 max-w-xl"><p className="mb-2 font-semibold">Your progress in {outline?.cls.name}</p><ProgressBar value={prog.done} max={prog.total} label="Lessons completed" /></div>}
      {!ready.length ? <p className="text-mist">No full lessons are ready for this class yet. The framework of topics is on the <Link href={`/classes/${slug}`}>class page</Link>.</p> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ready.map((t) => (
            <li key={t.id}><Link href={`/learn/${t.lesson!.slug}`} className="card card-hover flex items-center justify-between gap-3 p-4 no-underline"><div><p className="font-bold text-navy">{t.title}</p><p className="text-xs text-mist">{t.primaryRef}</p></div><div className="flex flex-col items-end gap-1">{t.lesson!.isFree && <span className="badge badge-ok">Free</span>}{done.has(t.lesson!.id) && <span className="badge badge-ok">✓ Done</span>}{!t.lesson!.isFree && !ent?.active && <span className="badge badge-warn">🔒 Plan</span>}</div></Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
