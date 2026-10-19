import "server-only";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { getEntitlement, hasFeature, type Feature } from "./entitlements";
import { getPassages, type Passage } from "../bible-data";
import { isStaffRole } from "@/lib/permissions";
import { getSetting } from "../settings";
import type { SessionUser } from "../auth/session";
import type { LessonBody, TeacherNotes } from "../db/schema";
import type { TranslationId } from "@/lib/bible";

export type Viewer = Pick<SessionUser, "id" | "role" | "status"> | null;
export const isTeacherLike = (v: Viewer) => !!v && (v.role === "teacher" || isStaffRole(v.role) || v.role === "org_admin");

/** One shared rule for protected content: staff preview, free content, or an entitled (paid) learner. */
export async function canUse(viewer: Viewer, feature: Feature, free = false): Promise<boolean> {
  if (free) return true;
  if (!viewer || viewer.status !== "active") return false;
  // Approved teachers may use teaching content without a subscription unless the Super Admin requires one.
  if (viewer.role === "teacher" && feature !== "exams" && !(await getSetting("features")).teacherRequiresSubscription) return true;
  const ent = await getEntitlement(viewer.id);
  return hasFeature(ent, feature);
}

export const publishedNow = () => and(eq(schema.lessons.status, "published"), or(isNull(schema.lessons.publishAt), lte(schema.lessons.publishAt, new Date())));

// ───────── public catalogue (no protected content) ─────────
export async function listClasses() {
  const db = await getDb();
  const classes = await db.select().from(schema.classLevels).where(eq(schema.classLevels.archived, false)).orderBy(asc(schema.classLevels.sort));
  const counts = await db.select({ classLevelId: schema.lessons.classLevelId, contentLevel: schema.lessons.contentLevel, status: schema.lessons.status, n: sql<number>`count(*)::int` }).from(schema.lessons).groupBy(schema.lessons.classLevelId, schema.lessons.contentLevel, schema.lessons.status);
  return classes.map((c) => {
    const mine = counts.filter((x) => x.classLevelId === c.id);
    return { ...c, topicCount: mine.reduce((a, x) => a + x.n, 0), readyCount: mine.filter((x) => x.contentLevel === "complete" && x.status === "published").reduce((a, x) => a + x.n, 0) };
  });
}

export async function getClassOutline(slug: string) {
  const db = await getDb();
  const [cls] = await db.select().from(schema.classLevels).where(eq(schema.classLevels.slug, slug));
  if (!cls) return null;
  const topics = await db.select().from(schema.topics).where(and(eq(schema.topics.classLevelId, cls.id), eq(schema.topics.archived, false))).orderBy(asc(schema.topics.sort));
  const lessons = await db.select({ id: schema.lessons.id, topicId: schema.lessons.topicId, slug: schema.lessons.slug, status: schema.lessons.status, contentLevel: schema.lessons.contentLevel, isFree: schema.lessons.isFree, reviewStatus: schema.lessons.reviewStatus, memoryVerseRef: schema.lessons.memoryVerseRef })
    .from(schema.lessons).where(eq(schema.lessons.classLevelId, cls.id));
  const byTopic = new Map(lessons.map((l) => [l.topicId, l]));
  return { cls, topics: topics.map((t) => ({ ...t, lesson: byTopic.get(t.id) ?? null })) };
}

// ───────── protected lesson access ─────────
export interface LessonView {
  id: string; slug: string; title: string; classSlug: string; className: string; topicTitle: string | null; refs: string[]; memoryVerseRef: string | null;
  status: string; contentLevel: string; reviewStatus: string; origin: string; isFree: boolean;
  access: "full" | "locked" | "framework";
  summary?: string;
  body?: LessonBody; passages?: Passage[]; memoryVerse?: Passage | null;
  teacherNotes?: TeacherNotes; parentNotes?: string; editorialNotes?: string; sources?: string[];
  lessonIdForQuiz?: string; completed?: boolean;
}

export async function getLessonForViewer(viewer: Viewer, slug: string, tr: TranslationId = "kjv"): Promise<LessonView | null> {
  const db = await getDb();
  const [row] = await db.select({ l: schema.lessons, c: schema.classLevels, t: schema.topics }).from(schema.lessons)
    .innerJoin(schema.classLevels, eq(schema.classLevels.id, schema.lessons.classLevelId))
    .leftJoin(schema.topics, eq(schema.topics.id, schema.lessons.topicId)).where(eq(schema.lessons.slug, slug));
  if (!row) return null;
  const { l, c, t } = row;
  const staff = !!viewer && isStaffRole(viewer.role);
  const live = l.status === "published" && (!l.publishAt || l.publishAt <= new Date());
  if (!live && !staff) return null; // unpublished content does not exist for learners
  const base: LessonView = {
    id: l.id, slug: l.slug, title: l.title, classSlug: c.slug, className: c.name, topicTitle: t?.title ?? null, refs: l.refs, memoryVerseRef: l.memoryVerseRef,
    status: l.status, contentLevel: l.contentLevel, reviewStatus: l.reviewStatus, origin: l.origin, isFree: l.isFree, access: "locked", summary: l.body.scriptureSummary,
  };
  if (l.contentLevel === "framework") return { ...base, access: "framework" };
  const allowed = staff || (await canUse(viewer, "lessons", l.isFree));
  if (!allowed) return base; // only title, passage references and the one-line summary
  const full: LessonView = { ...base, access: "full", body: l.body, passages: l.refs.flatMap((r) => getPassages(r, tr)), memoryVerse: l.memoryVerseRef ? (getPassages(l.memoryVerseRef, tr)[0] ?? null) : null, lessonIdForQuiz: l.id };
  if (viewer && isTeacherLike(viewer)) {
    // Teacher notes (including advanced notes) are never sent to students or parents.
    full.teacherNotes = l.teacherNotes;
    full.parentNotes = l.parentNotes;
    if (staff) { full.editorialNotes = l.editorialNotes; full.sources = l.sources; }
  } else if (viewer?.role === "parent") full.parentNotes = l.parentNotes;
  if (viewer) {
    const [p] = await db.select().from(schema.lessonProgress).where(and(eq(schema.lessonProgress.userId, viewer.id), eq(schema.lessonProgress.lessonId, l.id)));
    full.completed = p?.status === "completed";
  }
  return full;
}

/** Marks a lesson started/completed. Only an entitled learner (or free lesson) can record progress. */
export async function setLessonProgress(viewer: NonNullable<Viewer>, lessonId: string, status: "started" | "completed") {
  const db = await getDb();
  const [l] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId));
  if (!l || l.status !== "published") throw new Error("Lesson not found.");
  if (!(await canUse(viewer, "lessons", l.isFree))) throw new Error("This lesson needs an active plan.");
  await db.insert(schema.lessonProgress).values({ userId: viewer.id, lessonId, status, completedAt: status === "completed" ? new Date() : null })
    .onConflictDoUpdate({ target: [schema.lessonProgress.userId, schema.lessonProgress.lessonId], set: { status, completedAt: status === "completed" ? new Date() : null, updatedAt: new Date() } });
}

export async function progressSummary(userId: string, classSlug: string | null) {
  const db = await getDb();
  const [cls] = classSlug ? await db.select().from(schema.classLevels).where(eq(schema.classLevels.slug, classSlug)) : [];
  if (!cls) return { total: 0, done: 0, next: null as null | { slug: string; title: string } };
  const lessons = await db.select().from(schema.lessons).where(and(eq(schema.lessons.classLevelId, cls.id), eq(schema.lessons.status, "published"), eq(schema.lessons.contentLevel, "complete"))).orderBy(asc(schema.lessons.sort));
  const prog = await db.select().from(schema.lessonProgress).where(and(eq(schema.lessonProgress.userId, userId), eq(schema.lessonProgress.status, "completed")));
  const done = new Set(prog.map((p) => p.lessonId));
  const next = lessons.find((l) => !done.has(l.id));
  return { total: lessons.length, done: lessons.filter((l) => done.has(l.id)).length, next: next ? { slug: next.slug, title: next.title } : null };
}

// ───────── stories ─────────
export interface StoryView {
  id: string; slug: string; title: string; subtitle: string; testament: string; passageRef: string; classSlugs: string[]; genre: string; summary: string; coverArt: string | null;
  visibility: string; reviewStatus: string; access: "full" | "locked"; memoryVerseRef: string | null;
  scenes?: (typeof schema.stories.$inferSelect)["scenes"]; discussion?: string[]; detail?: Record<string, string | string[]>; passage?: Passage[]; memoryVerse?: Passage | null; sceneScripture?: (Passage | null)[];
}

export async function getStoryForViewer(viewer: Viewer, slug: string, tr: TranslationId = "kjv", opts: { advanced?: boolean } = {}): Promise<StoryView | null> {
  const db = await getDb();
  const [st] = await db.select().from(schema.stories).where(eq(schema.stories.slug, slug));
  if (!st) return null;
  const staff = !!viewer && isStaffRole(viewer.role);
  const isAuthor = !!viewer && st.authorId === viewer.id;
  if ((st.status !== "published" || st.isTemplate) && !staff && !isAuthor) return null;
  const base: StoryView = { id: st.id, slug: st.slug, title: st.title, subtitle: st.subtitle, testament: st.testament, passageRef: st.passageRef, classSlugs: st.classSlugs, genre: st.genre, summary: st.summary, coverArt: st.coverArt, visibility: st.visibility, reviewStatus: st.reviewStatus, access: "locked", memoryVerseRef: st.memoryVerseRef };
  const allowed = staff || isAuthor || st.visibility === "public" || (await canUse(viewer, "stories"));
  if (!allowed) return base;
  const adv = !!viewer && (isTeacherLike(viewer) || (viewer.role === "student" && opts.advanced));
  const detail = { ...st.detail };
  const ADVANCED_ONLY = ["prophetic", "apostolic", "literary", "words", "storyline", "crossRefs"];
  if (!adv) for (const k of ADVANCED_ONLY) delete detail[k];
  return { ...base, access: "full", scenes: st.scenes, discussion: st.discussion, detail, passage: getPassages(st.passageRef, tr), memoryVerse: st.memoryVerseRef ? (getPassages(st.memoryVerseRef, tr)[0] ?? null) : null, sceneScripture: st.scenes.map((s) => (s.ref ? (getPassages(s.ref, tr)[0] ?? null) : null)) };
}

export async function listStories(viewer: Viewer, opts: { testament?: string; q?: string; classSlug?: string } = {}) {
  const db = await getDb();
  const rows = await db.select().from(schema.stories).where(and(eq(schema.stories.status, "published"), eq(schema.stories.isTemplate, false))).orderBy(asc(schema.stories.createdAt));
  const signedIn = !!viewer;
  return rows
    .filter((s) => (signedIn ? true : s.visibility === "public"))
    .filter((s) => (opts.testament ? s.testament === opts.testament : true))
    .filter((s) => (opts.classSlug ? s.classSlugs.includes(opts.classSlug) : true))
    .filter((s) => (opts.q ? (s.title + " " + s.summary + " " + s.passageRef).toLowerCase().includes(opts.q.toLowerCase()) : true))
    .map((s) => ({ id: s.id, slug: s.slug, title: s.title, summary: s.summary, passageRef: s.passageRef, testament: s.testament, coverArt: s.coverArt, visibility: s.visibility, genre: s.genre }));
}

export async function unreviewedCounts() {
  const db = await getDb();
  const l = await db.select({ n: sql<number>`count(*)::int` }).from(schema.lessons).where(and(eq(schema.lessons.status, "published"), eq(schema.lessons.reviewStatus, "unreviewed")));
  const s = await db.select({ n: sql<number>`count(*)::int` }).from(schema.stories).where(and(eq(schema.stories.status, "published"), eq(schema.stories.reviewStatus, "unreviewed"), eq(schema.stories.isTemplate, false)));
  return { lessons: l[0].n, stories: s[0].n };
}

export async function lessonsByIds(ids: string[]) {
  if (!ids.length) return [];
  const db = await getDb();
  return db.select().from(schema.lessons).where(inArray(schema.lessons.id, ids));
}
