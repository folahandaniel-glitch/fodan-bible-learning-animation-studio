import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { myGroups, trainingStatus } from "@/server/services/teaching";
import { pendingManual } from "@/server/services/exams";
import { Empty, PageHeader, Stat } from "@/components/ui";
import { getDb, schema } from "@/server/db";

export const metadata = { title: "Teacher dashboard" };

export default async function TeacherHome() {
  const user = await requireUser(["teacher"]);
  const t = { id: user.id, role: user.role, orgId: user.orgId, status: user.status };
  const [groups, marking, training] = await Promise.all([myGroups(t), pendingManual({ id: user.id, role: user.role, orgId: user.orgId, status: user.status, classLevelSlug: null }), trainingStatus(user.id)]);
  const db = await getDb();
  const org = user.orgId ? (await db.select().from(schema.organizations).where(eq(schema.organizations.id, user.orgId)))[0] : null;
  const safeguarding = training.find((m) => m.slug === "safeguarding");
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user.displayName}`} subtitle={org ? `Teaching with ${org.name}` : "You are not linked to a church or school yet, so you cannot see any learners."} />
      {safeguarding && !safeguarding.done && <div className="alert alert-warn"><strong>Safeguarding training is required.</strong> Please complete it in <Link href="/teacher/training" className="font-bold">Training</Link> before working with learners.</div>}
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="My classes" value={groups.length} /><Stat label="Answers to mark" value={marking.length} /><Stat label="Training done" value={`${training.filter((m) => m.done).length}/${training.length}`} /></div>
      <section><h2 className="mb-2 text-xl font-bold">My classes</h2>
        {groups.length ? <ul className="grid gap-4 md:grid-cols-2">{groups.map((g) => <li key={g.id} className="card card-pad"><h3 className="text-lg font-bold">{g.name}</h3><p className="text-sm text-mist">{g.classLevelSlug.replace("-", " ").toUpperCase()}</p><Link href={`/teacher/classes/${g.id}`} className="btn btn-primary btn-sm mt-3">Open class</Link></li>)}</ul> : <Empty title="No classes assigned yet">Your church or school administrator assigns you to a class. Until then you can browse lesson plans and the story studio.</Empty>}
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/learn" className="card card-hover card-pad no-underline"><h3 className="text-lg font-bold">Lesson plans</h3><p className="text-sm text-mist">Teaching notes, fuller scholarly notes and parent guidance.</p></Link>
        <Link href="/studio" className="card card-hover card-pad no-underline"><h3 className="text-lg font-bold">Story studio</h3><p className="text-sm text-mist">Start from a template, import a Word document, add narration.</p></Link>
        <Link href="/teacher/exams" className="card card-hover card-pad no-underline"><h3 className="text-lg font-bold">Exams and questions</h3><p className="text-sm text-mist">Build a class test and import questions with ★ markers.</p></Link>
      </section>
    </div>
  );
}
