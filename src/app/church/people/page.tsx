import { requireUser } from "@/server/guards";
import { orgUsers } from "@/server/services/teaching";
import { InlineAction } from "@/components/forms";
import { approveTeacherAction } from "@/app/actions/teaching";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Teachers and learners" };

export default async function People() {
  const user = await requireUser(["org_admin"]);
  const [teachers, students] = user.orgId ? await Promise.all([orgUsers(user.orgId, "teacher"), orgUsers(user.orgId, "student")]) : [[], []];
  return (
    <div className="space-y-6">
      <PageHeader title="Teachers and learners" subtitle="People who registered with your organisation." />
      <section><h2 className="mb-2 text-lg font-bold">Teachers</h2>
        <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th /></tr></thead><tbody>{teachers.map((t) => <tr key={t.id}><td>{t.fullName}</td><td>{t.email}</td><td><StatusBadge status={t.status} /></td><td className="space-x-2">{t.status === "pending" && <><InlineAction action={approveTeacherAction} label="Approve" className="btn btn-primary btn-sm" hidden={{ teacherId: t.id, decision: "approve" }} /><InlineAction action={approveTeacherAction} label="Decline" hidden={{ teacherId: t.id, decision: "decline" }} confirm="Decline this teacher?" /></>}</td></tr>)}{!teachers.length && <tr><td colSpan={4} className="text-mist">No teachers yet. Share an invitation code.</td></tr>}</tbody></table></div></section>
      <section><h2 className="mb-2 text-lg font-bold">Learners</h2>
        <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Username</th><th>Class</th><th>Status</th></tr></thead><tbody>{students.map((s) => <tr key={s.id}><td>{s.fullName}</td><td>@{s.username}</td><td>{s.classLevelSlug}</td><td><StatusBadge status={s.status} /></td></tr>)}{!students.length && <tr><td colSpan={4} className="text-mist">No learners yet.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
