import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { ActionForm, TextArea } from "@/components/forms";
import { dataRequestAction } from "@/app/actions/admin";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Privacy requests", robots: { index: false } };

export default async function Privacy() {
  await requireAdmin("privacy.handle");
  const db = await getDb();
  const rows = await db.select({ r: schema.dataRequests, u: schema.users }).from(schema.dataRequests).innerJoin(schema.users, eq(schema.users.id, schema.dataRequests.userId)).orderBy(desc(schema.dataRequests.createdAt)).limit(100);
  return (
    <div className="space-y-6">
      <PageHeader title="Privacy requests" subtitle="Data export and deletion requests from users. Confirm the person's identity before erasing anything." />
      <div className="alert alert-info text-sm">Erasing an account removes learning records, results, game history, notifications, family links and personal details. Payment and subscription records are kept (for financial record-keeping) against an anonymised account. This cannot be undone.</div>
      {rows.map(({ r, u }) => (
        <article key={r.id} className="card card-pad">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-sans text-base font-bold">{r.kind === "deletion" ? "Deletion request" : "Data export request"}: {u.fullName}</h2><p className="text-sm text-mist">{u.role} · requested {r.createdAt.toLocaleString()} {r.note ? `· “${r.note}”` : ""}</p></div><StatusBadge status={r.status} /></div>
          {r.status === "open" && (
            <div className="mt-3 flex flex-wrap gap-4">
              {r.kind === "deletion" && <ActionForm action={dataRequestAction} submit="Erase this account" submitClass="btn btn-danger btn-sm" className="flex items-center gap-2" confirm="Permanently erase this person's learning records and personal details? This cannot be undone."><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="erase" /></ActionForm>}
              <ActionForm action={dataRequestAction} submit="Mark handled" submitClass="btn btn-ghost btn-sm" className="flex items-center gap-2"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="done" /></ActionForm>
              <ActionForm action={dataRequestAction} submit="Decline" submitClass="btn btn-ghost btn-sm" className="flex items-center gap-2"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="reject" /><TextArea label="Reason" name="note" rows={1} /></ActionForm>
            </div>
          )}
        </article>
      ))}
      {!rows.length && <p className="text-mist">No requests.</p>}
    </div>
  );
}
