import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "../db";
import { audit, type Actor } from "../audit";
import { safeEqual } from "../crypto";
import { appUrl, sendTemplate } from "./email";
import type { Role } from "../db/schema";

export type PayStatus = "pending" | "success" | "failed" | "abandoned";
export interface Verification { status: PayStatus; amountMinor: number; currency: string; providerRef?: string }

export interface PaymentProvider {
  name: string;
  configured(): boolean;
  init(i: { reference: string; amountMinor: number; currency: string; email: string; callbackUrl: string; metadata: Record<string, string> }): Promise<{ url: string }>;
  verify(reference: string): Promise<Verification>;
  checkWebhook(raw: string, headers: Headers): { ok: boolean; eventKey?: string; reference?: string; kind?: string };
}

// ───────────── Paystack (https://paystack.com/docs/api/) ─────────────
const paystack: PaymentProvider = {
  name: "paystack",
  configured: () => !!process.env.PAYSTACK_SECRET_KEY,
  async init(i) {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: i.email, amount: i.amountMinor, currency: i.currency, reference: i.reference, callback_url: i.callbackUrl, metadata: i.metadata }),
    });
    const j = (await res.json()) as { status?: boolean; message?: string; data?: { authorization_url?: string } };
    if (!res.ok || !j.status || !j.data?.authorization_url) throw new Error(j.message ?? "Could not start the payment.");
    return { url: j.data.authorization_url };
  },
  async verify(reference) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: "no-store" });
    const j = (await res.json()) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; id?: number } };
    if (!res.ok || !j.status || !j.data) return { status: "pending", amountMinor: 0, currency: "" };
    const s = j.data.status;
    return { status: s === "success" ? "success" : s === "failed" ? "failed" : s === "abandoned" ? "abandoned" : "pending", amountMinor: j.data.amount ?? 0, currency: j.data.currency ?? "", providerRef: String(j.data.id ?? "") };
  },
  checkWebhook(raw, headers) {
    const sig = headers.get("x-paystack-signature") ?? "";
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key || !sig) return { ok: false };
    const expected = createHmac("sha512", key).update(raw).digest("hex");
    if (!safeEqual(sig, expected)) return { ok: false };
    try {
      const body = JSON.parse(raw) as { event?: string; data?: { id?: number; reference?: string } };
      return { ok: true, kind: body.event, reference: body.data?.reference, eventKey: `${body.event}:${body.data?.id ?? body.data?.reference}` };
    } catch { return { ok: false }; }
  },
};

// ───────────── Simulator: development only, never available in production ─────────────
export const simulatorEnabled = () => process.env.NODE_ENV !== "production" && process.env.PAYMENTS_SIMULATOR !== "0" && !process.env.PAYSTACK_SECRET_KEY;
const simulator: PaymentProvider = {
  name: "simulator",
  configured: simulatorEnabled,
  async init(i) { return { url: `/pay/simulator?reference=${encodeURIComponent(i.reference)}` }; },
  async verify(reference) {
    const db = await getDb();
    const [p] = await db.select().from(schema.payments).where(eq(schema.payments.reference, reference));
    if (!p || p.provider !== "simulator") return { status: "pending", amountMinor: 0, currency: "" };
    const mark = p.providerRef ?? "";
    if (mark === "sim:success") return { status: "success", amountMinor: p.amountMinor, currency: p.currency, providerRef: mark };
    if (mark === "sim:failed") return { status: "failed", amountMinor: 0, currency: p.currency, providerRef: mark };
    return { status: "pending", amountMinor: 0, currency: "" };
  },
  checkWebhook: () => ({ ok: false }),
};

export function getProvider(name?: string): PaymentProvider | null {
  const n = name ?? (paystack.configured() ? "paystack" : simulator.configured() ? "simulator" : "");
  if (n === "paystack") return paystack.configured() ? paystack : null;
  if (n === "simulator") return simulator.configured() ? simulator : null;
  return null;
}
export const providerStatus = () => ({ paystack: paystack.configured(), simulator: simulatorEnabled() });

export const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);

// ───────────── checkout ─────────────
export interface CheckoutUser { id: string; email: string | null; role: Role; orgId: string | null; fullName: string }

export async function startCheckout(user: CheckoutUser, planId: string, opts: { forStudentId?: string } = {}) {
  const db = await getDb();
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, planId));
  if (!plan || !plan.active || plan.isDraft) throw new Error("That plan is not available.");
  if (plan.priceMinor <= 0) throw new Error("This plan has no price set yet. Please contact the administrator.");
  const ok: Record<string, Role[]> = { student: ["student", "parent"], family: ["parent"], teacher: ["teacher"], organisation: ["org_admin"] };
  if (!ok[plan.audience]?.includes(user.role)) throw new Error("This plan is not available for your account type.");
  if (plan.audience === "organisation" && !user.orgId) throw new Error("Your account is not linked to an organisation.");
  let forStudentId: string | null = null;
  if (user.role === "parent" && plan.audience === "student") {
    if (!opts.forStudentId) throw new Error("Choose which child this plan is for.");
    const [l] = await db.select().from(schema.parentLinks).where(and(eq(schema.parentLinks.parentId, user.id), eq(schema.parentLinks.studentId, opts.forStudentId), eq(schema.parentLinks.status, "active")));
    if (!l) throw new Error("You can only pay for a child linked to your account.");
    forStudentId = opts.forStudentId;
  }
  const provider = getProvider();
  if (!provider) throw new Error("Online payment is not set up yet. Please contact the administrator.");
  const reference = `FBL-${Date.now().toString(36).toUpperCase()}-${randomBytes(5).toString("hex").toUpperCase()}`;
  const [pay] = await db.insert(schema.payments).values({ reference, userId: user.id, planId: plan.id, forStudentId, amountMinor: plan.priceMinor, currency: plan.currency, provider: provider.name, status: "pending" }).returning();
  try {
    const { url } = await provider.init({
      reference, amountMinor: plan.priceMinor, currency: plan.currency, email: user.email ?? `${user.id}@no-email.invalid`,
      callbackUrl: `${appUrl()}/pay/callback`, metadata: { planId: plan.id, userId: user.id },
    });
    return { reference, url, paymentId: pay.id };
  } catch (e) {
    await db.update(schema.payments).set({ status: "failed", note: (e as Error).message.slice(0, 200), updatedAt: new Date() }).where(eq(schema.payments.id, pay.id));
    throw e;
  }
}

// ───────────── settlement: the ONLY place that activates a paid subscription ─────────────
export type SettleResult = "activated" | "already_processed" | "failed" | "pending" | "mismatch" | "unknown_reference";

/** Idempotent. Call only with a result obtained from the provider's server-side verification. */
export async function settlePayment(reference: string, v: Verification, dbIn?: DB): Promise<SettleResult> {
  const db = dbIn ?? (await getDb());
  const result = await db.transaction(async (tx) => {
    const rows = await tx.execute(sql`SELECT id FROM payments WHERE reference = ${reference} FOR UPDATE`);
    const found = (rows as unknown as { rows?: { id: string }[] }).rows ?? (rows as unknown as { id: string }[]);
    if (!found.length) return { r: "unknown_reference" as const };
    const [p] = await tx.select().from(schema.payments).where(eq(schema.payments.reference, reference));
    if (p.status === "success" || p.status === "refunded") return { r: "already_processed" as const };
    if (v.status === "pending") return { r: "pending" as const };
    if (v.status !== "success") {
      await tx.update(schema.payments).set({ status: v.status === "abandoned" ? "abandoned" : "failed", updatedAt: new Date() }).where(eq(schema.payments.id, p.id));
      return { r: "failed" as const };
    }
    if (v.amountMinor !== p.amountMinor || v.currency.toUpperCase() !== p.currency.toUpperCase()) {
      await tx.update(schema.payments).set({ status: "failed", note: "Verified amount or currency did not match the order.", updatedAt: new Date() }).where(eq(schema.payments.id, p.id));
      await audit({ id: null, label: "system" }, "payment.mismatch", { type: "payment", id: p.id }, { expected: p.amountMinor, got: v.amountMinor }, { db: tx });
      return { r: "mismatch" as const };
    }
    const [plan] = await tx.select().from(schema.plans).where(eq(schema.plans.id, p.planId));
    const [payer] = await tx.select().from(schema.users).where(eq(schema.users.id, p.userId));
    const now = new Date();
    // Subscription target: the child (parent paying for one child), the organisation, or the payer.
    const targetUser = plan.audience === "organisation" ? null : p.forStudentId ?? p.userId;
    const targetOrg = plan.audience === "organisation" ? payer.orgId : null;
    const sameTarget = targetOrg ? eq(schema.subscriptions.orgId, targetOrg) : eq(schema.subscriptions.userId, targetUser!);
    const [latest] = await tx.select().from(schema.subscriptions).where(and(sameTarget, eq(schema.subscriptions.planId, plan.id), eq(schema.subscriptions.status, "active"))).orderBy(desc(schema.subscriptions.endsAt)).limit(1);
    const startsAt = latest && latest.endsAt > now ? latest.endsAt : now; // renewal extends rather than overlaps
    const endsAt = new Date(startsAt.getTime() + plan.intervalDays * 86_400_000);
    const [sub] = await tx.insert(schema.subscriptions).values({
      userId: targetUser, orgId: targetOrg, planId: plan.id, planName: plan.name, status: "active", source: "payment", startsAt, endsAt,
      maxChildren: plan.maxChildren, seats: plan.maxSeats, features: plan.features, paymentId: p.id,
    }).returning();
    await tx.update(schema.payments).set({ status: "success", verifiedAt: now, providerRef: v.providerRef ?? p.providerRef, subscriptionId: sub.id, updatedAt: now }).where(eq(schema.payments.id, p.id));
    await audit({ id: null, label: "system" }, "payment.verified", { type: "payment", id: p.id }, { plan: plan.slug, amount: p.amountMinor, provider: p.provider }, { db: tx });
    await tx.insert(schema.notifications).values({ userId: p.userId, title: "Payment confirmed", body: `${plan.name} is active until ${endsAt.toDateString()}.`, href: "/account/billing" });
    return { r: "activated" as const, payer, plan, p, endsAt };
  });
  if (result.r === "activated" && result.payer.email) {
    await sendTemplate("payment_receipt", result.payer.email, { name: result.payer.displayName, plan: result.plan.name, amount: money(result.p.amountMinor, result.p.currency), reference: result.p.reference, endsAt: result.endsAt.toDateString() }).catch(() => undefined);
  }
  return result.r;
}

/** Re-verify with the provider (used by the return page, reconciliation and "check again"). */
export async function verifyAndSettle(reference: string): Promise<SettleResult> {
  const db = await getDb();
  const [p] = await db.select().from(schema.payments).where(eq(schema.payments.reference, reference));
  if (!p) return "unknown_reference";
  if (p.status === "success") return "already_processed";
  const provider = getProvider(p.provider);
  if (!provider) return "pending";
  return settlePayment(reference, await provider.verify(reference));
}

/** Webhook entry point: authenticity is checked by signature, duplicates are dropped, the payment is re-verified server-side. */
export async function handleWebhook(providerName: string, raw: string, headers: Headers): Promise<{ status: number; body: string }> {
  const provider = getProvider(providerName);
  if (!provider) return { status: 404, body: "unknown provider" };
  const chk = provider.checkWebhook(raw, headers);
  if (!chk.ok) return { status: 401, body: "invalid signature" };
  const db = await getDb();
  if (chk.eventKey) {
    const ins = await db.insert(schema.webhookEvents).values({ provider: provider.name, eventKey: chk.eventKey, kind: chk.kind ?? null }).onConflictDoNothing().returning({ id: schema.webhookEvents.id });
    if (!ins.length) return { status: 200, body: "duplicate" };
  }
  if (chk.reference && chk.kind === "charge.success") await verifyAndSettle(chk.reference);
  return { status: 200, body: "ok" };
}

// ───────────── administration ─────────────
export async function markRefunded(actor: Actor, paymentId: string, reason: string) {
  const db = await getDb();
  if (!reason.trim()) throw new Error("A reason is required.");
  const [p] = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId));
  if (!p || p.status !== "success") throw new Error("Only a successful payment can be marked refunded.");
  await db.update(schema.payments).set({ status: "refunded", note: reason, updatedAt: new Date() }).where(eq(schema.payments.id, paymentId));
  if (p.subscriptionId) await db.update(schema.subscriptions).set({ status: "revoked", reason: `Refunded: ${reason}` }).where(eq(schema.subscriptions.id, p.subscriptionId));
  await audit(actor, "payment.refund_recorded", { type: "payment", id: paymentId }, { reason });
}
export async function markDisputed(actor: Actor, paymentId: string, reason: string) {
  const db = await getDb();
  const [p] = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId));
  if (!p) throw new Error("Payment not found.");
  await db.update(schema.payments).set({ status: "disputed", note: reason, updatedAt: new Date() }).where(eq(schema.payments.id, paymentId));
  if (p.subscriptionId) await db.update(schema.subscriptions).set({ status: "suspended", reason: `Disputed: ${reason}` }).where(eq(schema.subscriptions.id, p.subscriptionId));
  await audit(actor, "payment.disputed", { type: "payment", id: paymentId }, { reason });
}

export async function reconcile() {
  const db = await getDb();
  const rows = await db.select({ status: schema.payments.status, n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${schema.payments.amountMinor}),0)::int` }).from(schema.payments).groupBy(schema.payments.status);
  const stale = await db.select().from(schema.payments).where(and(eq(schema.payments.status, "pending"), lt(schema.payments.createdAt, new Date(Date.now() - 30 * 60_000))));
  let settled = 0;
  for (const p of stale) { const r = await verifyAndSettle(p.reference); if (r === "activated") settled++; }
  return { byStatus: rows, stalePending: stale.length, settledNow: settled };
}
