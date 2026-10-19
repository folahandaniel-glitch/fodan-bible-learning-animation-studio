import { beforeAll, describe, expect, it } from "vitest";
process.env.FBL_DB_MEMORY = "1";
(process.env as Record<string, string>).NODE_ENV = "test";
import { getDb, schema } from "@/server/db";
import { CLASSES } from "@/content/curriculum";
import { parseRanges } from "@/lib/bible";
import { getPassages } from "@/server/bible-data";
import { sql, eq } from "drizzle-orm";

describe("seeded content", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  beforeAll(async () => { db = await getDb(); });

  it("has all 12 classes with the specified topic counts", async () => {
    const rows = await db.select().from(schema.classLevels);
    expect(rows.map((r) => r.name)).toEqual(expect.arrayContaining(["Primary 1", "Primary 6", "JSS 1", "JSS 3", "SSS 1", "SSS 3"]));
    expect(rows).toHaveLength(12);
    const counts = Object.fromEntries(CLASSES.map((c) => [c.slug, c.topics.length]));
    expect(counts).toEqual({ "primary-1": 22, "primary-2": 24, "primary-3": 24, "primary-4": 24, "primary-5": 22, "primary-6": 20, "jss-1": 24, "jss-2": 24, "jss-3": 23, "sss-1": 24, "sss-2": 23, "sss-3": 22 });
  });
  it("every topic and lesson reference parses and resolves to real Bible text", () => {
    const bad: string[] = [];
    for (const c of CLASSES) for (const [t, ref] of c.topics) for (const part of ref.split(/\s*;\s*/)) {
      if (!parseRanges(part).length) bad.push(`${c.slug}: ${t} -> ${part} (parse)`);
      else if (!getPassages(part, "kjv").length) bad.push(`${c.slug}: ${t} -> ${part} (no text)`);
    }
    expect(bad).toEqual([]);
  });
  it("every story passage and memory verse resolves; stories have scenes", async () => {
    const stories = await db.select().from(schema.stories);
    const bad: string[] = [];
    for (const st of stories) {
      if (!getPassages(st.passageRef, "kjv").length) bad.push(`${st.slug}: passage ${st.passageRef}`);
      if (st.memoryVerseRef && !getPassages(st.memoryVerseRef, "kjv").length) bad.push(`${st.slug}: memory ${st.memoryVerseRef}`);
      for (const sc of st.scenes) if (sc.ref && !getPassages(sc.ref, "kjv").length) bad.push(`${st.slug}: scene ref ${sc.ref}`);
      if (!st.scenes.length) bad.push(`${st.slug}: no scenes`);
    }
    expect(bad).toEqual([]);
    expect(stories.filter((s) => s.isTemplate)).toHaveLength(11);
  });
  it("lesson memory verses resolve; framework lessons are not published", async () => {
    const ls = await db.select().from(schema.lessons);
    const bad: string[] = [];
    for (const l of ls) {
      if (l.memoryVerseRef && !getPassages(l.memoryVerseRef, "kjv").length) bad.push(`${l.slug}: ${l.memoryVerseRef}`);
      if (l.contentLevel === "framework") expect(l.status).toBe("draft");
    }
    expect(bad).toEqual([]);
    expect(ls.filter((l) => l.contentLevel === "complete").length).toBe(36);
  });
  it("question bank is valid: exactly one correct answer for single-choice questions", async () => {
    const qs = await db.select().from(schema.questions);
    expect(qs.length).toBeGreaterThan(150);
    for (const q of qs) {
      if (q.type === "mcq" || q.type === "tf") expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      if (q.ref) expect(getPassages(q.ref, "kjv").length, `${q.text} -> ${q.ref}`).toBeGreaterThan(0);
    }
  });
  it("timeline, wings, plans and logos are loaded", async () => {
    expect((await db.select({ n: sql<number>`count(*)::int` }).from(schema.timelineEvents))[0].n).toBe(32);
    const wings = await db.select().from(schema.ministryWings);
    expect(wings.find((w) => w.slug === "crop")?.name).toContain("Child Rescue Operation Programmes");
    const plans = await db.select().from(schema.plans);
    expect(plans.every((p) => p.priceMinor === 0 && p.isDraft)).toBe(true); // no invented prices
    expect((await db.select().from(schema.logos).where(eq(schema.logos.isDefaultCrop, true))).length).toBe(1);
  });
});
