import { eq } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";

/** Self-service export of the signed-in user's own data. Password hashes, TOTP secrets and session tokens are never included. */
export async function GET() {
  const s = await getSession();
  if (!s) return new Response("Sign in required", { status: 401 });
  const db = await getDb();
  const id = s.user.id;
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  const { passwordHash, totpSecret, ...safeUser } = u;
  void passwordHash; void totpSecret;
  const data = {
    exportedAt: new Date().toISOString(), account: safeUser,
    consents: await db.select().from(schema.consents).where(eq(schema.consents.userId, id)),
    lessonProgress: await db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, id)),
    examAttempts: await db.select().from(schema.examAttempts).where(eq(schema.examAttempts.userId, id)).then((r) => r.map(({ slots, ...a }) => { void slots; return a; })),
    gameSessions: await db.select({ gameKey: schema.gameSessions.gameKey, score: schema.gameSessions.score, startedAt: schema.gameSessions.startedAt }).from(schema.gameSessions).where(eq(schema.gameSessions.userId, id)),
    subscriptions: await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, id)),
    payments: await db.select().from(schema.payments).where(eq(schema.payments.userId, id)),
    notifications: await db.select().from(schema.notifications).where(eq(schema.notifications.userId, id)),
  };
  await audit({ id, label: u.fullName, role: u.role }, "privacy.export_download", { type: "user", id });
  return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="my-data.json"`, "Cache-Control": "no-store" } });
}
