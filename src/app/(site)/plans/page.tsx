import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { optionalUser } from "@/server/guards";
import { money, getProvider } from "@/server/services/payments";
import { FEATURES } from "@/server/services/entitlements";
import { PageHeader } from "@/components/ui";
import { ActionForm, Check, Select } from "@/components/forms";
import { checkoutAction, trialAction } from "@/app/actions/pay";
import { childrenOf } from "@/server/services/auth";

export const metadata: Metadata = { title: "Plans and prices" };
const AUD: Record<string, string> = { student: "For one learner", family: "For a family", teacher: "For teachers", organisation: "For churches and schools" };

export default async function Plans() {
  const db = await getDb();
  const user = await optionalUser();
  const plans = await db.select().from(schema.plans).where(eq(schema.plans.active, true)).orderBy(asc(schema.plans.sort));
  const live = plans.filter((p) => !p.isDraft && p.priceMinor > 0);
  const kids = user?.role === "parent" ? await childrenOf(user.id) : [];
  const provider = getProvider();
  const forMe = (a: string) => !user || (a === "student" ? user.role === "student" || user.role === "parent" : a === "family" ? user.role === "parent" : a === "teacher" ? user.role === "teacher" : user.role === "org_admin");
  return (
    <div className="container-page py-10">
      <PageHeader kicker="Subscriptions" title="Plans and prices" subtitle="All prices and conditions are shown here before you pay. Protected lessons, quizzes, examinations and games open only after the server has confirmed your payment." />
      {!live.length ? (
        <div className="card card-pad text-center"><h2 className="text-2xl font-bold">Plans are being set up</h2><p className="mx-auto mt-2 max-w-xl text-mist">The ministry has not published prices yet. You can still register, explore the free sample lessons and public stories, and read the Bible. Please check back soon or <Link href="/contact">contact us</Link>.</p></div>
      ) : (
        <>
          {!provider && <div className="alert alert-warn mb-6">Online payment is not yet connected. Plans are shown for information; paying is not possible until the administrator completes payment setup.</div>}
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {live.map((p) => (
              <li key={p.id} className="card flex flex-col p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gold-700">{AUD[p.audience] ?? p.audience}</p>
                <h2 className="text-xl font-bold">{p.name}</h2>
                <p className="mt-1 text-3xl font-bold text-navy">{money(p.priceMinor, p.currency)}<span className="text-sm font-normal text-mist"> / {p.periodLabel}</span></p>
                <p className="mt-2 text-sm text-mist">{p.description}</p>
                <ul className="mt-3 flex-1 space-y-1 text-sm">{p.features.map((f) => <li key={f}>✓ {FEATURES[f as keyof typeof FEATURES] ?? f}</li>)}{p.maxChildren > 1 && <li>✓ Up to {p.maxChildren} linked children</li>}{p.maxSeats > 1 && <li>✓ Up to {p.maxSeats} seats</li>}</ul>
                <p className="mt-3 text-xs text-mist">Access lasts {p.intervalDays} days from confirmed payment. Renew any time; progress is always kept.</p>
                {forMe(p.audience) && provider ? (
                  user ? (
                    <div className="mt-4 space-y-2">
                      <ActionForm action={checkoutAction.bind(null, p.id)} submit={`Pay ${money(p.priceMinor, p.currency)}`} submitClass="btn btn-gold w-full" className="space-y-3">
                        {user.role === "parent" && p.audience === "student" && <Select label="For which child?" name="child" options={kids.map((k) => ({ value: k.id, label: k.displayName }))} />}
                        <Check name="agree" required label={<>I have read the price and <Link href="/p/subscription-terms">subscription terms</Link>.</>} />
                      </ActionForm>
                      {p.trialDays > 0 && <form action={async () => { "use server"; await trialAction(p.id, null); }}><button className="btn btn-ghost btn-sm w-full" type="submit">Start {p.trialDays}-day free trial</button></form>}
                    </div>
                  ) : <Link href="/login?next=/plans" className="btn btn-gold mt-4">Sign in to choose</Link>
                ) : <p className="mt-4 text-xs text-mist">{forMe(p.audience) ? "Payment is not connected yet." : "Not available for your account type."}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[["Before you pay", "You can register, sign in, view plans, try free samples, read the Bible and contact support."], ["After verified payment", "Lessons, quizzes, CBT exams, members' storybooks, games and reports open automatically."], ["When a plan ends", "Paid features lock. Progress, results and payment records are kept and return when you renew."]].map(([t, d]) => <div key={t} className="card card-pad"><h3 className="text-lg font-bold">{t}</h3><p className="text-sm text-mist">{d}</p></div>)}
      </section>
    </div>
  );
}
