import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { getResult } from "@/server/services/exams";
import { PortalShell } from "@/components/shell";
import { navFor } from "@/app/account/layout";
import { Alert, PageHeader } from "@/components/ui";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";

export const metadata = { title: "Results", robots: { index: false } };

export default async function Results({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  const r = await getResult(user, attemptId); // enforces: the learner, their linked parent, their teacher, staff or the same organisation admin
  if (!r) notFound();
  const db = await getDb();
  const [who] = await db.select({ displayName: schema.users.displayName }).from(schema.users).where(eq(schema.users.id, r.attempt.userId));
  const own = r.attempt.userId === user.id;
  return (
    <PortalShell user={user} nav={navFor(user.role)}>
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title={r.exam.title} subtitle={own ? "Your results" : `Results for ${who?.displayName}`} />
        {!r.released ? (
          <Alert tone="info">{r.pendingMarking ? "Your answers are submitted. A teacher still needs to mark some of them, so the score is not final yet." : "Your answers have been submitted. The score will appear when your teacher releases the results."}</Alert>
        ) : (
          <>
            <div className={`card card-pad text-center ${r.passed ? "border-leaf bg-leaf-50" : "border-gold bg-sand"}`}>
              <p className="text-sm font-semibold uppercase tracking-wide text-mist">Score</p>
              <p className="text-5xl font-bold text-navy">{r.attempt.percent}%</p>
              <p className="mt-1">{r.attempt.score} of {r.attempt.maxScore} marks · {r.passed ? "Passed 🎉" : "Keep practising. You can improve!"}</p>
              {r.attempt.submittedAt && <p className="mt-1 text-xs text-mist">Time taken: {Math.max(1, Math.round((r.attempt.submittedAt.getTime() - r.attempt.startedAt.getTime()) / 60000))} min{r.attempt.autoSubmitted ? " · submitted automatically when time ran out" : ""}</p>}
              {r.passed && r.exam.kind !== "quiz" && own && <Link className="btn btn-gold mt-3" href={`/certificate/${attemptId}`}>🏅 Print my certificate</Link>}
            </div>
            {!!r.topics?.length && <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">By topic</h2><ul className="space-y-2">{r.topics.map((t) => <li key={t.topic} className="text-sm"><div className="flex justify-between"><span>{t.topic}</span><span>{t.correct}/{t.total}</span></div><div className="progress"><span style={{ width: `${(t.correct / t.total) * 100}%` }} /></div></li>)}</ul></section>}
            {!r.showExplanations && <Alert tone="info">Answer explanations are not shown for this exam{own ? " (they may need an active plan or the teacher's release)" : ""}.</Alert>}
            <section className="space-y-3"><h2 className="text-lg font-bold">Your answers</h2>
              {r.items?.map((it, k) => (
                <article key={it.qid} className="card card-pad">
                  <p className="text-sm font-semibold text-mist">Question {k + 1} {it.correct === true ? <span className="badge badge-ok">Correct</span> : it.correct === false ? <span className="badge badge-bad">Not correct</span> : <span className="badge badge-warn">Teacher marked: {it.marks}/{it.maxMarks}</span>}</p>
                  <h3 className="font-sans text-base font-bold">{it.text}</h3>
                  {it.options.length ? <ul className="mt-2 space-y-1 text-sm">{it.options.map((o) => <li key={o.id} className={`rounded-lg px-2 py-1 ${o.correct ? "bg-leaf-50 font-semibold text-[#0b5d51]" : o.chosen ? "bg-[#fff1f0]" : ""}`}>{o.chosen ? "▶ " : ""}{o.text}{r.showExplanations && o.correct ? " ✓" : ""}</li>)}</ul> : <p className="mt-2 whitespace-pre-line rounded-lg bg-sand p-2 text-sm">{Array.isArray(it.answer) ? it.answer.join(", ") : it.answer ?? "(no answer)"}</p>}
                  {it.feedback && <p className="mt-2 text-sm"><strong>Teacher feedback:</strong> {it.feedback}</p>}
                  {r.showExplanations && it.explanation && <p className="mt-2 rounded-lg bg-ivory p-2 text-sm"><strong>Explanation:</strong> {it.explanation}{it.ref ? ` (${it.ref})` : ""}</p>}
                </article>
              ))}
            </section>
          </>
        )}
        <p><Link href={own ? "/student/exams" : "/"} className="btn btn-ghost">Back</Link></p>
      </div>
    </PortalShell>
  );
}
