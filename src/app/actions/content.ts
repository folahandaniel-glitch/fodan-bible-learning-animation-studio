"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { actorOf, requireAdmin, requireUser } from "@/server/guards";
import { audit } from "@/server/audit";
import { addSection, createPage, duplicateSection, moveSection, publishPage, removeSection, restorePageVersion, updatePageMeta, updateSection } from "@/server/services/site";
import * as studio from "@/server/services/studio";
import { setQuestionStatus } from "@/server/services/question-admin";
import { getSetting } from "@/server/settings";
import { can } from "@/lib/permissions";
import { parseRanges } from "@/lib/bible";
import type { ActionResult } from "@/components/forms";
import type { ContentStatus, LessonBody, ReviewStatus, Scene } from "@/server/db/schema";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const lines = (f: FormData, k: string) => String(f.get(k) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
type R = ActionResult;
const run = async (fn: () => Promise<R | void>, ok = "Saved."): Promise<R> => {
  try { return (await fn()) ?? { ok: true, message: ok }; } catch (e) { if (e && typeof e === "object" && "digest" in e) throw e; return { error: (e as Error).message }; }
};

// ───────── curriculum ─────────
export async function saveClassAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("curriculum.write");
  return run(async () => {
    const db = await getDb();
    await db.update(schema.classLevels).set({ name: str(f, "name"), title: str(f, "title"), overview: str(f, "overview"), purpose: str(f, "purpose"), ageBand: str(f, "ageBand"), objectives: lines(f, "objectives"), parentSupport: str(f, "parentSupport"), teacherPrep: str(f, "teacherPrep") }).where(eq(schema.classLevels.id, str(f, "id")));
    await audit(await actorOf(u), "curriculum.class_edit", { type: "class", id: str(f, "id") });
    revalidatePath("/admin/curriculum"); revalidatePath("/classes", "layout");
  });
}
export async function addTopicAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("curriculum.write");
  return run(async () => {
    const db = await getDb(); const classId = str(f, "classId"); const title = str(f, "title");
    if (title.length < 3) throw new Error("Enter a topic title.");
    const ref = str(f, "ref"); if (ref && !parseRanges(ref).length) throw new Error("That Bible reference is not recognised.");
    const [max] = await db.select({ m: sql<number>`coalesce(max(${schema.topics.sort}),0)::int` }).from(schema.topics).where(eq(schema.topics.classLevelId, classId));
    const [t] = await db.insert(schema.topics).values({ classLevelId: classId, termNo: Math.max(1, Math.min(6, Number(str(f, "termNo")) || 1)), sort: max.m + 1, title, primaryRef: ref || null }).returning();
    const slugBase = (str(f, "classSlug") + "-" + title.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 80);
    let slug = slugBase, n = 2; while ((await db.select({ id: schema.lessons.id }).from(schema.lessons).where(eq(schema.lessons.slug, slug))).length) slug = `${slugBase}-${n++}`;
    await db.insert(schema.lessons).values({ topicId: t.id, classLevelId: classId, slug, title, sort: t.sort, contentLevel: "framework", status: "draft", refs: ref ? [ref] : [], editorialNotes: "Framework entry created by an administrator." });
    await audit(await actorOf(u), "curriculum.topic_add", { type: "topic", id: t.id }, { title });
    revalidatePath(`/admin/curriculum/${str(f, "classSlug")}`);
  }, "Topic and lesson record created.");
}
export async function topicOrderAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("curriculum.write");
  return run(async () => {
    const db = await getDb(); const id = str(f, "id"); const dir = str(f, "dir");
    const [t] = await db.select().from(schema.topics).where(eq(schema.topics.id, id));
    const all = await db.select().from(schema.topics).where(eq(schema.topics.classLevelId, t.classLevelId)).orderBy(asc(schema.topics.sort), asc(schema.topics.id));
    const i = all.findIndex((x) => x.id === id); const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return;
    const arr = [...all]; [arr[i], arr[j]] = [arr[j], arr[i]];
    for (let k = 0; k < arr.length; k++) await db.update(schema.topics).set({ sort: k + 1 }).where(eq(schema.topics.id, arr[k].id));
    await audit(await actorOf(u), "curriculum.topic_move", { type: "topic", id });
    revalidatePath("/admin/curriculum", "layout");
  });
}
export async function archiveTopicAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("curriculum.write");
  return run(async () => {
    const db = await getDb(); const id = str(f, "id"); const restore = str(f, "restore") === "1";
    await db.update(schema.topics).set({ archived: !restore }).where(eq(schema.topics.id, id));
    await db.update(schema.lessons).set({ status: restore ? "draft" : "archived" }).where(eq(schema.lessons.topicId, id)); // learner records are kept
    await audit(await actorOf(u), restore ? "curriculum.topic_restore" : "curriculum.topic_archive", { type: "topic", id });
    revalidatePath("/admin/curriculum", "layout");
  });
}

function bodyFromForm(f: FormData): LessonBody {
  return {
    scriptureSummary: str(f, "summary"), objectives: lines(f, "objectives"), background: String(f.get("background") ?? ""), explanation: String(f.get("explanation") ?? ""),
    keyWords: lines(f, "keyWords").map((l) => { const [word, ...rest] = l.split("|"); return { word: word.trim(), meaning: rest.join("|").trim() }; }).filter((k) => k.word),
    application: String(f.get("application") ?? ""), discussion: lines(f, "discussion"), activity: str(f, "activity"), homework: str(f, "homework"), practical: str(f, "practical"), vocabulary: lines(f, "vocabulary"),
  };
}

export async function saveLessonAction(id: string, _: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("curriculum.write");
  return run(async () => {
    const db = await getDb();
    const [l] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id));
    if (!l) throw new Error("Lesson not found.");
    const refs = lines(f, "refs"); for (const r of refs) if (!parseRanges(r).length) throw new Error(`"${r}" is not a recognised Bible reference.`);
    const mv = str(f, "memoryVerseRef"); if (mv && !parseRanges(mv).length) throw new Error("The memory verse reference is not recognised.");
    await db.insert(schema.lessonVersions).values({ lessonId: id, version: l.version, snapshot: l, editedBy: u.id });
    const body = bodyFromForm(f);
    const hasContent = !!(body.explanation?.trim() || body.background?.trim());
    await db.update(schema.lessons).set({
      title: str(f, "title") || l.title, refs, memoryVerseRef: mv || null, body, teacherNotes: { preparation: str(f, "prep"), notes: str(f, "tnotes"), advanced: str(f, "advanced"), rubric: str(f, "rubric") }, parentNotes: str(f, "parentNotes"),
      contentLevel: hasContent ? "complete" : "framework", isFree: f.get("isFree") === "on", editorialNotes: str(f, "editorialNotes"), sources: lines(f, "sources"),
      publishAt: str(f, "publishAt") ? new Date(str(f, "publishAt")) : null, version: l.version + 1, updatedAt: new Date(), authorId: l.authorId ?? u.id,
      origin: l.origin === "ai_drafted" ? "ai_drafted" : l.origin, // editing does not launder the origin: only a review does
    }).where(eq(schema.lessons.id, id));
    await audit(await actorOf(u), "curriculum.lesson_edit", { type: "lesson", id }, { version: l.version + 1 });
    revalidatePath(`/admin/lessons/${id}`); revalidatePath("/learn", "layout");
  });
}

const FLOW: Record<ContentStatus, ContentStatus[]> = { draft: ["review", "archived"], review: ["draft", "approved", "archived"], approved: ["published", "review", "archived"], published: ["approved", "archived"], archived: ["draft"] };
export async function lessonStatusAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("curriculum.write");
  return run(async () => {
    const db = await getDb(); const id = str(f, "id"); const to = str(f, "to") as ContentStatus;
    const [l] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id));
    if (!l) throw new Error("Lesson not found.");
    if (!FLOW[l.status].includes(to)) throw new Error(`A lesson cannot move from ${l.status} to ${to}. Follow the order draft, review, approved, published.`);
    if ((to === "approved" || to === "published") && !can(u.role, "content.review")) throw new Error("Only a reviewer (Super Admin or Curriculum Administrator) can approve or publish.");
    const settings = await getSetting("features");
    if (to === "published" && l.contentLevel !== "complete") throw new Error("This lesson is only a framework entry. Write the lesson content before publishing.");
    if (to === "published" && settings.requireReviewBeforePublish && l.reviewStatus !== "approved") throw new Error("The ministry requires theological review approval before publishing. Mark the review as approved first.");
    const set: Partial<typeof schema.lessons.$inferInsert> = { status: to, updatedAt: new Date() };
    if (to === "approved" || to === "published") { set.reviewerId = u.id; }
    await db.update(schema.lessons).set(set).where(eq(schema.lessons.id, id));
    await audit(await actorOf(u), `curriculum.lesson_${to}`, { type: "lesson", id }, { title: l.title });
    revalidatePath("/admin/review"); revalidatePath("/admin/curriculum", "layout"); revalidatePath("/classes", "layout"); revalidatePath("/learn", "layout");
    return { ok: true, message: `Lesson is now ${to}.` };
  });
}
export async function lessonReviewAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("content.review");
  return run(async () => {
    const db = await getDb(); const id = str(f, "id"); const to = str(f, "to") as ReviewStatus;
    if (!["unreviewed", "in_review", "approved", "changes_requested"].includes(to)) throw new Error("Invalid review state.");
    await db.update(schema.lessons).set({ reviewStatus: to, reviewerId: u.id, editorialNotes: str(f, "notes") ? str(f, "notes") : undefined, updatedAt: new Date() }).where(eq(schema.lessons.id, id));
    await audit(await actorOf(u), `curriculum.review_${to}`, { type: "lesson", id });
    revalidatePath("/admin/review"); revalidatePath(`/admin/lessons/${id}`);
    return { ok: true, message: "Review status updated." };
  });
}
export async function duplicateLessonAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("curriculum.write");
  return run(async () => {
    const db = await getDb(); const [l] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, str(f, "id")));
    if (!l) throw new Error("Lesson not found.");
    const target = str(f, "classId") || l.classLevelId;
    let slug = `${l.slug}-copy`, n = 2; while ((await db.select({ id: schema.lessons.id }).from(schema.lessons).where(eq(schema.lessons.slug, slug))).length) slug = `${l.slug}-copy-${n++}`;
    const [c] = await db.insert(schema.lessons).values({ ...l, id: undefined, slug, title: `${l.title} (copy)`, classLevelId: target, topicId: null, status: "draft", reviewStatus: "unreviewed", version: 1, createdAt: undefined, updatedAt: undefined, authorId: u.id, reviewerId: null }).returning();
    await audit(await actorOf(u), "curriculum.lesson_duplicate", { type: "lesson", id: c.id }, { from: l.id });
    revalidatePath("/admin/curriculum", "layout");
    redirect(`/admin/lessons/${c.id}`);
  });
}

// ───────── stories & questions ─────────
export async function storyStatusAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("stories.write");
  return run(async () => {
    const to = str(f, "to") as ContentStatus; const id = str(f, "id");
    await studio.setStatus(await actorOf(u), { id: u.id, role: u.role, orgId: u.orgId }, id, to);
    revalidatePath("/admin/stories"); revalidatePath("/stories", "layout");
    return { ok: true, message: `Story is now ${to}.` };
  });
}
export async function storyVisibilityAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("stories.write");
  return run(async () => {
    const db = await getDb(); const vis = str(f, "visibility") === "public" ? "public" : "members";
    await db.update(schema.stories).set({ visibility: vis }).where(eq(schema.stories.id, str(f, "id")));
    await audit(await actorOf(u), "story.visibility", { type: "story", id: str(f, "id") }, { vis });
    revalidatePath("/admin/stories"); revalidatePath("/stories", "layout"); revalidatePath("/");
    return { ok: true, message: vis === "public" ? "Now public and free." : "Now members only." };
  });
}
export async function storyReviewAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("content.review");
  return run(async () => { const db = await getDb(); await db.update(schema.stories).set({ reviewStatus: str(f, "to") as ReviewStatus }).where(eq(schema.stories.id, str(f, "id"))); await audit(await actorOf(u), "story.review", { type: "story", id: str(f, "id") }, { to: str(f, "to") }); revalidatePath("/admin/review"); revalidatePath("/admin/stories"); });
}
export async function questionStatusAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("questions.write");
  return run(async () => { await setQuestionStatus(await actorOf(u), { id: u.id, role: u.role, orgId: u.orgId }, str(f, "id"), str(f, "to") as "draft" | "review" | "published" | "archived"); revalidatePath("/admin/questions"); });
}
export async function saveQuestionAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("questions.write");
  return run(async () => {
    const db = await getDb(); const text = str(f, "text"); if (text.length < 5) throw new Error("Enter the question.");
    const type = str(f, "type");
    const opts = lines(f, "options").slice(0, 8); const correct = lines(f, "correct").map((x) => x.toLowerCase());
    const IDS = ["a", "b", "c", "d", "e", "f", "g", "h"];
    let options: { id: string; text: string; correct?: boolean }[] = [];
    if (type === "mcq" || type === "multi" || type === "tf") {
      options = type === "tf" ? [{ id: "true", text: "True", correct: correct[0] === "true" }, { id: "false", text: "False", correct: correct[0] === "false" }] : opts.map((o, i) => ({ id: IDS[i], text: o, correct: correct.includes(IDS[i]) || correct.includes(o.toLowerCase()) }));
      if (options.filter((o) => o.correct).length < 1) throw new Error("Mark at least one correct answer (type its letter, for example b).");
      if (type !== "multi" && options.filter((o) => o.correct).length > 1) throw new Error("Only one answer can be correct for this question type.");
    }
    const cl = str(f, "classLevelSlug") || null; const idx = cl ? (await db.select({ s: schema.classLevels.sort }).from(schema.classLevels).where(eq(schema.classLevels.slug, cl)))[0]?.s ?? null : null;
    const ref = str(f, "ref"); if (ref && !parseRanges(ref).length) throw new Error("That Bible reference is not recognised.");
    await db.insert(schema.questions).values({ type, text, options, acceptedAnswers: (type === "fill" || type === "short") ? lines(f, "accepted") : [], rubric: str(f, "rubric") || null, explanation: str(f, "explanation"), ref: ref || null, classLevelSlug: cl, classMin: idx, classMax: idx, topic: str(f, "topic") || null, difficulty: Math.max(1, Math.min(3, Number(str(f, "difficulty")) || 2)), tags: str(f, "tags").split(",").map((t) => t.trim()).filter(Boolean), marks: Math.max(1, Number(str(f, "marks")) || 1), status: str(f, "status") === "published" ? "published" : "draft", authorId: u.id, source: str(f, "source") || null, licence: str(f, "licence") || null });
    await audit(await actorOf(u), "question.create", { type: "question" }); revalidatePath("/admin/questions");
  }, "Question saved.");
}

// ───────── homepage and page builder ─────────
export async function createPageAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("site.edit");
  return run(async () => { const p = await createPage(await actorOf(u), { slug: str(f, "slug"), title: str(f, "title") }); revalidatePath("/admin/site"); redirect(`/admin/site/${p.id}`); });
}
export async function pageMetaAction(id: string, _: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("site.edit");
  return run(async () => { await updatePageMeta(await actorOf(u), id, { title: str(f, "title"), seoTitle: str(f, "seoTitle"), seoDescription: str(f, "seoDescription"), showInNav: f.get("showInNav") === "on", slug: str(f, "slug") || undefined }); revalidatePath("/admin/site", "layout"); });
}
export async function addSectionAction(pageId: string, _: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("site.edit");
  return run(async () => {
    const type = str(f, "type");
    const defaults: Record<string, Record<string, unknown>> = { richtext: { title: "New section", body: "Write here. You can use **bold**, *italic*, lists and [links](/contact)." }, cta: { title: "Call to action", text: "A short invitation.", button: "Learn more", href: "/contact" }, image: { title: "", assetId: "", alt: "", caption: "" }, video: { title: "Video", url: "", transcript: "" }, cards: { title: "Cards", items: [{ title: "First", text: "Describe it", href: "" }] }, hero: { heading: "Heading", subheading: "", kicker: "", primaryCta: { label: "Start", href: "/" }, art: "dawn:hills:sun" }, about: { title: "About", body: ["Paragraph"], pillars: [], note: "" } };
    await addSection(await actorOf(u), pageId, type, defaults[type] ?? { title: "New section", intro: "" });
    revalidatePath(`/admin/site/${pageId}`);
  }, "Section added (as a draft; publish to show it).");
}
export async function saveSectionAction(sectionId: string, pageId: string, _: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("site.edit");
  return run(async () => {
    let content: Record<string, unknown>;
    try { content = JSON.parse(String(f.get("content") ?? "{}")); } catch { throw new Error("The content could not be read."); }
    if (typeof content !== "object" || Array.isArray(content) || content === null) throw new Error("Invalid content.");
    // Content is data, never code: reject anything that looks like markup or script in text values.
    const bad = JSON.stringify(content).match(/<\s*(script|iframe|object|embed|style|link|meta)|javascript:|on\w+\s*=/i);
    if (bad) throw new Error("Scripts and raw HTML are not allowed in page content. Use plain text, Markdown or the video and image sections.");
    await updateSection(await actorOf(u), sectionId, { content, audience: str(f, "audience") || undefined });
    revalidatePath(`/admin/site/${pageId}`);
    return { ok: true, message: "Draft saved. Publish the page to make it live." };
  });
}
export async function sectionOpAction(pageId: string, _: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("site.edit");
  return run(async () => {
    const id = str(f, "id"); const op = str(f, "op"); const actor = await actorOf(u);
    if (op === "up" || op === "down") await moveSection(actor, id, op);
    else if (op === "dup") await duplicateSection(actor, id);
    else if (op === "del") await removeSection(actor, id);
    else if (op === "restore") await removeSection(actor, id, true);
    else if (op === "hide" || op === "show") await updateSection(actor, id, { hidden: op === "hide" });
    revalidatePath(`/admin/site/${pageId}`);
  });
}
export async function publishPageAction(pageId: string, _: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("site.edit");
  return run(async () => {
    const at = str(f, "publishAt");
    await publishPage(await actorOf(u), pageId, { publishAt: at ? new Date(at) : null });
    revalidatePath("/", "layout");
    return { ok: true, message: at ? "Scheduled." : "Published. Visitors now see these changes." };
  });
}
export async function restoreVersionAction(pageId: string, _: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("site.edit");
  return run(async () => { await restorePageVersion(await actorOf(u), pageId, str(f, "version")); revalidatePath(`/admin/site/${pageId}`); return { ok: true, message: "Restored as a draft. Publish to make it live." }; });
}

// ───────── generic simple records (wings, FAQs, events, testimonies, timeline, plans, training, enquiries) ─────────
void requireUser; void and;
