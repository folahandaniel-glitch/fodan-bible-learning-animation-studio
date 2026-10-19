import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireUser } from "@/server/guards";
import { simulatorEnabled, money } from "@/server/services/payments";
import { simulatePaymentAction } from "@/app/actions/pay";

export const metadata = { title: "Payment simulator (development)" };

export default async function Simulator({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  if (!simulatorEnabled()) notFound(); // never available in production or once a real provider key is set
  const { reference = "" } = await searchParams;
  const u = await requireUser(undefined, { allowPending: true });
  const db = await getDb();
  const [p] = await db.select().from(schema.payments).where(and(eq(schema.payments.reference, reference), eq(schema.payments.userId, u.id)));
  if (!p) notFound();
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center p-4">
      <div className="card card-pad w-full">
        <p className="badge badge-warn">Development only</p>
        <h1 className="mt-2 text-2xl font-bold">Payment simulator</h1>
        <p className="mt-2 text-sm text-mist">This stands in for the payment provider while none is configured. It is disabled in production and as soon as a real payment key is set. Choosing an outcome goes through the same server-side verification as a real payment.</p>
        <p className="mt-3 font-bold">{money(p.amountMinor, p.currency)} · {p.reference}</p>
        <div className="mt-4 flex gap-3">
          <form action={simulatePaymentAction.bind(null, p.reference, "success")}><button className="btn btn-primary" type="submit">Simulate successful payment</button></form>
          <form action={simulatePaymentAction.bind(null, p.reference, "failed")}><button className="btn btn-ghost" type="submit">Simulate failure</button></form>
        </div>
      </div>
    </main>
  );
}
