import { requireAdmin } from "@/server/guards";
import { integrationStatus } from "@/server/services/integrations";
import { PageHeader } from "@/components/ui";
import { getDb, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { InlineAction } from "@/components/forms";
import { revokeDeveloperAction } from "@/app/actions/softnet";

export const metadata = { title: "Integrations", robots: { index: false } };
const TONE: Record<string, string> = { configured: "badge-ok", awaiting_verification: "badge-warn", unconfigured: "badge-bad", simulator: "badge-info" };
const LABEL: Record<string, string> = { configured: "Configured", awaiting_verification: "Awaiting verification", unconfigured: "Not configured", simulator: "Development only" };

export default async function Integrations() {
  const me = await requireAdmin("integrations.view");
  const db = await getDb();
  const devs = me.role === "super_admin" ? await db.select({ id: schema.users.id, n: schema.users.fullName, s: schema.users.status, l: schema.users.lastLoginAt }).from(schema.users).where(eq(schema.users.role, "developer_admin")) : [];
  const list = integrationStatus();
  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" subtitle="Whether each service is configured. Secrets are set as environment variables on the host and are never shown here." />
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Service</th><th>Needed</th><th>Status</th><th>Details</th></tr></thead><tbody>
        {list.map((i) => <tr key={i.key}><td className="font-semibold">{i.name}</td><td>{i.required === "launch" ? <span className="badge badge-warn">Required for launch</span> : <span className="badge">Optional</span>}</td><td><span className={`badge ${TONE[i.state]}`}>{LABEL[i.state]}</span></td><td className="text-sm">{i.detail}<div className="mt-1 text-xs text-mist">How: {i.howTo}</div></td></tr>)}
      </tbody></table></div>
      {me.role === "super_admin" && <section className="card card-pad"><h2 className="text-lg font-bold">Developer access</h2><p className="mb-2 text-sm text-mist">Developer administrators can reach only the separate developer control plane. You can withdraw their access at any time.</p>{devs.length ? <ul className="space-y-1 text-sm">{devs.map((d) => <li key={d.id} className="flex items-center gap-3">{d.n} · {d.s} · last sign-in {d.l?.toLocaleString() ?? "never"}{d.s === "active" && <InlineAction action={revokeDeveloperAction} label="Revoke access" hidden={{ id: d.id }} confirm="Revoke this developer's access?" />}</li>)}</ul> : <p className="text-sm text-mist">No developer administrators exist.</p>}</section>}
      <p className="text-sm text-mist">&ldquo;Awaiting verification&rdquo; means keys are present but a real test (a payment in test mode, a test e-mail) has not yet proved the integration works.</p>
    </div>
  );
}
