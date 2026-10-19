import "server-only";
import mammoth from "mammoth";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, type Actor } from "../audit";
import { parseRange } from "@/lib/bible";
import { can } from "@/lib/permissions";
import { saveAsset, checkDocx, LIMITS } from "./media";
import type { ContentStatus, Role, Scene } from "../db/schema";

export interface StudioUser { id: string; role: Role; orgId: string | null }
const slugify = (t: string) => t.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "story";
export const canAuthor = (u: StudioUser) => u.role === "teacher" || can(u.role, "stories.write");

async function uniqueSlug(base: string) {
  const db = await getDb();
  let slug = base, n = 2;
  while ((await db.select({ id: schema.stories.id }).from(schema.stories).where(eq(schema.stories.slug, slug))).length) slug = `${base}-${n++}`;
  return slug;
}

export async function listTemplates() {
  const db = await getDb();
  return db.select().from(schema.stories).where(eq(schema.stories.isTemplate, true)).orderBy(schema.stories.title);
}

/** Opens a fully populated working copy: scenes, references, memory verse, questions and notes are all copied. Never a blank form. */
export async function createFromTemplate(actor: Actor, user: StudioUser, templateSlug: string) {
  if (!canAuthor(user)) throw new Error("You are not allowed to author stories.");
  const db = await getDb();
  const [t] = await db.select().from(schema.stories).where(and(eq(schema.stories.slug, templateSlug), eq(schema.stories.isTemplate, true)));
  if (!t) throw new Error("Template not found.");
  const slug = await uniqueSlug(slugify(t.title.replace(/^template:\s*/i, "") + "-" + user.id.slice(0, 4)));
  const [row] = await db.insert(schema.stories).values({
    slug, title: t.title, subtitle: t.subtitle, isTemplate: false, templateOfId: t.id, testament: t.testament, books: t.books, passageRef: t.passageRef, classSlugs: t.classSlugs, genre: t.genre,
    status: "draft", reviewStatus: "unreviewed", visibility: "members", summary: t.summary, scenes: t.scenes, memoryVerseRef: t.memoryVerseRef, discussion: t.discussion, detail: t.detail,
    authorId: user.id, orgId: user.orgId, coverArt: t.coverArt,
  }).returning();
  await audit(actor, "story.create_from_template", { type: "story", id: row.id }, { template: templateSlug });
  return row;
}

export async function createBlank(actor: Actor, user: StudioUser, title: string, passageRef: string) {
  if (!canAuthor(user)) throw new Error("You are not allowed to author stories.");
  if (!parseRange(passageRef)) throw new Error("Enter a valid Bible reference, for example John 3:16-21.");
  const db = await getDb();
  const [row] = await db.insert(schema.stories).values({ slug: await uniqueSlug(slugify(title)), title, passageRef, status: "draft", authorId: user.id, orgId: user.orgId, scenes: [{ title: "Scene 1", text: "" }], coverArt: "day:hills:sun" }).returning();
  await audit(actor, "story.create", { type: "story", id: row.id });
  return row;
}

export async function loadForEdit(user: StudioUser, id: string) {
  const db = await getDb();
  const [s] = await db.select().from(schema.stories).where(eq(schema.stories.id, id));
  if (!s) return null;
  if (!(can(user.role, "stories.write") || s.authorId === user.id)) return null;
  return s;
}

export interface StoryPatch { title?: string; subtitle?: string; summary?: string; passageRef?: string; scenes?: Scene[]; memoryVerseRef?: string | null; discussion?: string[]; classSlugs?: string[]; visibility?: string; detail?: Record<string, string | string[]> }

function cleanScenes(scenes: Scene[]): Scene[] {
  return scenes.slice(0, 60).map((s) => ({
    title: String(s.title ?? "").slice(0, 160), text: String(s.text ?? "").slice(0, 8000), narration: s.narration ? String(s.narration).slice(0, 8000) : undefined,
    ref: s.ref && parseRange(s.ref) ? s.ref : undefined, art: s.art ? String(s.art).slice(0, 80) : undefined, assetId: s.assetId && /^[0-9a-f-]{36}$/.test(s.assetId) ? s.assetId : undefined,
    alt: s.alt ? String(s.alt).slice(0, 300) : undefined, caption: s.caption ? String(s.caption).slice(0, 300) : undefined, kind: s.kind,
  }));
}

/** Autosave: updates the working draft without creating a new version. */
export async function autosave(user: StudioUser, id: string, patch: StoryPatch) {
  const s = await loadForEdit(user, id);
  if (!s) throw new Error("Story not found.");
  if (s.status === "published" && !can(user.role, "stories.write")) throw new Error("Published stories can only be edited by editors.");
  const set: Partial<typeof schema.stories.$inferInsert> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title.slice(0, 200);
  if (patch.subtitle !== undefined) set.subtitle = patch.subtitle.slice(0, 300);
  if (patch.summary !== undefined) set.summary = patch.summary.slice(0, 4000);
  if (patch.passageRef !== undefined && parseRange(patch.passageRef)) set.passageRef = patch.passageRef;
  if (patch.scenes) set.scenes = cleanScenes(patch.scenes);
  if (patch.memoryVerseRef !== undefined) set.memoryVerseRef = patch.memoryVerseRef && parseRange(patch.memoryVerseRef) ? patch.memoryVerseRef : null;
  if (patch.discussion) set.discussion = patch.discussion.map((x) => String(x).slice(0, 400)).slice(0, 20);
  if (patch.classSlugs) set.classSlugs = patch.classSlugs;
  if (patch.visibility && can(user.role, "stories.write")) set.visibility = patch.visibility === "public" ? "public" : "members";
  if (patch.detail) set.detail = patch.detail;
  const db = await getDb();
  await db.update(schema.stories).set(set).where(eq(schema.stories.id, id));
}

export async function saveVersion(actor: Actor, user: StudioUser, id: string, note?: string) {
  const s = await loadForEdit(user, id);
  if (!s) throw new Error("Story not found.");
  const db = await getDb();
  const v = s.version + 1;
  await db.insert(schema.storyVersions).values({ storyId: id, version: s.version, snapshot: { ...s, note }, editedBy: user.id });
  await db.update(schema.stories).set({ version: v }).where(eq(schema.stories.id, id));
  await audit(actor, "story.version", { type: "story", id }, { version: v });
}

export async function restoreVersion(actor: Actor, user: StudioUser, storyId: string, versionId: string) {
  const s = await loadForEdit(user, storyId);
  if (!s) throw new Error("Story not found.");
  const db = await getDb();
  const [v] = await db.select().from(schema.storyVersions).where(and(eq(schema.storyVersions.id, versionId), eq(schema.storyVersions.storyId, storyId)));
  if (!v) throw new Error("Version not found.");
  await saveVersion(actor, user, storyId, "Before restore");
  const snap = v.snapshot as typeof s;
  await db.update(schema.stories).set({ title: snap.title, subtitle: snap.subtitle, summary: snap.summary, scenes: snap.scenes, discussion: snap.discussion, memoryVerseRef: snap.memoryVerseRef, passageRef: snap.passageRef, detail: snap.detail, updatedAt: new Date() }).where(eq(schema.stories.id, storyId));
  await audit(actor, "story.restore_version", { type: "story", id: storyId }, { versionId });
}

export async function versionsOf(user: StudioUser, id: string) {
  const s = await loadForEdit(user, id);
  if (!s) return [];
  const db = await getDb();
  return db.select({ id: schema.storyVersions.id, version: schema.storyVersions.version, createdAt: schema.storyVersions.createdAt }).from(schema.storyVersions).where(eq(schema.storyVersions.storyId, id)).orderBy(desc(schema.storyVersions.createdAt));
}

/** Workflow: draft → review (author) → approved/published (editors with review permission only). */
export async function setStatus(actor: Actor, user: StudioUser, id: string, to: ContentStatus) {
  const s = await loadForEdit(user, id);
  if (!s) throw new Error("Story not found.");
  const reviewer = can(user.role, "content.review");
  if (to === "review" && !(s.authorId === user.id || reviewer || can(user.role, "stories.write"))) throw new Error("Not allowed.");
  if ((to === "approved" || to === "published") && !reviewer) throw new Error("Only a reviewer can approve or publish content.");
  if (to === "archived" && !can(user.role, "stories.write")) throw new Error("Not allowed.");
  const db = await getDb();
  await db.update(schema.stories).set({ status: to, reviewStatus: to === "approved" || to === "published" ? "approved" : to === "review" ? "in_review" : s.reviewStatus, updatedAt: new Date() }).where(eq(schema.stories.id, id));
  await audit(actor, `story.${to}`, { type: "story", id }, { title: s.title });
}

// ───────── Word (.docx) import: preview first, never overwrite ─────────
export interface ImportPreview {
  title: string; scenes: Scene[]; warnings: string[];
  stats: { headings: number; paragraphs: number; lists: number; tables: number; images: number; refs: number };
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
const strip = (h: string) => decode(h.replace(/<br\s*\/?>/g, "\n").replace(/<\/?(strong|b|em|i|u|a|span|sup|sub)[^>]*>/g, "").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();

const REF_RE = /\b((?:[1-3]\s?)?[A-Z][a-z]+(?:\s+of\s+[A-Z][a-z]+)?\.?\s+\d{1,3}(?::\d{1,3}(?:\s?[-–]\s?(?:\d{1,3}:)?\d{1,3})?)?)/g;
export function findRefs(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(REF_RE)) { const r = m[1].replace(/\s+/g, " "); if (parseRange(r) && !out.includes(r)) out.push(r); }
  return out;
}

export async function previewDocx(actor: Actor, user: StudioUser, bytes: Buffer, filename: string): Promise<{ ok: true; preview: ImportPreview } | { ok: false; error: string }> {
  if (!canAuthor(user)) return { ok: false, error: "You are not allowed to import documents." };
  if (bytes.length > LIMITS.docx) return { ok: false, error: "Documents must be 8 MB or smaller." };
  if (!/\.docx$/i.test(filename)) return { ok: false, error: "Only .docx files can be imported." };
  const bad = checkDocx(bytes);
  if (bad) return { ok: false, error: bad };
  const warnings: string[] = [];
  const images: { alt: string; assetId?: string }[] = [];
  let html: string; let messages: { message: string; type: string }[];
  try {
    const res = await mammoth.convertToHtml({ buffer: bytes }, {
      convertImage: mammoth.images.imgElement(async (image) => {
        const buf = await image.read();
        const saved = await saveAsset(actor, { filename: `import-${images.length + 1}`, bytes: Buffer.from(buf), kind: "image", alt: (image as { altText?: string }).altText ?? "", isPublic: false, orgId: user.orgId, licence: "Imported from a Word document; confirm the licence before publishing" });
        if (!saved.ok) { warnings.push(`An image could not be imported: ${saved.error}`); return { src: "" }; }
        images.push({ alt: (image as { altText?: string }).altText ?? "", assetId: saved.id });
        return { src: `asset:${saved.id}`, alt: (image as { altText?: string }).altText ?? "" };
      }),
      styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2.subtitle:fresh", "p[style-name='Caption'] => p.caption:fresh", "p[style-name='Quote'] => blockquote:fresh"],
    });
    html = res.value; messages = res.messages;
  } catch {
    return { ok: false, error: "The document could not be read. It may be damaged or not a real .docx file." };
  }
  for (const m of messages) if (m.type === "warning" || m.type === "error") warnings.push(m.message.slice(0, 200));
  const stats = { headings: 0, paragraphs: 0, lists: 0, tables: 0, images: images.length, refs: 0 };
  const scenes: Scene[] = [];
  let title = filename.replace(/\.docx$/i, "");
  const st: { cur: Scene | null } = { cur: null }; let sawTitle = false;
  const startScene = (t: string) => { if (st.cur && (st.cur.text.trim() || st.cur.assetId)) scenes.push(st.cur); st.cur = { title: t.slice(0, 160), text: "" }; };
  const blocks = html.match(/<(h[1-6]|p|ul|ol|table|blockquote)[\s\S]*?<\/\1>/g) ?? [];
  for (const b of blocks) {
    const tag = b.match(/^<(\w+)/)![1];
    if (/^h[1-6]$/.test(tag)) {
      stats.headings++; const t = strip(b);
      if (tag === "h1" && !sawTitle && !scenes.length && !st.cur) { title = t || title; sawTitle = true; continue; }
      startScene(t || "Scene"); continue;
    }
    if (!st.cur) startScene("Scene 1");
    const c = st.cur as Scene;
    const img = b.match(/<img[^>]*src="asset:([0-9a-f-]{36})"[^>]*>/);
    if (img && !c.assetId) { c.assetId = img[1]; const alt = b.match(/alt="([^"]*)"/); c.alt = alt ? decode(alt[1]) : ""; }
    if (tag === "p") { stats.paragraphs++; const t = strip(b.replace(/<img[^>]*>/g, "")); if (t) { if (/class="caption"/.test(b)) c.caption = t; else c.text += (c.text ? "\n\n" : "") + t; } }
    else if (tag === "blockquote") { const t = strip(b); if (t) c.text += (c.text ? "\n\n" : "") + "“" + t + "”"; }
    else if (tag === "ul" || tag === "ol") { stats.lists++; const items = [...b.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x, i) => `${tag === "ol" ? i + 1 + "." : "•"} ${strip(x[1])}`); c.text += (c.text ? "\n\n" : "") + items.join("\n"); }
    else if (tag === "table") { stats.tables++; const rows = [...b.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((x) => strip(x[1])).join(" | ")); c.text += (c.text ? "\n\n" : "") + rows.join("\n"); warnings.push("A table was converted to plain text rows. Check its layout."); }
  }
  if (st.cur && (st.cur.text.trim() || st.cur.assetId)) scenes.push(st.cur);
  if (!scenes.length) return { ok: false, error: "No readable text was found in the document." };
  for (const sc of scenes) { const refs = findRefs(sc.title + " " + sc.text); if (refs.length) { sc.ref = refs[0]; stats.refs++; } }
  if (/<(object|embed)/.test(html)) warnings.push("Embedded objects were ignored.");
  warnings.push("Text formatting such as colours and fonts is not kept; bold and italic are simplified to plain text. Review each scene before saving.");
  await audit(actor, "story.import_preview", undefined, { filename, scenes: scenes.length, ...stats });
  return { ok: true, preview: { title, scenes, warnings: [...new Set(warnings)], stats } };
}

/** Creates a NEW draft story from an approved preview. Existing stories are never touched. */
export async function createFromImport(actor: Actor, user: StudioUser, p: { title: string; scenes: Scene[]; passageRef: string }) {
  if (!canAuthor(user)) throw new Error("Not allowed.");
  if (!parseRange(p.passageRef)) throw new Error("Choose the main Bible passage for this story (for example Genesis 6:9-22).");
  const db = await getDb();
  const [row] = await db.insert(schema.stories).values({ slug: await uniqueSlug(slugify(p.title)), title: p.title.slice(0, 200), passageRef: p.passageRef, scenes: cleanScenes(p.scenes), status: "draft", authorId: user.id, orgId: user.orgId, coverArt: "day:hills:book", detail: { sources: "Imported from a Word document." } }).returning();
  await db.insert(schema.importLogs).values({ kind: "story-docx", userId: user.id, summary: { storyId: row.id, scenes: row.scenes.length } });
  await audit(actor, "story.import_create", { type: "story", id: row.id });
  return row;
}
