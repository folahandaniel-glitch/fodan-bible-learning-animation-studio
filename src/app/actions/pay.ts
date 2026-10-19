"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireUser } from "@/server/guards";
import { settlePayment, startCheckout, simulatorEnabled, verifyAndSettle } from "@/server/services/payments";
import { rateLimit } from "@/server/rate-limit";
import { grantEntitlement } from "@/server/services/entitlements";
import { actorOf } from "@/server/guards";
import type { ActionResult } from "@/components/forms";

export async function checkoutAction(planId: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(undefined, { next: "/plans" });
  if (!(await rateLimit(`checkout:${u.id}`, 12, 3600))) return { error: "Too many payment attempts. Please wait a while." };
  if (f.get("agree") !== "on") return { error: "Please confirm you have read the price and subscription terms." };
  try {
    const r = await startCheckout({ id: u.id, email: u.email, role: u.role, orgId: u.orgId, fullName: u.fullName }, planId, { forStudentId: String(f.get("child") ?? "") || undefined });
    redirect(r.url);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect
    return { error: (e as Error).message };
  }
}

export async function trialAction(planId: string, _: ActionResult): Promise<ActionResult> {
  const u = await requireUser(undefined, { next: "/plans" });
  const db = await getDb();
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, planId));
  if (!plan || !plan.active || plan.isDraft || plan.trialDays <= 0) return { error: "No trial is available for this plan." };
  const prev = await db.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.userId, u.id), eq(schema.subscriptions.source, "trial")));
  if (prev.length) return { error: "You have already used a free trial." };
  await grantEntitlement(await actorOf(u), { userId: u.id, planId, days: plan.trialDays, source: "trial", reason: "Free trial started by user" });
  redirect(u.role === "student" ? "/student" : "/account/billing");
}

/** "Check payment status": re-verifies with the provider server-side. A browser success flag is never trusted. */
export async function checkPaymentAction(reference: string, _: ActionResult): Promise<ActionResult> {
  const u = await requireUser(undefined, { allowPending: true });
  const db = await getDb();
  const [p] = await db.select().from(schema.payments).where(and(eq(schema.payments.reference, reference), eq(schema.payments.userId, u.id)));
  if (!p) return { error: "Payment not found." };
  const r = await verifyAndSettle(reference);
  const msg: Record<string, string> = { activated: "Payment confirmed. Your plan is now active.", already_processed: "This payment is already confirmed.", pending: "The payment provider has not confirmed this payment yet. Please try again in a minute.", failed: "This payment did not go through.", mismatch: "The paid amount did not match the order. Please contact support.", unknown_reference: "Payment not found." };
  return r === "activated" || r === "already_processed" ? { ok: true, message: msg[r] } : { error: msg[r] };
}

/** Development-only payment simulator: marks the payment, then the SAME server-side verification path settles it. */
export async function simulatePaymentAction(reference: string, outcome: "success" | "failed") {
  if (!simulatorEnabled()) redirect("/plans");
  const u = await requireUser(undefined, { allowPending: true });
  const db = await getDb();
  const [p] = await db.select().from(schema.payments).where(and(eq(schema.payments.reference, reference), eq(schema.payments.userId, u.id), eq(schema.payments.provider, "simulator")));
  if (!p) redirect("/plans");
  await db.update(schema.payments).set({ providerRef: outcome === "success" ? "sim:success" : "sim:failed" }).where(eq(schema.payments.id, p.id));
  void settlePayment;
  redirect(`/pay/callback?reference=${encodeURIComponent(reference)}`);
}
