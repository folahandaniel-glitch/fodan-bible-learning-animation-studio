import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, type Actor } from "../audit";
import { can } from "@/lib/permissions";
import type { Role } from "../db/schema";

/**
 * Marks content as reviewed AND publishes it, in one step, for reviewers (Super Admin or Curriculum Administrator).
 * Only full lessons are affected (framework entries have no content to publish), templates and archived items are never touched.
 * Recorded in the audit log with the reviewer's name and the counts.
 */
export async function approveAndPublishAll(actor: Actor, user: { id: string; role: Role }, scope: "lessons" | "stories" | "all") {
  if (!can(user.role, "content.review")) throw new Error("Only a reviewer can approve content.");
  const db = await getDb();
  let lessons = 0, stories = 0;
  if (scope !== "stories") {
    const rows = await db.select({ id: schema.lessons.id }).from(schema.lessons).where(and(eq(schema.lessons.contentLevel, "complete"), ne(schema.lessons.status, "archived"), ne(schema.lessons.reviewStatus, "approved")));
    const draftish = await db.select({ id: schema.lessons.id }).from(schema.lessons).where(and(eq(schema.lessons.contentLevel, "complete"), inArray(schema.lessons.status, ["draft", "review", "approved"])));
    const ids = [...new Set([...rows.map((r) => r.id), ...draftish.map((r) => r.id)])];
    if (ids.length) await db.update(schema.lessons).set({ reviewStatus: "approved", status: "published", reviewerId: user.id, updatedAt: new Date() }).where(and(inArray(schema.lessons.id, ids), ne(schema.lessons.status, "archived")));
    lessons = ids.length;
  }
  if (scope !== "lessons") {
    const rows = await db.select({ id: schema.stories.id }).from(schema.stories).where(and(eq(schema.stories.isTemplate, false), ne(schema.stories.status, "archived")));
    const ids = rows.map((r) => r.id);
    if (ids.length) await db.update(schema.stories).set({ reviewStatus: "approved", status: "published", updatedAt: new Date() }).where(inArray(schema.stories.id, ids));
    stories = ids.length;
  }
  await audit(actor, "content.approve_all", undefined, { scope, lessons, stories });
  return { lessons, stories };
}
