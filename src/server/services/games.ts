import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { BOOKS, parseRanges } from "@/lib/bible";
import { getPassages } from "../bible-data";
import { MEMORY_VERSES, WHO_SAID_IT } from "@/content/question-bank";
import { GAME_CATALOG } from "@/content/site";
import { CLASS_SLUGS, expandClasses } from "@/content/story-types";
import { canUse, type Viewer } from "./content";

function shuffle<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = randomInt(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }
const pick = <T,>(a: T[], n: number) => shuffle(a).slice(0, n);

/** Stored server-side, including answers. The browser only ever receives `publicItem()`. */
export type GameItem =
  | { kind: "choice"; prompt: string; sub?: string; options: { id: string; text: string }[]; answer: string; explanation: string; ref?: string }
  | { kind: "order"; prompt: string; items: { id: string; text: string }[]; answer: string[]; explanation: string; ref?: string };
export type PublicItem = { kind: "choice"; prompt: string; sub?: string; options: { id: string; text: string }[] } | { kind: "order"; prompt: string; items: { id: string; text: string }[] };
export const publicItem = (i: GameItem): PublicItem => (i.kind === "choice" ? { kind: "choice", prompt: i.prompt, sub: i.sub, options: i.options } : { kind: "order", prompt: i.prompt, items: i.items });

const opts = (correct: string, wrong: string[]) => {
  const all = shuffle([correct, ...wrong].map((t, i) => ({ id: String(i), text: t })));
  return { options: all, answer: all.find((o) => o.text === correct)!.id };
};
const classIdx = (slug: string | null | undefined) => (slug ? CLASS_SLUGS.indexOf(slug) + 1 : 0);
const inRange = (cl: string, idx: number) => !idx || expandClasses(cl).some((c) => classIdx(c) === idx);

export const GAME_KEYS = GAME_CATALOG.map((g) => g.key);

async function buildItems(key: string, classSlug: string | null): Promise<GameItem[]> {
  const db = await getDb();
  const idx = classIdx(classSlug);
  const tag = (t: string) => (q: typeof schema.questions.$inferSelect) => q.tags.includes(t);
  const pool = async (tags?: string, count = 10) => {
    const rows = await db.select().from(schema.questions).where(eq(schema.questions.status, "published"));
    const ok = rows.filter((q) => (q.type === "mcq" || q.type === "tf") && (idx ? (q.classMin != null && idx >= q.classMin && idx <= (q.classMax ?? 12)) : true) && (tags ? tag(tags)(q) : true));
    return pick(ok.length >= 4 ? ok : rows.filter((q) => q.type === "mcq" || q.type === "tf"), count).map<GameItem>((q) => {
      const correct = q.options.find((o) => o.correct)!;
      const options = shuffle(q.options).map((o) => ({ id: o.id, text: o.text }));
      return { kind: "choice", prompt: q.text, options, answer: correct.id, explanation: q.explanation || (q.ref ? `See ${q.ref}.` : ""), ref: q.ref ?? undefined };
    });
  };
  switch (key) {
    case "trivia": return pool(undefined, 10);
    case "timed-revision": return pool(undefined, 20);
    case "geography": return pool("geography", 10);
    case "who-said-it": {
      const items: GameItem[] = [];
      for (const w of pick(WHO_SAID_IT.filter((x) => inRange(x.cl, idx)), 8)) {
        const text = getPassages(w.ref, "kjv")[0]?.verses.map((v) => v.text).join(" ");
        if (!text) continue;
        const o = opts(w.speaker, w.others);
        items.push({ kind: "choice", prompt: "Who said this?", sub: `"${text}"`, options: o.options, answer: o.answer, explanation: `${w.speaker} (${w.ref}).`, ref: w.ref });
      }
      return items;
    }
    case "book-order": {
      const out: GameItem[] = [];
      for (let r = 0; r < 5; r++) {
        const pickIdx = pick(BOOKS.map((b) => b.i), 5).sort((a, b) => a - b);
        out.push({ kind: "order", prompt: "Put these books in the order they appear in the Bible.", items: shuffle(pickIdx.map((i) => ({ id: String(i), text: BOOKS[i].name }))), answer: pickIdx.map(String), explanation: pickIdx.map((i) => BOOKS[i].name).join(", ") });
      }
      return out;
    }
    case "ot-nt": return pick(BOOKS, 12).map<GameItem>((b) => ({ kind: "choice", prompt: `Is ${b.name} in the Old Testament or the New Testament?`, options: [{ id: "OT", text: "Old Testament" }, { id: "NT", text: "New Testament" }], answer: b.ot ? "OT" : "NT", explanation: `${b.name} is in the ${b.ot ? "Old" : "New"} Testament (${b.group}).` }));
    case "verse-reference": case "complete-verse": case "treasure-hunt": {
      const verses = MEMORY_VERSES.filter((v) => inRange(v.cl, idx));
      const withText = verses.map((v) => ({ v, text: getPassages(v.ref, "kjv")[0]?.verses.map((x) => x.text).join(" ") })).filter((x): x is { v: (typeof verses)[number]; text: string } => !!x.text);
      const chosen = pick(withText, 8);
      return chosen.map<GameItem>(({ v, text }) => {
        if (key === "verse-reference") {
          const o = opts(v.ref, pick(withText.filter((x) => x.v.ref !== v.ref), 3).map((x) => x.v.ref));
          return { kind: "choice", prompt: "Which reference matches this verse?", sub: `"${text}"`, options: o.options, answer: o.answer, explanation: `This is ${v.ref}.`, ref: v.ref };
        }
        if (key === "treasure-hunt") {
          const book = BOOKS[parseRanges(v.ref)[0].book];
          const o = opts(book.name, pick(BOOKS.filter((b) => b.i !== book.i && b.ot === book.ot), 3).map((b) => b.name));
          return { kind: "choice", prompt: "In which book of the Bible is this verse found?", sub: `"${text}"`, options: o.options, answer: o.answer, explanation: `It is in ${book.name} (${v.ref}).`, ref: v.ref };
        }
        const words = text.split(/\s+/);
        const cands = words.map((w, i) => ({ w: w.replace(/[^A-Za-z']/g, ""), i })).filter((x) => x.w.length >= 5);
        const target = cands.length ? cands[randomInt(cands.length)] : { w: words[0].replace(/[^A-Za-z']/g, ""), i: 0 };
        const blanked = words.map((w, i) => (i === target.i ? w.replace(target.w, "_____") : w)).join(" ");
        const others = [...new Set(withText.flatMap((x) => x.text.split(/\s+/).map((w) => w.replace(/[^A-Za-z']/g, ""))).filter((w) => w.length >= 5 && w.toLowerCase() !== target.w.toLowerCase()))];
        const o = opts(target.w, pick(others, 3));
        return { kind: "choice", prompt: `Complete the verse (${v.ref}).`, sub: blanked, options: o.options, answer: o.answer, explanation: `The word is "${target.w}" (${v.ref}).`, ref: v.ref };
      });
    }
    case "story-sequence": {
      const stories = (await db.select().from(schema.stories).where(and(eq(schema.stories.status, "published"), eq(schema.stories.isTemplate, false)))).filter((s) => s.scenes.length >= 5 && s.scenes.every((sc) => sc.ref));
      return pick(stories.filter((s) => (idx ? s.classSlugs.includes(classSlug!) : true)).length >= 2 ? stories.filter((s) => (idx ? s.classSlugs.includes(classSlug!) : true)) : stories, 4).map<GameItem>((s) => {
        const sc = s.scenes.slice(0, 5);
        return { kind: "order", prompt: `Put the scenes of "${s.title}" in order.`, items: shuffle(sc.map((x, i) => ({ id: String(i), text: x.title }))), answer: sc.map((_, i) => String(i)), explanation: sc.map((x) => x.title).join(" → "), ref: s.passageRef };
      });
    }
    case "timeline-order": {
      const ev = await db.select().from(schema.timelineEvents).where(eq(schema.timelineEvents.status, "published"));
      const out: GameItem[] = [];
      for (let r = 0; r < 4; r++) {
        const chosen = pick(ev, 4).sort((a, b) => a.sort - b.sort);
        out.push({ kind: "order", prompt: "Put these events in the order of the biblical story (earliest first).", items: shuffle(chosen.map((e) => ({ id: e.slug, text: e.title }))), answer: chosen.map((e) => e.slug), explanation: chosen.map((e) => `${e.title} (${e.ref})`).join(" → ") });
      }
      return out;
    }
    case "character-story": {
      const stories = (await db.select().from(schema.stories).where(and(eq(schema.stories.status, "published"), eq(schema.stories.isTemplate, false)))).filter((s) => (idx ? s.classSlugs.includes(classSlug!) : true));
      const base = stories.length >= 6 ? stories : await db.select().from(schema.stories).where(and(eq(schema.stories.status, "published"), eq(schema.stories.isTemplate, false)));
      return pick(base, 8).map<GameItem>((s) => {
        const first = s.summary.split(/(?<=[.!?])\s/)[0];
        const o = opts(s.passageRef, pick(base.filter((x) => x.id !== s.id), 3).map((x) => x.passageRef));
        return { kind: "choice", prompt: "Which passage tells this story?", sub: first, options: o.options, answer: o.answer, explanation: `${s.title}: ${s.passageRef}.`, ref: s.passageRef };
      });
    }
    default: return [];
  }
}

export async function startGame(viewer: NonNullable<Viewer>, key: string, classSlug: string | null): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const def = GAME_CATALOG.find((g) => g.key === key && g.status === "live");
  if (!def) return { ok: false, error: "That game is not available." };
  if (!(await canUse(viewer, "games"))) return { ok: false, error: "Games need an active plan." };
  const items = await buildItems(key, classSlug);
  if (!items.length) return { ok: false, error: "Not enough content for this game yet." };
  const db = await getDb();
  const [row] = await db.insert(schema.gameSessions).values({ userId: viewer.id, gameKey: key, classLevelSlug: classSlug, items, total: items.length }).returning();
  return { ok: true, sessionId: row.id };
}

export async function getGameView(userId: string, sessionId: string) {
  const db = await getDb();
  const [g] = await db.select().from(schema.gameSessions).where(and(eq(schema.gameSessions.id, sessionId), eq(schema.gameSessions.userId, userId)));
  if (!g) return null;
  const items = g.items as GameItem[];
  return { id: g.id, key: g.gameKey, score: g.score, total: g.total, finished: !!g.finishedAt, answered: g.answered, items: items.map(publicItem) };
}

export interface AnswerResult { correct: boolean; explanation: string; ref?: string; correctAnswer: string | string[]; points: number; score: number; finished: boolean }

/** The server decides whether an answer is right and records the score; the browser never holds the answer key. */
export async function answerGame(userId: string, sessionId: string, index: number, answer: string | string[]): Promise<AnswerResult | { error: string }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM game_sessions WHERE id = ${sessionId} FOR UPDATE`);
    const [g] = await tx.select().from(schema.gameSessions).where(and(eq(schema.gameSessions.id, sessionId), eq(schema.gameSessions.userId, userId)));
    if (!g) return { error: "Game not found." };
    const items = g.items as GameItem[];
    const it = items[index];
    if (!it) return { error: "No such question." };
    if (g.finishedAt || g.answered[String(index)] !== undefined) return { error: "Already answered." };
    const ok = it.kind === "choice" ? answer === it.answer : Array.isArray(answer) && answer.length === it.answer.length && answer.every((x, i) => x === it.answer[i]);
    const streak = ok ? g.streak + 1 : 0;
    const points = ok ? 10 + Math.min(streak - 1, 5) * 2 : 0;
    const answered = { ...g.answered, [String(index)]: ok };
    const finished = Object.keys(answered).length >= items.length;
    await tx.update(schema.gameSessions).set({ answered, score: g.score + points, streak, finishedAt: finished ? new Date() : null }).where(eq(schema.gameSessions.id, sessionId));
    return { correct: ok, explanation: it.explanation, ref: it.ref, correctAnswer: it.answer, points, score: g.score + points, finished };
  });
}

/** Leaderboards show friendly aliases only, never names, and are limited to the learner's own organisation when there is one. */
export async function leaderboard(gameKey: string, orgId: string | null, limit = 10) {
  const db = await getDb();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db.select({ alias: schema.users.gameAlias, cls: schema.users.classLevelSlug, best: sql<number>`max(${schema.gameSessions.score})::int` })
    .from(schema.gameSessions).innerJoin(schema.users, eq(schema.users.id, schema.gameSessions.userId))
    .where(and(eq(schema.gameSessions.gameKey, gameKey), gte(schema.gameSessions.startedAt, since), sql`${schema.gameSessions.finishedAt} is not null`, orgId ? eq(schema.users.orgId, orgId) : sql`${schema.users.orgId} is null`))
    .groupBy(schema.users.id, schema.users.gameAlias, schema.users.classLevelSlug).orderBy(desc(sql`max(${schema.gameSessions.score})`)).limit(limit);
  return rows.map((r) => ({ alias: r.alias ?? "Friendly Learner", best: r.best }));
}

export async function myGameStats(userId: string) {
  const db = await getDb();
  return db.select({ gameKey: schema.gameSessions.gameKey, plays: sql<number>`count(*)::int`, best: sql<number>`max(${schema.gameSessions.score})::int` }).from(schema.gameSessions)
    .where(and(eq(schema.gameSessions.userId, userId), sql`${schema.gameSessions.finishedAt} is not null`)).groupBy(schema.gameSessions.gameKey);
}
