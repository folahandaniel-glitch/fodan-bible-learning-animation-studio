import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { can } from "@/lib/permissions";
import { money, providerStatus } from "@/server/services/payments";
import { subIsLive } from "@/server/services/entitlements";
import { ActionForm, Field, InlineAction, Select } from "@/components/forms";
import { changeEntitlementAction, grantAction, grantOrgAction, reconcileAction, refundAction } from "@/app/actions/admin";
import { PageHeader, Stat, StatusBadge } from "@/components/ui";

export const metadata = { title: "Payments and access", robots: { index: false } };

export default async function Finance() {
  const me = await requireAdmin("finance.view");
  const db = await getDb();
  const [pays, subs, plans, orgs] = await Promise.all([
    db.select({ p: schema.payments, u: schema.users.fullName }).from(schema.payments).innerJoin(schema.users, eq(schema.users.id, schema.payments.userId)).orderBy(desc(schema.payments.createdAt)).limit(40),
    db.select().from(schema.subscriptions).orderBy(desc(schema.subscriptions.createdAt)).limit(40),
    db.select({ id: schema.plans.id, name: schema.plans.name }).from(schema.plans).orderBy(asc(schema.plans.sort)),
    db.select({ id: schema.organizations.id, name: schema.organizations.name }).from(schema.organizations),
  ]);
  const userNames = new Map((await db.select({ id: schema.users.id, n: schema.users.fullName }).from(schema.users).where(sql`${schema.users.id} in (select user_id from subscriptions where user_id is not null)`)).map((x) => [x.id, x.n]));
  const totals = await db.select({ status: schema.payments.status, currency: schema.payments.currency, n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${schema.payments.amountMinor}),0)::bigint::int` }).from(schema.payments).groupBy(schema.payments.status, schema.payments.currency);
  const prov = providerStatus();
  const manage = can(me.role, "entitlements.manage");
  const now = new Date();
  void and;
  return (
    <div className="space-y-6">
      <PageHeader title="Payments and access" subtitle="Verified transactions are kept apart from pending or failed ones. Estimated revenue is never shown." actions={manage ? <ActionForm action={reconcileAction} submit="Reconcile pending payments" submitClass="btn btn-primary btn-sm" className=""><span /></ActionForm> : undefined} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["success", "pending", "failed", "refunded"].map((s) => <Stat key={s} label={s === "success" ? "Verified" : s[0].toUpperCase() + s.slice(1)} value={totals.filter((t) => t.status === s).reduce((a, t) => a + t.n, 0)} sub={totals.filter((t) => t.status === s && t.total).map((t) => money(t.total, t.currency)).join(" · ") || undefined} />)}
      </div>
      <div className="alert alert-info text-sm">Payment provider: Paystack {prov.paystack ? "key present (verify with a test-mode payment)" : "not configured"}{prov.simulator ? " · development simulator active" : ""}. Webhook URL to register: <code>{(process.env.APP_URL ?? "https://your-domain").replace(/\/$/, "")}/api/payments/webhook/paystack</code></div>
      {manage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Grant access to a person (scholarship or correction)</h2>
            <ActionForm action={grantAction} submit="Grant access" submitClass="btn btn-gold"><Field label="Username or email" name="who" required /><div className="grid grid-cols-2 gap-3"><Field label="Days" name="days" type="number" defaultValue={30} /><Select label="Type" name="source" options={[{ value: "scholarship", label: "Scholarship" }, { value: "admin", label: "Correction / other" }]} /></div><Select label="Features" name="planId" options={[{ value: "", label: "All features" }, ...plans.map((p) => ({ value: p.id, label: p.name }))]} /><Field label="Reason (required, recorded in the audit log)" name="reason" required /></ActionForm></section>
          <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Grant a church or school licence</h2>
            <ActionForm action={grantOrgAction} submit="Grant licence" submitClass="btn btn-gold"><Select label="Organisation" name="orgId" options={orgs.map((o) => ({ value: o.id, label: o.name }))} /><div className="grid grid-cols-2 gap-3"><Field label="Days" name="days" type="number" defaultValue={365} /><Field label="Seats" name="seats" type="number" defaultValue={50} /></div><Select label="Features" name="planId" options={[{ value: "", label: "All features" }, ...plans.map((p) => ({ value: p.id, label: p.name }))]} /><Field label="Reason (required)" name="reason" required /></ActionForm></section>
        </div>
      )}
      <section><h2 className="mb-2 text-lg font-bold">Subscriptions and entitlements</h2>
        <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Holder</th><th>Plan</th><th>Source</th><th>Ends</th><th>State</th><th>Reason</th><th /></tr></thead><tbody>
          {subs.map((s) => { const live = subIsLive(s, now, 0); return <tr key={s.id}><td>{s.userId ? userNames.get(s.userId) ?? "user" : orgs.find((o) => o.id === s.orgId)?.name ?? "organisation"}</td><td>{s.planName}</td><td>{s.source}</td><td>{s.endsAt.toDateString()}</td><td><StatusBadge status={s.status !== "active" ? s.status : live ? "active" : "expired"} /></td><td className="max-w-48 text-xs">{s.reason}</td><td>{manage && <ActionForm action={changeEntitlementAction} submit="Apply" submitClass="btn btn-ghost btn-sm" className="flex flex-wrap items-center gap-1"><input type="hidden" name="id" value={s.id} /><select name="action" className="input !w-auto !min-h-0 !py-1 text-xs" aria-label="Action"><option value="extend">Extend</option><option value="suspend">Suspend</option><option value="reactivate">Reactivate</option><option value="revoke">Revoke</option></select><input name="days" type="number" defaultValue={30} className="input !w-16 !min-h-0 !py-1 text-xs" aria-label="Days" /><input name="reason" required placeholder="Reason" className="input !w-32 !min-h-0 !py-1 text-xs" aria-label="Reason" /></ActionForm>}</td></tr>; })}
          {!subs.length && <tr><td colSpan={7} className="text-mist">No subscriptions yet.</td></tr>}
        </tbody></table></div></section>
      <section><h2 className="mb-2 text-lg font-bold">Payments</h2>
        <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Date</th><th>Payer</th><th>Reference</th><th>Amount</th><th>Provider</th><th>Status</th><th /></tr></thead><tbody>
          {pays.map(({ p, u }) => <tr key={p.id}><td>{p.createdAt.toLocaleDateString()}</td><td>{u}</td><td className="font-mono text-xs">{p.reference}</td><td>{money(p.amountMinor, p.currency)}</td><td>{p.provider}</td><td><StatusBadge status={p.status} />{p.note && <div className="text-xs text-mist">{p.note}</div>}</td><td>{manage && p.status === "success" && <ActionForm action={refundAction} submit="Record" submitClass="btn btn-ghost btn-sm" className="flex flex-wrap items-center gap-1"><input type="hidden" name="id" value={p.id} /><select name="kind" className="input !w-auto !min-h-0 !py-1 text-xs" aria-label="Kind"><option value="refund">Refund</option><option value="dispute">Dispute</option></select><input name="reason" required placeholder="Reason" className="input !w-32 !min-h-0 !py-1 text-xs" aria-label="Reason" /></ActionForm>}</td></tr>)}
          {!pays.length && <tr><td colSpan={7} className="text-mist">No payments yet.</td></tr>}
        </tbody></table></div>
        <p className="mt-2 text-xs text-mist">Recording a refund withdraws the related access. The money itself must be returned from the payment provider&apos;s dashboard; this platform does not move funds.</p></section>
    </div>
  );
}
