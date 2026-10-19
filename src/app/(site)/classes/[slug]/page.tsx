import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassOutline } from "@/server/services/content";
import { getSetting } from "@/server/settings";
import { Crumbs, StatusBadge } from "@/components/ui";
import { optionalUser } from "@/server/guards";
import { isStaffRole } from "@/lib/permissions";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = await getClassOutline((await params).slug);
  return { title: o ? `${o.cls.name}: ${o.cls.title}` : "Class" };
}

export default async function ClassPage({ params }: P) {
  const o = await getClassOutline((await params).slug);
  if (!o) notFound();
  const [terms, user] = await Promise.all([getSetting("terms"), optionalUser()]);
  const staff = !!user && isStaffRole(user.role);
  const { cls, topics } = o;
  return (
    <div className="container-page py-10">
      <Crumbs items={[{ href: "/classes", label: "Classes" }, { label: cls.name }]} />
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gold-700">{cls.stage} · {cls.ageBand}</p>
        <h1 className="text-3xl font-bold sm:text-4xl">{cls.name}: {cls.title}</h1>
        <p className="mt-3 max-w-3xl text-lg">{cls.overview}</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {terms.map((t) => {
            const list = topics.filter((x) => x.termNo === t.n);
            if (!list.length) return null;
            return (
              <section key={t.n} className="mb-8" aria-labelledby={`t${t.n}`}>
                <h2 id={`t${t.n}`} className="mb-3 text-xl font-bold">{t.name}</h2>
                <ol className="space-y-2">
                  {list.map((tp) => {
                    const ready = tp.lesson && tp.lesson.contentLevel === "complete" && tp.lesson.status === "published";
                    const visible = ready || (staff && tp.lesson);
                    return (
                      <li key={tp.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
                        <div>
                          <p className="font-semibold text-navy">{tp.sort}. {tp.title}</p>
                          <p className="text-xs text-mist">{tp.primaryRef}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {ready ? (
                            <>{tp.lesson!.isFree && <span className="badge badge-ok">Free sample</span>}{tp.lesson!.reviewStatus !== "approved" && <span className="badge badge-warn" title="Awaiting ministry theological review">Draft content</span>}<Link href={`/learn/${tp.lesson!.slug}`} className="btn btn-primary btn-sm">Open lesson</Link></>
                          ) : visible ? <><StatusBadge status={tp.lesson!.status} /><Link href={`/learn/${tp.lesson!.slug}`} className="btn btn-ghost btn-sm">Preview</Link></> : <span className="badge badge-warn">Lesson in development</span>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
        <aside className="space-y-4">
          <div className="card card-pad"><h2 className="text-lg font-bold">Class objectives</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{cls.objectives.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="card card-pad"><h2 className="text-lg font-bold">How learners are assessed</h2><ul className="mt-2 space-y-2 text-sm">{cls.assessmentRubric.map((r) => <li key={r.criterion}><strong>{r.criterion}.</strong> {r.description}</li>)}</ul></div>
          <div className="card card-pad"><h2 className="text-lg font-bold">Supporting at home</h2><p className="mt-2 text-sm">{cls.parentSupport}</p></div>
          <div className="card card-pad bg-sand"><h2 className="text-lg font-bold">Ready to learn?</h2><p className="mt-1 text-sm text-mist">Register and choose a plan to open the full lessons, quizzes and examinations.</p><div className="mt-3 flex gap-2"><Link href="/register/student" className="btn btn-gold btn-sm">Register</Link><Link href="/plans" className="btn btn-ghost btn-sm">Plans</Link></div></div>
        </aside>
      </div>
    </div>
  );
}
