import Link from "next/link";
import { requireUser } from "@/server/guards";
import { childrenOf } from "@/server/services/auth";
import { getEntitlement } from "@/server/services/entitlements";
import { progressSummary } from "@/server/services/content";
import { Empty, PageHeader, ProgressBar } from "@/components/ui";
import { getDb, schema } from "@/server/db";
import { eq } from "drizzle-orm";

export const metadata = { title: "My children" };

export default async function ParentHome() {
  const user = await requireUser(["parent"]);
  const [kids, ent] = await Promise.all([childrenOf(user.id), getEntitlement(user.id)]);
  const db = await getDb();
  const classes = await db.select().from(schema.classLevels);
  const cards = await Promise.all(kids.map(async (k) => ({ k, ent: await getEntitlement(k.id), prog: await progressSummary(k.id, k.classLevelSlug) })));
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user.displayName}`} subtitle="Follow your children's learning, results and plan from one place." actions={<Link href="/parent/add-child" className="btn btn-gold">Add or link a child</Link>} />
      <section className={`card card-pad ${ent.active ? "border-leaf bg-leaf-50" : "border-gold bg-sand"}`}>
        <h2 className="text-lg font-bold">{ent.active ? "Your family plan is active" : "You have not chosen a plan yet"}</h2>
        <p className="text-sm">{ent.active ? `It runs until ${ent.endsAt?.toDateString()}. Children covered by your plan can use lessons, quizzes, exams and games.` : "Children cannot use paid lessons, quizzes, exams or games until a payment is confirmed. Your account, children and reports stay available."}</p>
        <div className="mt-3"><Link href="/plans" className="btn btn-primary btn-sm">{ent.active ? "Manage plan" : "Choose a plan"}</Link> <Link href="/account/billing" className="btn btn-ghost btn-sm">Billing</Link></div>
      </section>
      {!kids.length ? <Empty title="No children linked yet" action={<Link href="/parent/add-child" className="btn btn-gold">Add a child</Link>}>Create an account for your child, or link one who has already registered with their family link code.</Empty> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {cards.map(({ k, ent: ke, prog }) => (
            <li key={k.id} className="card card-pad">
              <div className="flex items-start justify-between gap-2"><div><h2 className="text-xl font-bold">{k.displayName}</h2><p className="text-sm text-mist">{classes.find((c) => c.slug === k.classLevelSlug)?.name ?? "No class set"} · @{k.username}</p></div>{ke.active ? <span className="badge badge-ok">Plan active</span> : <span className="badge badge-warn">No active plan</span>}</div>
              {prog.total > 0 && <div className="mt-3"><ProgressBar value={prog.done} max={prog.total} label="Lessons completed" /></div>}
              <div className="mt-4 flex flex-wrap gap-2"><Link href={`/parent/children/${k.id}`} className="btn btn-primary btn-sm">Progress and results</Link>{!ke.active && <Link href="/plans" className="btn btn-gold btn-sm">Unlock</Link>}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

void eq;
