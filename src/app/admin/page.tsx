import Link from "next/link";
import { requireAdmin } from "@/server/guards";
import { dashboardMetrics } from "@/server/services/metrics";
import { money } from "@/server/services/payments";
import { Alert, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { can } from "@/lib/permissions";
import { unreviewedCounts } from "@/server/services/content";

export const metadata = { title: "Super Admin dashboard", robots: { index: false } };

const TONE: Record<string, string> = { configured: "badge-ok", awaiting_verification: "badge-warn", unconfigured: "badge-bad", simulator: "badge-info" };
const LABEL: Record<string, string> = { configured: "Configured", awaiting_verification: "Awaiting verification", unconfigured: "Not configured", simulator: "Development only" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const m = await dashboardMetrics();
  const rc = await unreviewedCounts();
  const maxW = Math.max(1, ...m.weeks.map((w) => w.n));
  const launchBlockers = m.integrations.filter((i) => i.required === "launch" && i.state !== "configured");
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle={`Signed in as ${user.fullName}. Every figure below comes from the database; nothing is estimated.`} />
      {sp.denied && <Alert tone="warn">Your role does not have access to that area.</Alert>}
      {can(user.role, "integrations.view") && launchBlockers.length > 0 && <Alert tone="warn"><strong>Before launch:</strong> {launchBlockers.map((i) => i.name).join(", ")} still need attention. <Link href="/admin/integrations" className="font-bold">Open integrations</Link>.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registered users" value={m.users} />
        <Stat label="Students" value={m.students} />
        <Stat label="Parents and guardians" value={m.parents} />
        <Stat label="Approved teachers" value={m.teachers} sub={m.pendingTeachers ? `${m.pendingTeachers} pending approval` : undefined} tone={m.pendingTeachers ? "warn" : undefined} />
        <Stat label="Churches and schools" value={m.orgs} />
        <Stat label="Active subscriptions" value={m.activeSubs} sub={`${m.expiredSubs} expired`} />
        <Stat label="Pending payments" value={m.pendingPay} />
        <Stat label="Verified revenue" value={m.verifiedRevenue.length ? m.verifiedRevenue.map((r) => money(r.total, r.currency)).join(" · ") : "None yet"} sub="Verified payments only; pending and failed are excluded" />
        <Stat label="Published lessons" value={m.lessonsPublished} sub={`${m.lessonsFramework} topics still framework only`} />
        <Stat label="Awaiting review" value={rc.lessons + rc.stories} sub={`${rc.lessons} lessons, ${rc.stories} stories`} tone="warn" />
        <Stat label="Exam attempts (30 days)" value={m.attempts30} sub={m.attempts30 ? `average score ${m.avgScore30}%` : undefined} />
        <Stat label="Game plays (30 days)" value={m.games30} />
        <Stat label="Lessons completed" value={m.lessonCompletions} />
        <Stat label="Media storage" value={`${(m.storage.bytes / 1024 / 1024).toFixed(1)} MB`} sub={`${m.storage.n} files`} />
        <Stat label="New enquiries" value={m.enquiries} />
        <Stat label="Open privacy requests" value={m.openDataRequests} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad"><h2 className="mb-3 text-lg font-bold">New registrations per week</h2>
          <div className="flex h-36 items-end gap-2" role="img" aria-label={`Registrations per week: ${m.weeks.map((w) => `${w.label} ${w.n}`).join(", ")}`}>{m.weeks.map((w) => <div key={w.label} className="flex flex-1 flex-col items-center gap-1"><span className="text-xs font-bold">{w.n}</span><div className="w-full rounded-t bg-royal" style={{ height: `${(w.n / maxW) * 100}%`, minHeight: w.n ? 4 : 1 }} /><span className="text-[10px] text-mist">{w.label}</span></div>)}</div></section>
        <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Integration health</h2><ul className="space-y-1.5 text-sm">{m.integrations.slice(0, 8).map((i) => <li key={i.key} className="flex items-center justify-between gap-2"><span>{i.name}</span><span className={`badge ${TONE[i.state]}`}>{LABEL[i.state]}</span></li>)}</ul><Link href="/admin/integrations" className="btn btn-ghost btn-sm mt-3">All integrations</Link></section>
      </div>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Recent administrative actions</h2>
        {m.recent.length ? <ul className="divide-y divide-line text-sm">{m.recent.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5"><span><StatusBadge status="active" /> <strong>{a.action}</strong> by {a.actorLabel ?? "system"}</span><span className="text-xs text-mist">{a.createdAt.toLocaleString()}</span></li>)}</ul> : <p className="text-sm text-mist">No actions recorded yet.</p>}
        {can(user.role, "audit.view") && <Link href="/admin/audit" className="btn btn-ghost btn-sm mt-3">Open the audit log</Link>}
      </section>
    </div>
  );
}
