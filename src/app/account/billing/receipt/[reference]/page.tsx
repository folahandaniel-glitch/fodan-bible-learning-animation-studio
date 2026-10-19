import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { money } from "@/server/services/payments";
import { Logo } from "@/components/ui";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Receipt" };

export default async function Receipt({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const user = await requireUser(undefined, { allowPending: true });
  const db = await getDb();
  const [p] = await db.select().from(schema.payments).where(and(eq(schema.payments.reference, reference), eq(schema.payments.userId, user.id), eq(schema.payments.status, "success")));
  if (!p) notFound();
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, p.planId));
  const brand = await getSetting("brand");
  return (
    <div className="mx-auto max-w-xl">
      <div className="card card-pad print-page">
        <Logo placement="printable" className="h-16 w-auto" />
        <h1 className="mt-4 text-2xl font-bold">Payment receipt</h1>
        <p className="text-sm text-mist">{brand.siteName} · {brand.ministry}</p>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="font-semibold">Reference</dt><dd className="font-mono">{p.reference}</dd>
          <dt className="font-semibold">Paid by</dt><dd>{user.fullName}</dd>
          <dt className="font-semibold">Plan</dt><dd>{plan?.name}</dd>
          <dt className="font-semibold">Amount</dt><dd>{money(p.amountMinor, p.currency)}</dd>
          <dt className="font-semibold">Provider</dt><dd>{p.provider}</dd>
          <dt className="font-semibold">Verified</dt><dd>{p.verifiedAt?.toLocaleString()}</dd>
        </dl>
        <p className="mt-4 text-xs text-mist">This receipt records a payment verified by our server with the payment provider.</p>
      </div>
      <p className="no-print mt-4 text-sm text-mist">To print or save this receipt as a PDF, use your browser&apos;s Print command (Ctrl+P).</p>
    </div>
  );
}
