import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { myGroups, orgUsers } from "@/server/services/teaching";
import { PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Church or school overview" };

export default async function ChurchHome() {
  const user = await requireUser(["org_admin"]);
  const db = await getDb();
  const [org] = user.orgId ? await db.select().from(schema.organizations).where(eq(schema.organizations.id, user.orgId)) : [];
  const [teachers, students, groups] = user.orgId ? await Promise.all([orgUsers(user.orgId, "teacher"), orgUsers(user.orgId, "student"), myGroups({ id: user.id, role: user.role, orgId: user.orgId, status: user.status })]) : [[], [], []];
  const subs = user.orgId ? await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.orgId, user.orgId)) : [];
  const live = subs.filter((s) => s.status === "active" && s.endsAt > new Date());
  const pending = teachers.filter((t) => t.status === "pending");
  return (
    <div className="space-y-6">
      <PageHeader title={org?.name ?? "Your organisation"} subtitle={org?.status === "active" ? "Manage classes, teachers and learners for your own church or school." : "Your organisation is waiting for approval by the Super Admin."} />
      <div className="grid gap-4 sm:grid-cols-4"><Stat label="Classes" value={groups.length} /><Stat label="Teachers" value={teachers.filter((t) => t.status === "active").length} sub={pending.length ? `${pending.length} waiting for approval` : undefined} tone={pending.length ? "warn" : undefined} /><Stat label="Learners" value={students.length} /><Stat label="Licence" value={live.length ? "Active" : "None"} sub={live[0] ? `${live[0].seats} seats, until ${live[0].endsAt.toDateString()}` : "Choose a church or school plan"} /></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/church/classes" className="card card-hover card-pad no-underline"><h2 className="text-lg font-bold">Classes</h2><p className="text-sm text-mist">Create classes, assign teachers, add learners.</p></Link>
        <Link href="/church/people" className="card card-hover card-pad no-underline"><h2 className="text-lg font-bold">Teachers and learners</h2><p className="text-sm text-mist">Approve teachers and review your members.</p></Link>
        <Link href="/church/keys" className="card card-hover card-pad no-underline"><h2 className="text-lg font-bold">Invitation codes</h2><p className="text-sm text-mist">Invite teachers and learners to join your organisation.</p></Link>
      </div>
    </div>
  );
}
