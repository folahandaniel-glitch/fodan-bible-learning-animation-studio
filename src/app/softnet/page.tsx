import { desc, eq, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireDeveloper, SOFTNET_NAME } from "@/server/softnet";
import { integrationStatus } from "@/server/services/integrations";
import { getSetting } from "@/server/settings";
import { ActionForm, Field, Select, TextArea } from "@/components/forms";
import { appStateAction, noteAction, softnetLogoutAction } from "@/app/actions/softnet";

export const metadata = { title: SOFTNET_NAME, robots: { index: false, follow: false } };
const TONE: Record<string, string> = { configured: "badge-ok", awaiting_verification: "badge-warn", unconfigured: "badge-bad", simulator: "badge-info" };

export default async function Softnet() {
  const s = await requireDeveloper();
  const db = await getDb();
  const [m, ints] = [await getSetting("maintenance"), integrationStatus()];
  const events = await db.select().from(schema.auditLogs).where(or(eq(schema.auditLogs.plane, "softnet"), sql`${schema.auditLogs.action} like 'auth.login_failed' or ${schema.auditLogs.action} like 'payment.mismatch'`)).orderBy(desc(schema.auditLogs.createdAt)).limit(30);
  const [counts] = await db.select({ users: sql<number>`(select count(*)::int from users)`, pays: sql<number>`(select count(*)::int from payments where status='pending')`, held: sql<number>`(select count(*)::int from email_outbox where status in ('held','failed'))` }).from(sql`(select 1) x`);
  const dep = { env: process.env.NODE_ENV, host: process.env.VERCEL_URL ?? "not on Vercel", commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown").slice(0, 8), region: process.env.VERCEL_REGION ?? "unknown", node: process.version };
  return (
    <div className="min-h-screen bg-[#0b1f4b] p-4 text-ink sm:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 text-ivory"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-gold">Developer control plane</p><h1 className="text-2xl font-bold !text-ivory">{SOFTNET_NAME}</h1><p className="text-sm text-[#d9dff0]">Signed in as {s.user.fullName}. This instance only: no other customer projects are reachable from here.</p></div>
          <form action={softnetLogoutAction}><button className="btn btn-ghost-light btn-sm" type="submit">Sign out</button></form></header>
        <div className="grid gap-4 md:grid-cols-3">
          <section className="card card-pad"><h2 className="text-lg font-bold">Deployment</h2><dl className="mt-2 space-y-1 text-sm">{Object.entries(dep).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-mist">{k}</dt><dd className="font-mono">{String(v)}</dd></div>)}</dl><p className="mt-2 text-xs text-mist">Live status of GitHub and Vercel is not connected; see the handover document.</p></section>
          <section className="card card-pad"><h2 className="text-lg font-bold">Usage</h2><dl className="mt-2 space-y-1 text-sm"><div className="flex justify-between"><dt className="text-mist">Users</dt><dd>{counts.users}</dd></div><div className="flex justify-between"><dt className="text-mist">Pending payments</dt><dd>{counts.pays}</dd></div><div className="flex justify-between"><dt className="text-mist">E-mails held or failed</dt><dd>{counts.held}</dd></div></dl><p className="mt-2 text-xs text-mist">No passwords, payment credentials or provider secrets are shown or reachable here.</p></section>
          <section className="card card-pad"><h2 className="text-lg font-bold">Application state</h2><p className="mt-1"><span className={`badge ${m.suspended ? "badge-bad" : "badge-ok"}`}>{m.suspended ? "Suspended" : "Live"}</span></p></section>
        </div>
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Suspend or restore the application</h2><p className="mb-2 text-sm text-mist">Only where legally and technically authorised. Suspending shows a notice to the public; administrators and data are untouched. A written reason is recorded.</p>
          <ActionForm action={appStateAction} submit="Apply" submitClass="btn btn-navy" confirm="Change the public availability of the application?"><Select label="Set state" name="to" options={[{ value: "suspend", label: "Suspend (maintenance notice)" }, { value: "restore", label: "Restore (live)" }]} /><TextArea label="Reason (required)" name="reason" rows={2} /><Field label="Public message (optional)" name="message" defaultValue={m.message} /></ActionForm></section>
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Integration health</h2><ul className="divide-y divide-line text-sm">{ints.map((i) => <li key={i.key} className="flex flex-wrap items-center justify-between gap-2 py-1.5"><span>{i.name}</span><span className={`badge ${TONE[i.state]}`}>{i.state.replace("_", " ")}</span></li>)}</ul></section>
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Record an intervention</h2><ActionForm action={noteAction} submit="Record" submitClass="btn btn-ghost"><TextArea label="What did you do, and why?" name="note" rows={2} /></ActionForm></section>
        <section className="card card-pad overflow-x-auto"><h2 className="mb-2 text-lg font-bold">Security and developer events</h2><table className="table"><thead><tr><th>When</th><th>Who</th><th>Event</th><th>Plane</th></tr></thead><tbody>{events.map((e) => <tr key={e.id}><td className="whitespace-nowrap text-xs">{e.createdAt.toLocaleString()}</td><td>{e.actorLabel ?? "system"}</td><td className="font-mono text-xs">{e.action}</td><td>{e.plane}</td></tr>)}{!events.length && <tr><td colSpan={4} className="text-mist">No events.</td></tr>}</tbody></table></section>
      </div>
    </div>
  );
}
