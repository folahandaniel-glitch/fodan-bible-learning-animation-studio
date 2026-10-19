import "server-only";
import { sql } from "drizzle-orm";
import { getDb, schema } from "./db";

/** Fixed-window limiter stored in the database so it holds across serverless instances. Returns true when the call is allowed. */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  if (process.env.NODE_ENV === "test" && !process.env.FBL_TEST_RATELIMIT) return true; // unit tests share one address
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${schema.rateLimits.windowStart} < ${new Date(now.getTime() - windowSec * 1000)} THEN 1 ELSE ${schema.rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${schema.rateLimits.windowStart} < ${new Date(now.getTime() - windowSec * 1000)} THEN ${now} ELSE ${schema.rateLimits.windowStart} END`,
      },
    })
    .returning({ count: schema.rateLimits.count });
  return row.count <= max;
}
