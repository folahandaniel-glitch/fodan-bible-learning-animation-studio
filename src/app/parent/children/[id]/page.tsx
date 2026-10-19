import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { parentOwnsChild } from "@/server/services/auth";
import { getEntitlement } from "@/server/services/entitlements";
import { progressSummary } from "@/server/services/content";
import { studentHistory } from "@/server/services/exams";
import { myGameStats } from "@/server/services/games";
import { assignmentsForStudent } from "@/server/services/teaching";
import { Crumbs, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { getPassages } from "@/server/bible-data";
import { BibleText } from "@/components/bible-text";
import { GAME_CATALOG } from "@/content/site";

export const metadata = { title: "Child progress", robots: { index: false } };

export default async function Child({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["parent"]);
  if (!(await parentOwnsChild(user.id, id))) notFound(); // a parent can never see a child who is not linked to them
  const db = await getDb();
  const [kid] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  const [ent, prog, hist, games, assigns] = await Promise.all([getEntitlement(id), progressSummary(id, kid.classLevelSlug), studentHistory(id), myGameStats(id), assignmentsForStudent(id)]);
  const [cls] = kid.classLevelSlug ? await db.select().from(schema.classLevels).where(eq(schema.classLevels.slug, kid.classLevelSlug)) : [];
  const done = await db.select({ title: schema.lessons.title, at: schema.lessonProgress.completedAt }).from(schema.lessonProgress).innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId)).where(and(eq(schema.lessonProgress.userId, id), eq(schema.lessonProgress.status, "completed"))).orderBy(desc(schema.lessonProgress.completedAt)).limit(10);
  const att = await db.select({ status: schema.attendanceMarks.status }).from(schema.attendanceMarks).where(eq(schema.attendanceMarks.studentId, id));
  const present = att.filter((a) => a.status === "present" || a.status === "late").length;
  const verses = await db.select({ ref: schema.lessons.memoryVerseRef }).from(schema.lessonProgress).innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId)).where(and(eq(schema.lessonProgress.userId, id), eq(schema.lessonProgress.status, "completed"))).limit(5);
  const feedback = await db.select({ f: schema.examResponses.feedback }).from(schema.examResponses).innerJoin(schema.examAttempts, eq(schema.examAttempts.id, schema.examResponses.attemptId)).where(eq(schema.examAttempts.userId, id));
  return (
    <div className="space-y-6">
      <Crumbs items={[{ href: "/parent", label: "My children" }, { label: kid.displayName }]} />
      <PageHeader title={`${kid.displayName}'s progress`} subtitle={`${cls?.name ?? "No class"} · @${kid.username}`} actions={<span className={`badge ${ent.active ? "badge-ok" : "badge-warn"}`}>{ent.active ? "Plan active" : "No active plan"}</span>} />
      {!ent.active && <div className="alert alert-warn">{kid.displayName} cannot use lessons, quizzes, exams or games yet. <Link href="/plans" className="font-bold">Choose a plan</Link>. Reports remain available.</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad"><h2 className="text-lg font-bold">Lessons</h2>{prog.total ? <ProgressBar value={prog.done} max={prog.total} label="Lessons completed" /> : <p className="text-sm text-mist">No lessons are ready for this class yet.</p>}{done.length > 0 && <ul className="mt-3 space-y-1 text-sm">{done.map((d) => <li key={d.title}>✓ {d.title} <span className="text-mist">{d.at?.toDateString()}</span></li>)}</ul>}</section>
        <section className="card card-pad"><h2 className="text-lg font-bold">Attendance</h2>{att.length ? <p>{present} of {att.length} sessions attended ({Math.round((present / att.length) * 100)}%).</p> : <p className="text-sm text-mist">No attendance recorded yet.</p>}<h2 className="mt-4 text-lg font-bold">Games</h2>{games.length ? <ul className="text-sm">{games.map((g) => <li key={g.gameKey}>{GAME_CATALOG.find((x) => x.key === g.gameKey)?.name}: best {g.best}, played {g.plays} times</li>)}</ul> : <p className="text-sm text-mist">No games played yet.</p>}</section>
      </div>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Quiz and exam results</h2>{hist.filter((h) => h.a.status !== "in_progress").length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Exam</th><th>Date</th><th>Status</th><th>Score</th><th /></tr></thead><tbody>{hist.filter((h) => h.a.status !== "in_progress").map(({ a, e }) => <tr key={a.id}><td>{e.title}</td><td>{a.startedAt.toDateString()}</td><td><StatusBadge status={a.status} /></td><td>{a.needsManual ? "Awaiting marking" : a.percent != null ? `${a.percent}%` : "…"}</td><td><Link className="btn btn-ghost btn-sm" href={`/results/${a.id}`}>Details</Link></td></tr>)}</tbody></table></div> : <p className="text-sm text-mist">No results yet.</p>}</section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad"><h2 className="text-lg font-bold">Assignments</h2>{assigns.length ? <ul className="space-y-1 text-sm">{assigns.slice(0, 6).map(({ a, g }) => <li key={a.id}><strong>{a.title}</strong> ({g.name}){a.dueAt ? `, due ${a.dueAt.toDateString()}` : ""}</li>)}</ul> : <p className="text-sm text-mist">None.</p>}</section>
        <section className="card card-pad"><h2 className="text-lg font-bold">Teacher feedback</h2>{feedback.filter((f) => f.f).length ? <ul className="space-y-1 text-sm">{feedback.filter((f) => f.f).slice(0, 5).map((f, k) => <li key={k}>“{f.f}”</li>)}</ul> : <p className="text-sm text-mist">No written feedback yet.</p>}</section>
      </div>
      {verses.filter((v) => v.ref).length > 0 && <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Memory verses learned</h2><div className="grid gap-2 md:grid-cols-2">{verses.filter((v) => v.ref).map((v) => <BibleText key={v.ref} passages={getPassages(v.ref!, "kjv")} compact />)}</div></section>}
      <p className="text-xs text-mist">Use your browser&apos;s Print command to save this report as a PDF. Only you, {kid.displayName}&apos;s assigned teachers and authorised administrators can see these records.</p>
    </div>
  );
}
