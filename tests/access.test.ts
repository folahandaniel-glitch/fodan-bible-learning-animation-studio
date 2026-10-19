import { createHmac } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
process.env.FBL_DB_MEMORY = "1";
(process.env as Record<string, string>).NODE_ENV = "test";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { registerUser, authenticate, requestPasswordReset, resetPasswordWithToken, linkChild, createChildByParent, parentOwnsChild, createAccessKey, redeemScholarshipKey } from "@/server/services/auth";
import { getEntitlement, grantEntitlement, changeEntitlement, hasFeature } from "@/server/services/entitlements";
import { settlePayment, startCheckout, handleWebhook, markRefunded } from "@/server/services/payments";
import { sha256 } from "@/server/crypto";

let n = 0;
const uniq = () => `${Date.now().toString(36)}${n++}`;
type DB = Awaited<ReturnType<typeof getDb>>;
let db: DB;
const pw = "Sturdy-Pass-2026";

async function mkUser(type: "student" | "parent" | "teacher", extra: Partial<Parameters<typeof registerUser>[0]> = {}) {
  const u = uniq();
  const r = await registerUser({ type, fullName: `Test ${type} ${u}`, username: `${type}${u}`, email: type === "student" ? undefined : `${type}${u}@example.com`, password: pw, classLevelSlug: "primary-1", guardianConsent: true, ...extra });
  if (!r.ok) throw new Error(r.error);
  return { id: r.userId, username: `${type}${u}`, email: `${type}${u}@example.com`, status: r.status };
}
async function mkPlan(over: Partial<typeof schema.plans.$inferInsert> = {}) {
  const [p] = await db.insert(schema.plans).values({ slug: `p-${uniq()}`, name: "Test plan", audience: "student", priceMinor: 500000, currency: "NGN", intervalDays: 30, features: ["lessons", "exams"], maxChildren: 1, maxSeats: 1, isDraft: false, ...over }).returning();
  return p;
}
const asCheckout = async (id: string) => { const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id)); return { id: u.id, email: u.email, role: u.role, orgId: u.orgId, fullName: u.fullName }; };

beforeAll(async () => { db = await getDb(); });
afterEach(() => { vi.unstubAllGlobals(); delete process.env.PAYSTACK_SECRET_KEY; });

describe("registration and login", () => {
  it("registers a student, who has NO paid access before payment", async () => {
    const s = await mkUser("student");
    expect((await getEntitlement(s.id)).active).toBe(false);
  });
  it("rejects weak passwords, missing guardian consent and bad emails", async () => {
    const u = uniq();
    expect((await registerUser({ type: "student", fullName: "Weak Pw", username: `w${u}`, password: "short1", classLevelSlug: "primary-1", guardianConsent: true })).ok).toBe(false);
    expect((await registerUser({ type: "student", fullName: "No Consent", username: `n${u}`, password: pw, classLevelSlug: "primary-1" })).ok).toBe(false);
    expect((await registerUser({ type: "parent", fullName: "Bad Email", email: "nope", password: pw })).ok).toBe(false);
  });
  it("teacher registration is pending until approved", async () => {
    const t = await mkUser("teacher");
    expect(t.status).toBe("pending");
    expect((await getEntitlement(t.id)).active).toBe(false);
  });
  it("login works, locks out after repeated failures, and does not reveal which part was wrong", async () => {
    const p = await mkUser("parent");
    const ok = await authenticate(p.username, pw, { ip: "1.1.1.1" });
    expect(ok.ok).toBe(true);
    const bad1 = await authenticate(p.username, "wrong-password-1", { ip: "2.2.2.2" });
    const bad2 = await authenticate("no-such-user-xyz", "wrong-password-1", { ip: "2.2.2.3" });
    expect(bad1).toEqual(bad2);
    for (let i = 0; i < 7; i++) await authenticate(p.username, "wrong-password-x", { ip: `3.3.3.${i}` });
    const locked = await authenticate(p.username, pw, { ip: "4.4.4.4" });
    expect(locked.ok).toBe(false);
  });
  it("password reset is generic, single-use and expiring", async () => {
    const p = await mkUser("parent");
    await requestPasswordReset(p.email, { ip: "9.9.9.9" });
    await requestPasswordReset("nobody@example.com", { ip: "9.9.9.9" });
    const [row] = await db.select().from(schema.passwordResets).where(eq(schema.passwordResets.userId, p.id));
    expect(row).toBeTruthy();
    const token = "known-token-" + uniq().padEnd(30, "x");
    await db.update(schema.passwordResets).set({ tokenHash: sha256(token) }).where(eq(schema.passwordResets.id, row.id));
    expect((await resetPasswordWithToken(token, "Another-Strong-1", { ip: "x" })).ok).toBe(true);
    expect((await resetPasswordWithToken(token, "Third-Strong-Pass-1", { ip: "x" })).ok).toBe(false);
    expect((await authenticate(p.username, "Another-Strong-1", { ip: "5.5.5.5" })).ok).toBe(true);
    const t2 = "expired-token-" + uniq().padEnd(30, "y");
    await db.insert(schema.passwordResets).values({ userId: p.id, tokenHash: sha256(t2), purpose: "reset", expiresAt: new Date(Date.now() - 1000) });
    expect((await resetPasswordWithToken(t2, "Brand-New-Pass-9", { ip: "x" })).ok).toBe(false);
  });
});

describe("payments and entitlements", () => {
  it("activates only after verified success, is idempotent, and handles duplicates", async () => {
    const s = await mkUser("student");
    const plan = await mkPlan();
    const co = await startCheckout(await asCheckout(s.id), plan.id);
    expect(co.url).toContain("/pay/simulator");
    expect((await getEntitlement(s.id)).active).toBe(false);
    expect(await settlePayment(co.reference, { status: "pending", amountMinor: 0, currency: "" })).toBe("pending");
    expect((await getEntitlement(s.id)).active).toBe(false);
    expect(await settlePayment(co.reference, { status: "success", amountMinor: 500000, currency: "NGN" })).toBe("activated");
    const ent = await getEntitlement(s.id);
    expect(ent.active).toBe(true);
    expect(hasFeature(ent, "lessons")).toBe(true);
    expect(hasFeature(ent, "games")).toBe(false);
    expect(await settlePayment(co.reference, { status: "success", amountMinor: 500000, currency: "NGN" })).toBe("already_processed");
    const subs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, s.id));
    expect(subs).toHaveLength(1);
  });
  it("rejects an amount mismatch, a failed payment and an unknown reference", async () => {
    const s = await mkUser("student");
    const plan = await mkPlan();
    const a = await startCheckout(await asCheckout(s.id), plan.id);
    expect(await settlePayment(a.reference, { status: "success", amountMinor: 100, currency: "NGN" })).toBe("mismatch");
    const b = await startCheckout(await asCheckout(s.id), plan.id);
    expect(await settlePayment(b.reference, { status: "failed", amountMinor: 0, currency: "NGN" })).toBe("failed");
    expect(await settlePayment("FBL-DOES-NOT-EXIST", { status: "success", amountMinor: 1, currency: "NGN" })).toBe("unknown_reference");
    expect((await getEntitlement(s.id)).active).toBe(false);
  });
  it("expiry locks, renewal extends, revocation locks", async () => {
    const s = await mkUser("student");
    const plan = await mkPlan();
    const co = await startCheckout(await asCheckout(s.id), plan.id);
    await settlePayment(co.reference, { status: "success", amountMinor: 500000, currency: "NGN" });
    const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, s.id));
    const later = new Date(sub.endsAt.getTime() + 86_400_000);
    expect((await getEntitlement(s.id, { now: later })).active).toBe(false);
    const co2 = await startCheckout(await asCheckout(s.id), plan.id);
    await settlePayment(co2.reference, { status: "success", amountMinor: 500000, currency: "NGN" });
    const subs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, s.id));
    expect(subs).toHaveLength(2);
    expect(Math.max(...subs.map((x) => x.endsAt.getTime()))).toBeGreaterThan(sub.endsAt.getTime() + 25 * 86_400_000);
    expect((await getEntitlement(s.id, { now: later })).active).toBe(true);
    for (const x of subs) await changeEntitlement({ id: null, label: "t" }, x.id, { action: "revoke", reason: "test revoke" });
    expect((await getEntitlement(s.id)).active).toBe(false);
    await expect(changeEntitlement({ id: null }, subs[0].id, { action: "reactivate", reason: "" })).rejects.toThrow();
  });
  it("administrator-granted scholarship opens access, with an audit entry and a mandatory reason", async () => {
    const s = await mkUser("student");
    await grantEntitlement({ id: null, label: "admin" }, { userId: s.id, days: 30, source: "scholarship", reason: "Approved scholarship" });
    expect((await getEntitlement(s.id)).active).toBe(true);
    const logs = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "entitlement.grant"));
    expect(logs.length).toBeGreaterThan(0);
    await expect(grantEntitlement({ id: null }, { userId: s.id, days: 30, source: "admin", reason: " " })).rejects.toThrow();
  });
  it("scholarship keys grant access but registration keys never bypass payment", async () => {
    const adm = { id: null, label: "admin" };
    const regKey = await createAccessKey(adm, { label: "reg", purpose: "registration", role: "student", maxUses: 1 });
    const u = uniq();
    const r = await registerUser({ type: "student", fullName: "Keyed Student", username: `k${u}`, password: pw, classLevelSlug: "primary-2", guardianConsent: true, accessKey: regKey });
    expect(r.ok).toBe(true);
    if (r.ok) expect((await getEntitlement(r.userId)).active).toBe(false);
    const again = await registerUser({ type: "student", fullName: "Second Use", username: `k2${u}`, password: pw, classLevelSlug: "primary-2", guardianConsent: true, accessKey: regKey });
    expect(again.ok).toBe(false);
    const sch = await createAccessKey(adm, { label: "sch", purpose: "scholarship", role: "student", maxUses: 1, grantDays: 14 });
    const s = await mkUser("student");
    expect((await redeemScholarshipKey(s.id, sch)).ok).toBe(true);
    expect((await getEntitlement(s.id)).active).toBe(true);
    expect((await redeemScholarshipKey((await mkUser("student")).id, sch)).ok).toBe(false);
  });
  it("suspended accounts have no entitlement", async () => {
    const s = await mkUser("student");
    await grantEntitlement({ id: null }, { userId: s.id, days: 30, source: "admin", reason: "x" });
    await db.update(schema.users).set({ status: "suspended" }).where(eq(schema.users.id, s.id));
    expect((await getEntitlement(s.id)).active).toBe(false);
  });
  it("refund records revoke access", async () => {
    const s = await mkUser("student");
    const co = await startCheckout(await asCheckout(s.id), (await mkPlan()).id);
    await settlePayment(co.reference, { status: "success", amountMinor: 500000, currency: "NGN" });
    const [pay] = await db.select().from(schema.payments).where(eq(schema.payments.reference, co.reference));
    await markRefunded({ id: null, label: "fin" }, pay.id, "Customer request");
    expect((await getEntitlement(s.id)).active).toBe(false);
  });
});

describe("parent-child rules", () => {
  it("links securely, limits family plans, and blocks other parents", async () => {
    const p1 = await mkUser("parent"), p2 = await mkUser("parent");
    const kidA = await createChildByParent({ id: p1.id, orgId: null }, { fullName: "Kid A", username: `kida${uniq()}`, password: pw, classLevelSlug: "primary-1" });
    const kidB = await createChildByParent({ id: p1.id, orgId: null }, { fullName: "Kid B", username: `kidb${uniq()}`, password: pw, classLevelSlug: "primary-3" });
    if (!kidA.ok || !kidB.ok) throw new Error("child create failed");
    expect(await parentOwnsChild(p1.id, kidA.childId)).toBe(true);
    expect(await parentOwnsChild(p2.id, kidA.childId)).toBe(false);
    const [a] = await db.select().from(schema.users).where(eq(schema.users.id, kidA.childId));
    expect((await linkChild(p2.id, a.username!, "WRNG-CODE")).ok).toBe(false);
    expect(await parentOwnsChild(p2.id, kidA.childId)).toBe(false);
    expect((await linkChild(p2.id, a.username!, a.linkCode!)).ok).toBe(true);
    const plan = await mkPlan({ audience: "family", maxChildren: 1 });
    const co = await startCheckout(await asCheckout(p1.id), plan.id);
    await settlePayment(co.reference, { status: "success", amountMinor: 500000, currency: "NGN" });
    expect((await getEntitlement(kidA.childId)).active).toBe(true);
    expect((await getEntitlement(kidB.childId)).active).toBe(false);
    expect((await getEntitlement(p2.id)).active).toBe(false);
  });
  it("a parent cannot buy a student plan for someone else's child", async () => {
    const p1 = await mkUser("parent"), p2 = await mkUser("parent");
    const kid = await createChildByParent({ id: p1.id, orgId: null }, { fullName: "Kid C", username: `kidc${uniq()}`, password: pw, classLevelSlug: "primary-1" });
    if (!kid.ok) throw new Error("x");
    await expect(startCheckout(await asCheckout(p2.id), (await mkPlan()).id, { forStudentId: kid.childId })).rejects.toThrow();
    const co = await startCheckout(await asCheckout(p1.id), (await mkPlan()).id, { forStudentId: kid.childId });
    await settlePayment(co.reference, { status: "success", amountMinor: 500000, currency: "NGN" });
    expect((await getEntitlement(kid.childId)).active).toBe(true);
  });
});

describe("Paystack webhook and callback", () => {
  const SECRET = "sk_test_unit_test_secret";
  async function pending() {
    const s = await mkUser("student");
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    const plan = await mkPlan();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout.paystack.com/x" } }), { status: 200 })));
    const co = await startCheckout(await asCheckout(s.id), plan.id);
    return { s, co };
  }
  const sign = (raw: string) => createHmac("sha512", SECRET).update(raw).digest("hex");
  it("rejects an invalid signature and does not activate", async () => {
    const { s, co } = await pending();
    const raw = JSON.stringify({ event: "charge.success", data: { id: 1, reference: co.reference } });
    const res = await handleWebhook("paystack", raw, new Headers({ "x-paystack-signature": "bad" }));
    expect(res.status).toBe(401);
    expect((await getEntitlement(s.id)).active).toBe(false);
  });
  it("verifies server-side, activates once and ignores a duplicate event", async () => {
    const { s, co } = await pending();
    const raw = JSON.stringify({ event: "charge.success", data: { id: 777, reference: co.reference } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: true, data: { status: "success", amount: 500000, currency: "NGN", id: 777 } }), { status: 200 })));
    const h = new Headers({ "x-paystack-signature": sign(raw) });
    expect((await handleWebhook("paystack", raw, h)).body).toBe("ok");
    expect((await getEntitlement(s.id)).active).toBe(true);
    expect((await handleWebhook("paystack", raw, h)).body).toBe("duplicate");
    expect(await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, s.id))).toHaveLength(1);
  });
  it("a signed webhook for an unpaid transaction does not activate when the provider says it is not successful", async () => {
    const { s, co } = await pending();
    const raw = JSON.stringify({ event: "charge.success", data: { id: 888, reference: co.reference } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: true, data: { status: "abandoned", amount: 500000, currency: "NGN", id: 888 } }), { status: 200 })));
    await handleWebhook("paystack", raw, new Headers({ "x-paystack-signature": sign(raw) }));
    expect((await getEntitlement(s.id)).active).toBe(false);
    const [p] = await db.select().from(schema.payments).where(and(eq(schema.payments.reference, co.reference)));
    expect(p.status).not.toBe("success");
  });
});

describe("rate limiting", () => {
  it("blocks after the configured number of attempts in a window", async () => {
    process.env.FBL_TEST_RATELIMIT = "1";
    const { rateLimit } = await import("@/server/rate-limit");
    const key = "unit:" + uniq();
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await rateLimit(key, 3, 60));
    delete process.env.FBL_TEST_RATELIMIT;
    expect(results).toEqual([true, true, true, false, false]);
  });
});
