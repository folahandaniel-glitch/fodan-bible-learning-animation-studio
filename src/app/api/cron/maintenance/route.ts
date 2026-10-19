import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { reconcile } from "@/server/services/payments";
import { sendTemplate, appUrl } from "@/server/services/email";
import { safeEqual } from "@/server/crypto";

export const dynamic = "force-dynamic";

/** Scheduled job: reconcile stale pending payments, remind about plans ending within 7 days, clear old rate-limit rows. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  const db = await getDb();
  const rec = await reconcile();
  const soon = await db.select({ s: schema.subscriptions, u: schema.users }).from(schema.subscriptions).innerJoin(schema.users, eq(schema.users.id, schema.subscriptions.userId))
    .where(and(eq(schema.subscriptions.status, "active"), gt(schema.subscriptions.endsAt, new Date()), lt(schema.subscriptions.endsAt, new Date(Date.now() + 7 * 86_400_000)), eq(schema.subscriptions.source, "payment")));
  let reminded = 0;
  for (const { s, u } of soon) {
    const already = await db.select({ id: schema.notifications.id }).from(schema.notifications).where(and(eq(schema.notifications.userId, u.id), eq(schema.notifications.title, `Your ${s.planName} plan ends soon`), gt(schema.notifications.createdAt, new Date(Date.now() - 6 * 86_400_000))));
    if (already.length) continue;
    await db.insert(schema.notifications).values({ userId: u.id, title: `Your ${s.planName} plan ends soon`, body: `It ends on ${s.endsAt.toDateString()}. Renew to keep learning without a break.`, href: "/plans" });
    if (u.email) await sendTemplate("subscription_expiry", u.email, { name: u.displayName, plan: s.planName, endsAt: s.endsAt.toDateString(), plansUrl: `${appUrl()}/plans` }).catch(() => undefined);
    reminded++;
  }
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`);
  return Response.json({ ok: true, reconciled: rec, reminded });
}
