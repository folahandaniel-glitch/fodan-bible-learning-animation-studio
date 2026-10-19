import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireUser } from "@/server/guards";
import { verifyAndSettle } from "@/server/services/payments";
import { ActionForm } from "@/components/forms";
import { checkPaymentAction } from "@/app/actions/pay";
import { homeFor } from "@/lib/permissions";
import { Logo } from "@/components/ui";

export const metadata = { title: "Payment status" };

/** The return page ignores any "success" parameter: it asks the provider, server-side, and shows what the server concluded. */
export default async function PayCallback({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const reference = sp.reference ?? sp.trxref ?? "";
  const u = await requireUser(undefined, { allowPending: true, next: `/pay/callback?reference=${encodeURIComponent(reference)}` });
  const db = await getDb();
  const [p] = reference ? await db.select().from(schema.payments).where(and(eq(schema.payments.reference, reference), eq(schema.payments.userId, u.id))) : [];
  const result = p ? await verifyAndSettle(reference) : "unknown_reference";
  const view = {
    activated: { tone: "ok", title: "Payment confirmed", text: "Thank you! Your plan is now active and the learning content is open." },
    already_processed: { tone: "ok", title: "Payment confirmed", text: "This payment was already confirmed. Your plan is active." },
    pending: { tone: "warn", title: "Waiting for confirmation", text: "Your payment has not been confirmed by the payment provider yet. This can take a minute. Nothing is lost: you will get access as soon as it is confirmed." },
    failed: { tone: "error", title: "Payment did not go through", text: "No money was taken, or the payment was cancelled. You can try again from the plans page." },
    mismatch: { tone: "error", title: "Payment could not be matched", text: "The amount paid did not match the order, so access was not opened. Please contact support with your reference." },
    unknown_reference: { tone: "error", title: "We could not find that payment", text: "Check the reference or open your billing page." },
  }[result];
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-items-center p-4">
      <div className="card card-pad w-full text-center">
        <Logo placement="login" className="mx-auto mb-4 h-14 w-auto" />
        <div className={`alert alert-${view.tone === "ok" ? "ok" : view.tone}`} role="status"><h1 className="text-xl font-bold">{view.title}</h1><p className="mt-1">{view.text}</p></div>
        {p && <p className="mt-3 text-xs text-mist">Reference: {p.reference}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={homeFor(u.role)} className="btn btn-primary">Go to my dashboard</Link>
          <Link href="/account/billing" className="btn btn-ghost">Billing</Link>
          {result === "failed" && <Link href="/plans" className="btn btn-gold">Try again</Link>}
        </div>
        {result === "pending" && <div className="mt-4"><ActionForm action={checkPaymentAction.bind(null, reference)} submit="Check again" className="space-y-2"><span /></ActionForm></div>}
      </div>
    </main>
  );
}
