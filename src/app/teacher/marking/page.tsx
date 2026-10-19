import Link from "next/link";
import { requireUser } from "@/server/guards";
import { pendingManual } from "@/server/services/exams";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Marking" };

export default async function Marking() {
  const user = await requireUser(["teacher", "org_admin", "super_admin", "curriculum_admin"]);
  const rows = await pendingManual({ id: user.id, role: user.role, orgId: user.orgId, status: user.status, classLevelSlug: null });
  return (
    <div>
      <PageHeader title="Answers to mark" subtitle="Essay and short-answer questions waiting for a teacher." />
      {rows.length ? <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Learner</th><th>Exam</th><th>Submitted</th><th /></tr></thead><tbody>{rows.map(({ a, e, u }) => <tr key={a.id}><td>{u.displayName}</td><td>{e.title}</td><td>{a.submittedAt?.toLocaleString()}</td><td><Link href={`/teacher/marking/${a.id}`} className="btn btn-primary btn-sm">Mark</Link></td></tr>)}</tbody></table></div> : <Empty title="Nothing to mark">Written answers from your learners will appear here.</Empty>}
    </div>
  );
}
