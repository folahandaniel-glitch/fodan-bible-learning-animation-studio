import "server-only";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { getAsset } from "./services/media";

const SECURE = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" };

export async function serveLogoRow(l: typeof schema.logos.$inferSelect): Promise<Response> {
  const headers: Record<string, string> = { ...SECURE, "Cache-Control": "public, max-age=300, stale-while-revalidate=3600", "Content-Type": l.mime };
  if (l.svg) return new Response(l.svg, { headers });
  if (l.assetId) {
    const a = await getAsset(l.assetId);
    if (!a) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(a.data), { headers: { ...headers, "Content-Type": a.mime } });
  }
  if (l.builtinPath && /^\/brand\/[\w.-]+$/.test(l.builtinPath)) {
    const f = path.join(process.cwd(), "public", l.builtinPath);
    if (fs.existsSync(f)) return new Response(new Uint8Array(fs.readFileSync(f)), { headers });
  }
  return new Response("Not found", { status: 404 });
}

export async function logoById(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [l] = await db.select().from(schema.logos).where(eq(schema.logos.id, id));
  return l ?? null;
}

/** The newest ACTIVE logo tagged with an icon token (favicon-svg, favicon-32, favicon-ico, apple-180, pwa-192, pwa-512, pwa-maskable). */
export async function iconByToken(token: string) {
  const db = await getDb();
  const [l] = await db.select().from(schema.logos).where(and(eq(schema.logos.active, true), sql`${schema.logos.placements} @> ${JSON.stringify([token])}::jsonb`)).orderBy(desc(schema.logos.createdAt)).limit(1);
  return l ?? null;
}
