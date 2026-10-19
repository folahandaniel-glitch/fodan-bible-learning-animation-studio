import Link from "next/link";
import type { ReactNode } from "react";
import { getSetting } from "@/server/settings";
import { getDb, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { Fragment } from "react";

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "ok" | "warn"; children: ReactNode }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`alert alert-${tone}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions, kicker }: { title: string; subtitle?: ReactNode; actions?: ReactNode; kicker?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className="text-xs font-bold uppercase tracking-widest text-gold-700">{kicker}</p>}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-mist">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card card-pad text-center">
      <svg viewBox="0 0 64 64" className="mx-auto mb-3 h-14 w-14" aria-hidden><circle cx="32" cy="32" r="30" fill="#f6efd8" /><path d="M16 40c8-4 12-2 16 2 4-4 8-6 16-2V22c-8-4-12-2-16 2-4-4-8-6-16-2z" fill="#fff" stroke="#0b1f4b" strokeWidth="2.5" strokeLinejoin="round" /><path d="M32 24v18" stroke="#0b1f4b" strokeWidth="2.5" /></svg>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-mist">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="card card-pad">
      <p className="text-xs font-semibold uppercase tracking-wide text-mist">{label}</p>
      <p className="mt-1 text-3xl font-bold text-navy">{value}</p>
      {sub && <p className={`mt-1 text-xs ${tone === "warn" ? "text-gold-700" : "text-mist"}`}>{sub}</p>}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}><span style={{ width: `${pct}%` }} /></div>
      <p className="mt-1 text-xs text-mist">{value} of {max} ({pct}%)</p>
    </div>
  );
}

export const STATUS_TONE: Record<string, string> = { published: "badge-ok", approved: "badge-ok", active: "badge-ok", success: "badge-ok", marked: "badge-ok", draft: "badge", review: "badge-warn", pending: "badge-warn", in_review: "badge-warn", submitted: "badge-info", unreviewed: "badge-warn", suspended: "badge-bad", revoked: "badge-bad", failed: "badge-bad", refunded: "badge-bad", disputed: "badge-bad", archived: "badge", abandoned: "badge", held: "badge-warn", sent: "badge-ok", deactivated: "badge-bad", changes_requested: "badge-bad", framework: "badge-warn", complete: "badge-ok", expired: "badge-bad" };
export const StatusBadge = ({ status }: { status: string }) => <span className={`badge ${STATUS_TONE[status] ?? ""}`}>{status.replace(/_/g, " ")}</span>;

/** Shown wherever AI-drafted teaching content has not yet been reviewed by the ministry. */
export function ReviewNotice({ reviewStatus, origin }: { reviewStatus: string; origin?: string }) {
  if (reviewStatus === "approved") return null;
  return (
    <div className="alert alert-warn text-sm" role="note">
      <strong>Draft teaching content.</strong> {origin === "ai_drafted" ? "This was drafted with AI assistance and " : "This "}has not yet been theologically reviewed and approved by Fodan Gospel Outreach. Check it against Scripture and your church&apos;s doctrinal statement before teaching it as authoritative.
    </div>
  );
}

/** The configured logo for a placement. `on="dark"` picks the dark-background variant when one is assigned. */
export async function Logo({ placement = "homepage", on = "light", className = "h-10 w-auto", alt = "CROP: Child Rescue Operation Programmes, a children's wing of Fodan Gospel Outreach" }: { placement?: string; on?: "light" | "dark"; className?: string; alt?: string }) {
  const map = await getSetting("logoPlacements");
  const entry = map[placement] ?? map.homepage ?? {};
  const id = on === "dark" ? (entry.dark ?? entry.light) : (entry.light ?? entry.dark);
  if (!id) return <span className="font-display text-xl font-bold">CROP</span>;
  const db = await getDb();
  const [l] = await db.select({ active: schema.logos.active }).from(schema.logos).where(eq(schema.logos.id, id));
  if (!l?.active) return <span className="font-display text-xl font-bold">CROP</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/logo/${id}`} alt={alt} className={className} />;
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-mist">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <Fragment key={i}>
            {i > 0 && <li aria-hidden>/</li>}
            <li>{it.href ? <Link href={it.href} className="hover:underline">{it.label}</Link> : <span aria-current="page" className="font-semibold text-navy">{it.label}</span>}</li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
