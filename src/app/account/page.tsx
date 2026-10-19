import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { getEntitlement } from "@/server/services/entitlements";

export const metadata = { title: "My account" };

export default async function Account() {
  const user = await requireUser(undefined, { allowPending: true });
  const db = await getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  const ent = await getEntitlement(user.id);
  return (
    <div className="max-w-2xl">
      <PageHeader title="My account" />
      <dl className="card card-pad grid gap-3 sm:grid-cols-2">
        <div><dt className="label">Name</dt><dd>{row.fullName}</dd></div>
        <div><dt className="label">Account type</dt><dd>{ROLE_LABELS[row.role]}</dd></div>
        <div><dt className="label">Username</dt><dd>{row.username ?? "None"}</dd></div>
        <div><dt className="label">Email</dt><dd>{row.email ?? "None"}</dd></div>
        <div><dt className="label">Plan</dt><dd>{ent.active ? <span className="badge badge-ok">Active{ent.endsAt ? ` until ${ent.endsAt.toDateString()}` : ""}</span> : <span className="badge badge-warn">No active plan</span>}</dd></div>
        <div><dt className="label">Status</dt><dd>{row.status}</dd></div>
        {row.role === "student" && row.linkCode && <div className="sm:col-span-2 rounded-xl bg-sand p-3"><dt className="label">Family link code</dt><dd className="font-mono text-xl font-bold tracking-widest">{row.linkCode}</dd><p className="hint">A parent or guardian uses this code with your username to link your account from the parent dashboard. Keep it private.</p></div>}
      </dl>
      <div className="mt-4 flex flex-wrap gap-3"><Link className="btn btn-primary" href="/account/password">Change password</Link><Link className="btn btn-ghost" href="/account/billing">Plan and billing</Link><Link className="btn btn-ghost" href="/account/data">My data and privacy</Link></div>
    </div>
  );
}
