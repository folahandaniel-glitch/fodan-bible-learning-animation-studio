import Link from "next/link";
import { requireUser } from "@/server/guards";
import { listExamsFor, studentHistory } from "@/server/services/exams";
import { ActionForm } from "@/components/forms";
import { startExamAction } from "@/app/actions/exam";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Exams" };

export default async function StudentExams() {
  const user = await requireUser(["student"]);
  const [list, hist] = await Promise.all([listExamsFor(user), studentHistory(user.id)]);
  const shown = list.filter((x) => x.exam.kind !== "quiz");
  return (
    <div className="space-y-6">
      <PageHeader title="Exams and practice tests" subtitle="Answers are saved as you go and marked by the server. The timer is controlled by the server too." />
      {shown.length === 0 ? <Empty title="No exams available yet">Your teacher or the ministry will publish practice tests and exams here.</Empty> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map(({ exam, attempts, locked }) => {
            const done = attempts.filter((a) => a.status !== "in_progress").length;
            const open = attempts.find((a) => a.status === "in_progress" && a.deadlineAt > new Date());
            const left = exam.maxAttempts > 0 ? Math.max(0, exam.maxAttempts - done) : null;
            return (
              <li key={exam.id} className="card card-pad">
                <div className="flex flex-wrap gap-2"><span className="badge badge-info">{exam.kind.replace("_", " ")}</span>{exam.isFree && <span className="badge badge-ok">Free</span>}{locked && <span className="badge badge-warn">🔒 Needs a plan</span>}</div>
                <h2 className="mt-1 text-xl font-bold">{exam.title}</h2>
                <p className="text-sm text-mist">{exam.durationMin} minutes · {exam.maxAttempts > 0 ? `${left} attempt${left === 1 ? "" : "s"} left` : "unlimited attempts"}{exam.closesAt ? ` · closes ${exam.closesAt.toDateString()}` : ""}</p>
                {exam.description && <p className="mt-1 text-sm">{exam.description}</p>}
                <div className="mt-3">{locked ? <Link href="/plans" className="btn btn-gold btn-sm">Unlock with a plan</Link> : open ? <ActionForm action={startExamAction.bind(null, exam.id)} submit="Resume your attempt" submitClass="btn btn-gold btn-sm" className=""><span /></ActionForm> : left === 0 ? <span className="badge">All attempts used</span> : <ActionForm action={startExamAction.bind(null, exam.id)} submit={done ? "Try again" : "Start exam"} submitClass="btn btn-primary btn-sm" className=""><span /></ActionForm>}</div>
              </li>
            );
          })}
        </ul>
      )}
      <section><h2 className="mb-2 text-xl font-bold">My attempts</h2>
        {hist.filter((h) => h.e.kind !== "quiz").length ? <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Exam</th><th>Date</th><th>Status</th><th>Score</th><th /></tr></thead><tbody>{hist.filter((h) => h.e.kind !== "quiz").map(({ a, e }) => <tr key={a.id}><td>{e.title}</td><td>{a.startedAt.toDateString()}</td><td><StatusBadge status={a.status} /></td><td>{a.status === "in_progress" ? "…" : a.needsManual ? "Awaiting marking" : `${a.percent}%`}</td><td>{a.status !== "in_progress" && <Link className="btn btn-ghost btn-sm" href={`/results/${a.id}`}>View</Link>}</td></tr>)}</tbody></table></div> : <p className="text-mist">No attempts yet.</p>}
      </section>
    </div>
  );
}
