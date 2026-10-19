import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { getEntitlement, subIsLive } from "@/server/services/entitlements";
import { money } from "@/server/services/payments";
import { PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, Field, InlineAction } from "@/components/forms";
import { checkPaymentAction } from "@/app/actions/pay";
import { redeemKeyAction } from "@/app/actions/auth";

export const metadata = { title: "Plan and billing" };

export default async function Billing() {
  const user = await requireUser(undefined, { allowPending: true });
  const db = await getDb();
  const ent = await getEntitlement(user.id);
  const subs = await db.select().from(schema.subscriptions).where(or(eq(schema.subscriptions.userId, user.id), user.orgId && user.role === "org_admin" ? eq(schema.subscriptions.orgId, user.orgId) : eq(schema.subscriptions.userId, user.id))).orderBy(desc(schema.subscriptions.createdAt));
  const pays = await db.select().from(schema.payments).where(eq(schema.payments.userId, user.id)).orderBy(desc(schema.payments.createdAt));
  const now = new Date();
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Plan and billing" actions={<Link href="/plans" className="btn btn-gold">{ent.active ? "Renew or change plan" : "Choose a plan"}</Link>} />
      <section className={`card card-pad ${ent.active ? "border-leaf bg-leaf-50" : "border-gold bg-sand"}`}>
        {ent.active ? <><h2 className="text-xl font-bold">Your access is active</h2><p>{ent.source === "staff" ? "Staff accounts can preview all content." : <>Source: {ent.source === "own" ? "your own plan" : ent.source === "parent" ? "a parent's family plan" : "your organisation's plan"}. Runs until <strong>{ent.endsAt?.toDateString()}</strong>.</>}</p></> : <><h2 className="text-xl font-bold">No active plan</h2><p>{ent.reason ?? "Lessons, quizzes, exams and games are locked until a payment is confirmed or an administrator grants access. Progress and results are kept."}</p></>}
      </section>
      <section><h2 className="mb-2 text-xl font-bold">Subscriptions</h2>
        {subs.length ? <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Plan</th><th>Source</th><th>Starts</th><th>Ends</th><th>Status</th></tr></thead><tbody>{subs.map((s) => { const live = subIsLive(s, now, 0); return <tr key={s.id}><td>{s.planName}</td><td>{s.source}</td><td>{s.startsAt.toDateString()}</td><td>{s.endsAt.toDateString()}</td><td><StatusBadge status={s.status !== "active" ? s.status : live ? "active" : s.endsAt < now ? "expired" : "pending"} /></td></tr>; })}</tbody></table></div> : <p className="text-mist">No subscriptions yet.</p>}
      </section>
      <section><h2 className="mb-2 text-xl font-bold">Payments and receipts</h2>
        {pays.length ? <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Date</th><th>Reference</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>{pays.map((p) => <tr key={p.id}><td>{p.createdAt.toDateString()}</td><td className="font-mono text-xs">{p.reference}</td><td>{money(p.amountMinor, p.currency)}</td><td><StatusBadge status={p.status} /></td><td className="space-x-2 whitespace-nowrap">{p.status === "success" && <Link className="btn btn-ghost btn-sm" href={`/account/billing/receipt/${p.reference}`}>Receipt</Link>}{(p.status === "pending" || p.status === "abandoned") && <InlineAction action={checkPaymentAction.bind(null, p.reference)} label="Check payment status" />}</td></tr>)}</tbody></table></div> : <p className="text-mist">No payments yet.</p>}
      </section>
      <section className="card card-pad max-w-md"><h2 className="text-lg font-bold">Have a scholarship code?</h2><p className="mb-2 text-sm text-mist">Scholarship codes are issued by the administrator and give time-limited access. Registration codes do not replace payment.</p><ActionForm action={redeemKeyAction} submit="Redeem code" className="space-y-2"><Field label="Code" name="key" required /></ActionForm></section>
    </div>
  );
}
