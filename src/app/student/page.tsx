import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { getEntitlement } from "@/server/services/entitlements";
import { progressSummary } from "@/server/services/content";
import { listExamsFor, studentHistory, classSort } from "@/server/services/exams";
import { assignmentsForStudent } from "@/server/services/teaching";
import { getPassages } from "@/server/bible-data";
import { MEMORY_VERSES } from "@/content/question-bank";
import { expandClasses } from "@/content/story-types";
import { Empty, ProgressBar, Stat } from "@/components/ui";
import { SceneArt } from "@/components/scene-art";
import { BibleText } from "@/components/bible-text";
import { getSetting } from "@/server/settings";

export const metadata = { title: "My dashboard" };

export default async function StudentHome() {
  const user = await requireUser(["student"]);
  const db = await getDb();
  const [ent, prog, exams, hist, assigns, terms] = await Promise.all([getEntitlement(user.id), progressSummary(user.id, user.classLevelSlug), listExamsFor(user), studentHistory(user.id), assignmentsForStudent(user.id), getSetting("terms")]);
  const [cls] = user.classLevelSlug ? await db.select().from(schema.classLevels).where(eq(schema.classLevels.slug, user.classLevelSlug)) : [];
  const idx = classSort(user.classLevelSlug);
  const primary = idx > 0 && idx <= 6;
  const week = Math.floor(Date.now() / (7 * 86_400_000));
  const pool = MEMORY_VERSES.filter((v) => !user.classLevelSlug || expandClasses(v.cl).includes(user.classLevelSlug));
  const mv = pool.length ? pool[week % pool.length] : MEMORY_VERSES[0];
  const verse = getPassages(mv.ref, "kjv");
  const recent = hist.filter((h) => h.a.status !== "in_progress" && h.a.percent != null).slice(0, 3);
  const weak = await db.select({ topic: schema.questions.topic, correct: schema.examResponses.correct }).from(schema.examResponses).innerJoin(schema.examAttempts, eq(schema.examAttempts.id, schema.examResponses.attemptId)).innerJoin(schema.questions, eq(schema.questions.id, schema.examResponses.questionId)).where(and(eq(schema.examAttempts.userId, user.id)));
  const topicMap = new Map<string, { c: number; t: number }>();
  for (const w of weak) { if (!w.topic || w.correct === null) continue; const x = topicMap.get(w.topic) ?? { c: 0, t: 0 }; x.t++; if (w.correct) x.c++; topicMap.set(w.topic, x); }
  const revise = [...topicMap].filter(([, v]) => v.t >= 2 && v.c / v.t < 0.6).map(([k]) => k).slice(0, 3);
  const upcoming = exams.filter((e) => e.exam.status === "published" && e.attempts.filter((a) => a.status !== "in_progress").length < (e.exam.maxAttempts || 99)).slice(0, 3);
  const certs = hist.filter((h) => h.a.percent != null && h.a.percent >= h.e.passMark && h.e.kind !== "quiz");
  const tile = "card card-hover block p-4 no-underline text-center";
  return (
    <div className="space-y-6">
      <header className="hero-bg overflow-hidden rounded-3xl text-ivory">
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_16rem]">
          <div className="p-6">
            <p className="text-sm text-gold">{cls ? `${cls.name} · ${terms[0]?.name ?? "Term 1"}` : "Welcome"}</p>
            <h1 className="mt-1 text-3xl font-bold !text-ivory sm:text-4xl">Hello, {user.displayName}! 👋</h1>
            <p className="mt-2 text-[#d9dff0]">{prog.next ? <>Next lesson: <strong>{prog.next.title}</strong></> : prog.total ? "You have finished every ready lesson in your class. Try a game or an exam!" : "Lessons for your class are being prepared."}</p>
            {prog.next && <Link href={`/learn/${prog.next.slug}`} className="btn btn-gold mt-4">Continue learning</Link>}
          </div>
          <SceneArt art="dawn:hills:sun,book" className="hidden h-full w-full sm:block" />
        </div>
      </header>

      {!ent.active && (
        <div className="alert alert-warn"><strong>Your plan is not active yet.</strong> You can try the free sample lessons. Ask your parent or guardian to open <Link href="/plans" className="font-bold">Plans</Link>, or enter a scholarship code in <Link href="/account/billing" className="font-bold">Billing</Link>. Everything else opens as soon as payment is confirmed.</div>
      )}

      <section aria-label="Quick links" className={`grid gap-3 ${primary ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
        {[{ href: "/learn", t: "Lessons", e: "📖", art: "day:hills:book" }, { href: "/stories", t: "Bible stories", e: "🌅", art: "dawn:hills:sun" }, { href: "/student/games", t: "Games", e: "🎮", art: "night:hills:stars" }, { href: "/student/exams", t: "Exams", e: "📝", art: "day:city:scroll" }].map((x) => (
          <Link key={x.href} href={x.href} className={tile}>{primary ? <SceneArt art={x.art} className="mb-2 aspect-[2/1] w-full rounded-lg" /> : <div className="text-3xl" aria-hidden>{x.e}</div>}<span className={`font-bold text-navy ${primary ? "text-xl" : ""}`}>{x.t}</span></Link>
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Lessons finished" value={`${prog.done}/${prog.total}`} />
        <Stat label="Exams taken" value={hist.filter((h) => h.a.status !== "in_progress").length} />
        <Stat label="Certificates" value={certs.length} />
      </div>
      {prog.total > 0 && <div className="card card-pad"><h2 className="mb-2 text-lg font-bold">My progress in {cls?.name}</h2><ProgressBar value={prog.done} max={prog.total} label="Lessons completed" /></div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Memory verse of the week</h2><BibleText passages={verse} compact /></section>
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Assignments from my teacher</h2>{assigns.length ? <ul className="space-y-2">{assigns.slice(0, 5).map(({ a, g }) => <li key={a.id} className="rounded-lg bg-sand p-2 text-sm"><strong>{a.title}</strong> <span className="text-mist">({g.name}{a.dueAt ? `, due ${a.dueAt.toDateString()}` : ""})</span></li>)}</ul> : <p className="text-sm text-mist">Nothing assigned right now.</p>}</section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Upcoming exams</h2>{upcoming.length ? <ul className="space-y-2">{upcoming.map(({ exam }) => <li key={exam.id} className="flex items-center justify-between gap-2 text-sm"><span>{exam.title} <span className="text-mist">({exam.durationMin} min)</span></span><Link href="/student/exams" className="btn btn-ghost btn-sm">Open</Link></li>)}</ul> : <p className="text-sm text-mist">No exams to take right now.</p>}</section>
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Recent results</h2>{recent.length ? <ul className="space-y-2">{recent.map(({ a, e }) => <li key={a.id} className="flex items-center justify-between gap-2 text-sm"><span>{e.title}</span><Link href={`/results/${a.id}`} className="btn btn-ghost btn-sm">{a.percent}% · view</Link></li>)}</ul> : <p className="text-sm text-mist">Your results will show here after your first exam.</p>}</section>
      </div>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Good topics to revise</h2>{revise.length ? <ul className="flex flex-wrap gap-2">{revise.map((t) => <li key={t} className="badge badge-warn">{t}</li>)}</ul> : <p className="text-sm text-mist">Great job. After a few exams, topics that need more practice will appear here to help you improve.</p>}</section>
      {certs.length > 0 && <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">My certificates</h2><ul className="flex flex-wrap gap-2">{certs.slice(0, 6).map(({ a, e }) => <li key={a.id}><Link className="btn btn-ghost btn-sm" href={`/certificate/${a.id}`}>🏅 {e.title}</Link></li>)}</ul></section>}
      {!user.classLevelSlug && <Empty title="Choose your class">Ask a parent or teacher to set your class in your account.</Empty>}
    </div>
  );
}
