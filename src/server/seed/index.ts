import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import type { DB } from "../db";
import * as s from "../db/schema";
import { CLASSES, STAGE_TEMPLATES } from "@/content/curriculum";
import { PRIMARY_LESSONS } from "@/content/lessons-primary";
import { SECONDARY_LESSONS } from "@/content/lessons-secondary";
import { OT_STORIES } from "@/content/stories-ot";
import { NT_STORIES } from "@/content/stories-nt";
import { TEMPLATE_SCENES } from "@/content/story-templates";
import { CLASS_SLUGS, expandClasses, type StorySeed } from "@/content/story-types";
import { QUESTION_BANK, TF_FILL } from "@/content/question-bank";
import { BIBLE_TIMELINE } from "@/content/fcgbs-timeline";
import { FAQS, HOME_SECTIONS, PLAN_DRAFTS, POLICY_PAGES, TRAINING, WINGS } from "@/content/site";
import { EMAIL_DEFAULTS } from "@/content/email-defaults";
import { GEO_QUESTIONS } from "./geo";
import { parseRanges, rangeLabel, type Range } from "@/lib/bible";

/** Bump when built-in content changes in a way that existing databases should receive. Seeding only ever ADDS missing records. */
export const SEED_VERSION = 1;

const chunk = <T,>(a: T[], n = 200) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const slugify = (t: string) => t.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

export async function ensureSeed(db: DB) {
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, "seed.version"));
  if (row && Number(row.value) >= SEED_VERSION) return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(727001)`);
    const [again] = await tx.select().from(s.settings).where(eq(s.settings.key, "seed.version"));
    if (again && Number(again.value) >= SEED_VERSION) return;
    await seedAll(tx as unknown as DB);
    await tx.insert(s.settings).values({ key: "seed.version", value: SEED_VERSION }).onConflictDoUpdate({ target: s.settings.key, set: { value: SEED_VERSION } });
  });
}

function overlaps(a: Range, b: Range) {
  if (a.book !== b.book) return false;
  const aEnd = a.c2 * 1000 + (a.v2 ?? 999), aStart = a.c1 * 1000 + (a.v1 ?? 0);
  const bEnd = b.c2 * 1000 + (b.v2 ?? 999), bStart = b.c1 * 1000 + (b.v1 ?? 0);
  return aStart <= bEnd && bStart <= aEnd;
}

async function seedAll(db: DB) {
  // ───────── classes, topics, lessons ─────────
  const classRows = await db.insert(s.classLevels).values(CLASSES.map((c, i) => ({
    slug: c.slug, name: c.name, sort: i + 1, stage: c.stage, ageBand: c.ageBand, title: c.title, overview: c.overview, purpose: c.purpose, objectives: c.objectives, depth: c.depth,
    assessmentRubric: STAGE_TEMPLATES[c.stage].rubric, parentSupport: STAGE_TEMPLATES[c.stage].parentSupport, teacherPrep: STAGE_TEMPLATES[c.stage].teacherPrep,
  }))).returning();
  const classId = new Map(classRows.map((c) => [c.slug, c.id]));
  const authored = new Map([...PRIMARY_LESSONS, ...SECONDARY_LESSONS].map((l) => [`${l.cls}|${l.topic}`, l]));
  const usedAuthored = new Set<string>();
  const lessonRows: (typeof s.lessons.$inferInsert)[] = [];
  const topicRows: (typeof s.topics.$inferInsert)[] = [];
  for (const c of CLASSES) {
    const n = c.topics.length;
    c.topics.forEach(([title, ref], i) => {
      const term = Math.min(3, Math.floor((i * 3) / n) + 1);
      topicRows.push({ classLevelId: classId.get(c.slug)!, termNo: term, sort: i + 1, title, primaryRef: ref });
    });
  }
  const insertedTopics = [] as (typeof s.topics.$inferSelect)[];
  for (const part of chunk(topicRows)) insertedTopics.push(...(await db.insert(s.topics).values(part).returning()));
  const topicKey = new Map(insertedTopics.map((t) => [`${t.classLevelId}|${t.sort}`, t]));
  const slugSeen = new Set<string>();
  for (const c of CLASSES) {
    c.topics.forEach(([title, ref], i) => {
      const topic = topicKey.get(`${classId.get(c.slug)}|${i + 1}`)!;
      const a = authored.get(`${c.slug}|${title}`);
      if (a) usedAuthored.add(`${c.slug}|${title}`);
      let slug = `${c.slug}-${slugify(title)}`; let k = 2; while (slugSeen.has(slug)) slug = `${c.slug}-${slugify(title)}-${k++}`; slugSeen.add(slug);
      const refs = ref.split(/\s*;\s*/);
      lessonRows.push(a ? {
        topicId: topic.id, classLevelId: topic.classLevelId, slug, title, sort: i + 1, contentLevel: "complete", status: "published", reviewStatus: "unreviewed", origin: "ai_drafted", isFree: !!a.free,
        refs, memoryVerseRef: a.memory,
        body: { objectives: a.objectives, background: a.background, explanation: a.explanation, keyWords: a.keyWords?.map(([word, meaning]) => ({ word, meaning })), application: a.application, discussion: a.discussion, activity: a.activity, homework: a.homework, scriptureSummary: a.summary },
        teacherNotes: { preparation: a.teacher.preparation, notes: a.teacher.notes, advanced: a.teacher.advanced }, parentNotes: a.parent, sources: a.sources ?? [],
        editorialNotes: "Drafted for the ministry's theological and pedagogical review. Not yet reviewed.",
      } : {
        topicId: topic.id, classLevelId: topic.classLevelId, slug, title, sort: i + 1, contentLevel: "framework", status: "draft", reviewStatus: "unreviewed", origin: "authored", refs,
        body: { objectives: [] }, editorialNotes: "Framework entry: topic and Bible passage only. Lesson content still to be written and reviewed.",
      });
    });
  }
  for (const [key] of authored) if (!usedAuthored.has(key)) throw new Error(`Authored lesson has no matching topic: ${key}`);
  const insertedLessons = [] as (typeof s.lessons.$inferSelect)[];
  for (const part of chunk(lessonRows, 100)) insertedLessons.push(...(await db.insert(s.lessons).values(part).returning()));

  // ───────── lesson quiz questions, bank questions ─────────
  const qRows: (typeof s.questions.$inferInsert)[] = [];
  const IDS = ["a", "b", "c", "d", "e"];
  const sortOf = (slug: string) => CLASS_SLUGS.indexOf(slug) + 1;
  for (const c of CLASSES) {
    for (const [title] of c.topics) {
      const a = authored.get(`${c.slug}|${title}`);
      if (!a) continue;
      const lesson = insertedLessons.find((l) => l.classLevelId === classId.get(c.slug) && l.title === title)!;
      for (const [q, opts, correct, expl] of a.quiz) {
        qRows.push({ type: "mcq", text: q, options: opts.map((t, i) => ({ id: IDS[i], text: t, correct: i === correct })), explanation: expl, ref: a.memory === undefined ? null : lesson.refs[0], classLevelSlug: c.slug, classMin: sortOf(c.slug), classMax: sortOf(c.slug), topic: title, lessonId: lesson.id, difficulty: sortOf(c.slug) <= 6 ? 1 : 2, tags: ["lesson-quiz", c.slug], status: "published", source: "Fodan Bible Learning Centre (drafted for review)" });
      }
    }
  }
  const range = (cl: string) => { const e = expandClasses(cl); return { classMin: sortOf(e[0]), classMax: sortOf(e[e.length - 1]) }; };
  for (const [q, opts, correct, ref, cl, tag, diff] of QUESTION_BANK) {
    qRows.push({ type: "mcq", text: q, options: opts.split("|").map((t, i) => ({ id: IDS[i], text: t, correct: i === correct })), explanation: `See ${ref}.`, ref, ...range(cl), topic: tag, difficulty: diff ?? 2, tags: [tag.toLowerCase()], status: "published", source: "Fodan Bible Learning Centre" });
  }
  for (const [q, ans, ref, cl, tag, type] of TF_FILL) {
    if (type === "tf") qRows.push({ type: "tf", text: q, options: [{ id: "true", text: "True", correct: ans === "true" }, { id: "false", text: "False", correct: ans === "false" }], explanation: `See ${ref}.`, ref, ...range(cl), topic: tag, difficulty: 1, tags: [tag.toLowerCase()], status: "published" });
    else qRows.push({ type: "fill", text: q, acceptedAnswers: ans.split("|"), explanation: `See ${ref}.`, ref, ...range(cl), topic: tag, difficulty: 1, tags: [tag.toLowerCase()], status: "published" });
  }
  for (const [q, opts, correct, ref, cl, diff] of GEO_QUESTIONS) {
    qRows.push({ type: "mcq", text: q, options: opts.split("|").map((t, i) => ({ id: IDS[i], text: t, correct: i === correct })), explanation: `See ${ref}.`, ref, ...range(cl), topic: "Geography", difficulty: diff, tags: ["geography"], status: "published" });
  }
  for (const part of chunk(qRows, 100)) await db.insert(s.questions).values(part);

  // ───────── stories & templates ─────────
  const all: StorySeed[] = [...OT_STORIES, ...NT_STORIES];
  const storyRows: (typeof s.stories.$inferInsert)[] = [];
  const mk = (st: StorySeed, isTemplate: boolean): typeof s.stories.$inferInsert => {
    const scenes = TEMPLATE_SCENES[st.slug]
      ? TEMPLATE_SCENES[st.slug].map((sc) => ({ title: sc.title, text: sc.text, ref: sc.ref, art: sc.art }))
      : [{ title: "Setting the scene", text: st.d?.bg ?? st.summary, art: st.art }, { title: "The story", text: st.summary, ref: st.ref, art: st.art }, { title: "What this teaches", text: st.app, art: st.art }];
    const books = [...new Set(parseRanges(st.ref).map((r) => rangeLabel(r).replace(/\s[\d:-]+.*$/, "")))];
    const { bg, chars, places, themes, link, cross, prophetic, apostolic, literary, words } = st.d ?? {};
    const detail: Record<string, string> = {};
    for (const [k, v] of Object.entries({ background: bg, characters: chars, places, themes, storyline: link, crossRefs: cross, prophetic, apostolic, literary, words, application: st.app, activity: st.activity })) if (v) detail[k] = v;
    return {
      slug: isTemplate ? `template-${st.slug}` : st.slug, title: st.title, isTemplate, testament: st.testament, books, passageRef: st.ref, classSlugs: expandClasses(st.cl), genre: st.genre ?? "narrative",
      status: "published", reviewStatus: "unreviewed", visibility: st.free ? "public" : "members", summary: st.summary, scenes, memoryVerseRef: st.memory, discussion: st.discuss, detail, coverArt: st.art,
    };
  };
  for (const st of all) { storyRows.push(mk(st, false)); if (TEMPLATE_SCENES[st.slug]) storyRows.push(mk(st, true)); }
  const slugCheck = new Set<string>();
  for (const r of storyRows) { if (slugCheck.has(r.slug)) throw new Error(`Duplicate story slug ${r.slug}`); slugCheck.add(r.slug); }
  const insertedStories = [] as (typeof s.stories.$inferSelect)[];
  for (const part of chunk(storyRows, 50)) insertedStories.push(...(await db.insert(s.stories).values(part).returning()));

  // ───────── timeline (from FCGBS, relinked to this platform's lessons and stories) ─────────
  const lessonRanges = insertedLessons.filter((l) => l.status === "published").map((l) => ({ kind: "lesson", slug: l.slug, rs: l.refs.flatMap(parseRanges) }));
  const storyRanges = insertedStories.filter((x) => !x.isTemplate).map((x) => ({ kind: "story", slug: x.slug, rs: parseRanges(x.passageRef) }));
  const tl = BIBLE_TIMELINE.items.map((it, i) => {
    const rs = it.refs.flatMap(parseRanges);
    const related = [...lessonRanges, ...storyRanges].filter((c) => c.rs.some((a) => rs.some((b) => overlaps(a, b)))).slice(0, 6).map((c) => `${c.kind}:${c.slug}`);
    const uncertain = /unknown|not given|disputed|debated|approx|uncertain|c\.|about/i.test(it.date) || ["beginnings", "patriarchs", "exodus", "land"].includes(it.era);
    return {
      slug: it.id, era: it.era, sort: i + 1, title: it.title, ref: it.refs[0] ?? it.books, summary: it.summary, people: it.figures.split(/,\s*|;\s*|\sand\s/).filter(Boolean), places: [] as string[],
      dateLabel: it.date, dateBasis: uncertain ? "uncertain" : "proposed", confidence: uncertain ? "Dates are approximate or debated; the order of events comes from the biblical narrative." : "Dates are widely accepted by historians.",
      theology: it.theology, evidence: it.evidence, lessonSlugs: related, art: null as string | null,
    };
  });
  await db.insert(s.timelineEvents).values(tl);
  await db.insert(s.settings).values({ key: "timeline.meta", value: { intro: BIBLE_TIMELINE.intro, note: BIBLE_TIMELINE.note, eras: BIBLE_TIMELINE.eras } }).onConflictDoNothing();

  // ───────── ministry, site, plans, email, training ─────────
  await db.insert(s.ministryWings).values(WINGS.map((w, i) => ({ ...w, sort: i + 1, acceptsRegistration: !!w.acceptsRegistration, status: "published" })));
  const [home] = await db.insert(s.pages).values({ slug: "home", title: "Home", kind: "home", status: "published", seoTitle: "Fodan Bible Learning Centre | CROP", seoDescription: "A complete Bible learning centre for churches, Sunday Schools, parents and students, from Fodan Gospel Outreach and its children's wing, CROP." }).returning();
  await db.insert(s.pageSections).values(HOME_SECTIONS.map((sec, i) => ({ pageId: home.id, sort: i + 1, type: sec.type, audience: sec.audience ?? "all", draft: sec.content, published: sec.content, publishedHidden: false, publishedSort: i + 1 })));
  for (const p of POLICY_PAGES) {
    const [pg] = await db.insert(s.pages).values({ slug: p.slug, title: p.title, kind: "page", status: "published", showInNav: false }).returning();
    await db.insert(s.pageSections).values({ pageId: pg.id, sort: 1, type: "richtext", draft: { title: p.title, body: p.body }, published: { title: p.title, body: p.body }, publishedHidden: false, publishedSort: 1 });
  }
  await db.insert(s.faqs).values(FAQS.map((f, i) => ({ ...f, sort: i + 1 })));
  await db.insert(s.plans).values(PLAN_DRAFTS.map((p) => ({ ...p, priceMinor: 0, currency: "NGN", features: ["lessons", "quizzes", "exams", "stories", "games", "timeline", "downloads", "explanations", "reports", ...(p.audience === "teacher" ? ["teacher_tools"] : [])], active: true, isDraft: true })));
  await db.insert(s.emailTemplates).values(EMAIL_DEFAULTS.map((e) => ({ key: e.key, name: e.name, subject: e.subject, body: e.body })));
  await db.insert(s.trainingModules).values(TRAINING.map((t, i) => ({ ...t, sort: i + 1 })));

  // ───────── logos (built from public/brand by `npm run brand:assets`) ─────────
  await seedLogos(db);
}

async function seedLogos(db: DB) {
  const dir = path.join(process.cwd(), "public", "brand");
  const defs: { file: string; name: string; kind: string; variant: string; placements?: string[]; primary?: boolean; defaultCrop?: boolean; collection?: string; ministry?: string }[] = [
    { file: "crop-horizontal.svg", name: "CROP horizontal (light background)", kind: "horizontal", variant: "light", primary: true, defaultCrop: true, placements: ["homepage", "login", "register", "dashboard", "certificate", "exam", "printable", "report", "email"] },
    { file: "crop-horizontal-dark.svg", name: "CROP horizontal (dark background)", kind: "horizontal", variant: "dark", placements: ["homepage", "login", "register"] },
    { file: "crop-horizontal-compact.svg", name: "CROP horizontal compact (no attribution line)", kind: "horizontal-compact", variant: "light", placements: ["dashboard", "exam"] },
    { file: "crop-horizontal-mono.svg", name: "CROP horizontal (monochrome print)", kind: "horizontal", variant: "mono", placements: ["printable", "report"] },
    { file: "crop-stacked.svg", name: "CROP stacked (light background)", kind: "stacked", variant: "light", placements: ["certificate"] },
    { file: "crop-stacked-dark.svg", name: "CROP stacked (dark background)", kind: "stacked", variant: "dark" },
    { file: "crop-stacked-mono.svg", name: "CROP stacked (monochrome print)", kind: "stacked", variant: "mono" },
    { file: "crop-emblem.svg", name: "CROP emblem (transparent background)", kind: "emblem", variant: "transparent" },
    { file: "crop-emblem-dark.svg", name: "CROP emblem (for dark backgrounds)", kind: "emblem", variant: "dark" },
    { file: "crop-emblem-mono.svg", name: "CROP emblem (monochrome print)", kind: "emblem", variant: "mono" },
    { file: "crop-compact-square.svg", name: "CROP compact square (light)", kind: "compact", variant: "light" },
    { file: "crop-compact-square-dark.svg", name: "CROP compact square (dark)", kind: "compact", variant: "dark" },
    { file: "favicon.svg", name: "Favicon (SVG)", kind: "favicon", variant: "dark", placements: ["favicon-svg"] },
    { file: "favicon-32.png", name: "Favicon 32x32 (PNG)", kind: "favicon", variant: "dark", placements: ["favicon-32"] },
    { file: "favicon.ico", name: "Favicon (ICO 16/32/48)", kind: "favicon-ico", variant: "dark", placements: ["favicon-ico"] },
    { file: "apple-touch-icon.png", name: "Apple touch icon 180x180", kind: "app-icon", variant: "dark", placements: ["apple-180"] },
    { file: "icon-192.png", name: "App icon 192x192 (PWA)", kind: "app-icon", variant: "dark", placements: ["pwa-192"] },
    { file: "icon-512.png", name: "App icon 512x512 (PWA)", kind: "app-icon", variant: "dark", placements: ["pwa-512"] },
    { file: "maskable-512.png", name: "Maskable app icon 512x512", kind: "app-icon-maskable", variant: "dark", placements: ["pwa-maskable"] },
    { file: "fgo-logo.webp", name: "Fodan Gospel Outreach (parent ministry)", kind: "parent", variant: "light", collection: "Fodan Gospel Outreach", ministry: "fodan-gospel-outreach", placements: ["footer"] },
  ];
  const rows: (typeof s.logos.$inferInsert)[] = [];
  for (const d of defs) {
    const f = path.join(dir, d.file);
    if (!fs.existsSync(f)) continue;
    const svg = d.file.endsWith(".svg") ? fs.readFileSync(f, "utf8") : null;
    const mime = d.file.endsWith(".svg") ? "image/svg+xml" : d.file.endsWith(".png") ? "image/png" : d.file.endsWith(".webp") ? "image/webp" : "image/x-icon";
    rows.push({ name: d.name, collection: d.collection ?? "CROP", ministrySlug: d.ministry ?? "crop", kind: d.kind, variant: d.variant, mime, svg, builtinPath: `/brand/${d.file}`, placements: d.placements ?? [], isPrimary: !!d.primary, isDefaultCrop: !!d.defaultCrop, active: true });
  }
  if (!rows.length) return;
  const ins = await db.insert(s.logos).values(rows).returning();
  const byFile = (file: string) => ins.find((l) => l.builtinPath === `/brand/${file}`)?.id;
  const light = byFile("crop-horizontal.svg"), dark = byFile("crop-horizontal-dark.svg"), compact = byFile("crop-horizontal-compact.svg"), mono = byFile("crop-horizontal-mono.svg"), stacked = byFile("crop-stacked.svg");
  const placements: Record<string, { light?: string; dark?: string }> = {
    homepage: { light, dark }, login: { light, dark }, register: { light, dark }, dashboard: { light: compact, dark }, certificate: { light: stacked }, exam: { light: compact, dark },
    printable: { light: mono }, report: { light: mono }, email: { light },
  };
  await db.insert(s.settings).values({ key: "logoPlacements", value: placements }).onConflictDoUpdate({ target: s.settings.key, set: { value: placements } });
}
