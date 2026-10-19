import "server-only";
import { and, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, type Actor } from "../audit";
import type { Role } from "../db/schema";

export interface RenderSection { id: string; type: string; hidden: boolean; audience: string; content: Record<string, unknown> }
export interface RenderPage { id: string; slug: string; title: string; seoTitle: string | null; seoDescription: string | null; ogAssetId: string | null; sections: RenderSection[]; status: string }

const audienceOk = (aud: string, role: Role | null) => {
  if (aud === "all") return true;
  if (aud === "guests") return !role;
  if (aud === "members") return !!role;
  if (aud === "students") return role === "student";
  if (aud === "parents") return role === "parent";
  if (aud === "teachers") return role === "teacher";
  return true;
};

/** Public pages render PUBLISHED content only; a preview renders the working draft (admins only, enforced by the caller). */
export async function loadPage(slug: string, opts: { preview?: boolean; role?: Role | null } = {}): Promise<RenderPage | null> {
  const db = await getDb();
  const [page] = await db.select().from(schema.pages).where(and(eq(schema.pages.slug, slug), isNull(schema.pages.archivedAt)));
  if (!page) return null;
  const live = page.status === "published" && (!page.publishAt || page.publishAt <= new Date());
  if (!live && !opts.preview) return null;
  const rows = await db.select().from(schema.pageSections).where(and(eq(schema.pageSections.pageId, page.id), isNull(schema.pageSections.deletedAt)));
  const sections = rows
    .map((r) => opts.preview
      ? { id: r.id, type: r.type, hidden: r.hidden, audience: r.audience, sort: r.sort, content: r.draft }
      : { id: r.id, type: r.type, hidden: r.publishedHidden ?? true, audience: r.audience, sort: r.publishedSort ?? r.sort, content: r.published as Record<string, unknown> | null })
    .filter((r) => r.content && (opts.preview || (!r.hidden && audienceOk(r.audience, opts.role ?? null))))
    .sort((a, b) => a.sort - b.sort)
    .map(({ id, type, hidden, audience, content }) => ({ id, type, hidden, audience, content: content as Record<string, unknown> }));
  return { id: page.id, slug: page.slug, title: page.title, seoTitle: page.seoTitle, seoDescription: page.seoDescription, ogAssetId: page.ogAssetId, sections, status: page.status };
}

export async function listPages() {
  const db = await getDb();
  return db.select().from(schema.pages).orderBy(asc(schema.pages.kind), asc(schema.pages.title));
}

export async function pageWithDraft(pageId: string) {
  const db = await getDb();
  const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, pageId));
  if (!page) return null;
  const sections = await db.select().from(schema.pageSections).where(eq(schema.pageSections.pageId, pageId)).orderBy(asc(schema.pageSections.sort));
  return { page, sections };
}

const SECTION_TYPES = ["hero", "about", "wings", "crop", "learning", "storybook", "classes", "parents", "teachers", "cbt", "timeline", "featured", "testimonials", "events", "faq", "contact", "richtext", "cta", "image", "video", "cards"] as const;
export const sectionTypes = SECTION_TYPES;

export async function createPage(actor: Actor, input: { slug: string; title: string; kind?: string }) {
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  if (!slug || ["admin", "api", "login", "register", "student", "parent", "teacher", "church", "softnet", "studio", "p", "wings", "classes", "stories", "bible", "timeline", "plans", "faq", "contact", "pay", "account", "forgot-password", "reset-password", "setup"].includes(slug)) throw new Error("That address is reserved. Choose another.");
  const db = await getDb();
  const [p] = await db.insert(schema.pages).values({ slug, title: input.title.trim() || slug, kind: input.kind ?? "page", status: "draft" }).returning();
  await audit(actor, "page.create", { type: "page", id: p.id }, { slug });
  return p;
}

export async function addSection(actor: Actor, pageId: string, type: string, content: Record<string, unknown> = {}) {
  if (!SECTION_TYPES.includes(type as (typeof SECTION_TYPES)[number])) throw new Error("Unknown section type.");
  const db = await getDb();
  const [max] = await db.select({ m: sql<number>`coalesce(max(${schema.pageSections.sort}),0)::int` }).from(schema.pageSections).where(eq(schema.pageSections.pageId, pageId));
  const [s] = await db.insert(schema.pageSections).values({ pageId, type, sort: max.m + 1, draft: content }).returning();
  await audit(actor, "section.add", { type: "section", id: s.id }, { pageId, type });
  return s;
}

export async function updateSection(actor: Actor, sectionId: string, patch: { content?: Record<string, unknown>; hidden?: boolean; audience?: string }) {
  const db = await getDb();
  const set: Partial<typeof schema.pageSections.$inferInsert> = { updatedAt: new Date() };
  if (patch.content) set.draft = patch.content;
  if (patch.hidden !== undefined) set.hidden = patch.hidden;
  if (patch.audience) set.audience = patch.audience;
  await db.update(schema.pageSections).set(set).where(eq(schema.pageSections.id, sectionId));
  await audit(actor, "section.update", { type: "section", id: sectionId });
}

export async function moveSection(actor: Actor, sectionId: string, dir: "up" | "down") {
  const db = await getDb();
  const [s] = await db.select().from(schema.pageSections).where(eq(schema.pageSections.id, sectionId));
  if (!s) return;
  const all = await db.select().from(schema.pageSections).where(and(eq(schema.pageSections.pageId, s.pageId), isNull(schema.pageSections.deletedAt))).orderBy(asc(schema.pageSections.sort), asc(schema.pageSections.id));
  const i = all.findIndex((x) => x.id === sectionId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  const arr = [...all]; [arr[i], arr[j]] = [arr[j], arr[i]];
  for (let k = 0; k < arr.length; k++) await db.update(schema.pageSections).set({ sort: k + 1 }).where(eq(schema.pageSections.id, arr[k].id));
  await audit(actor, "section.move", { type: "section", id: sectionId }, { dir });
}

export async function duplicateSection(actor: Actor, sectionId: string) {
  const db = await getDb();
  const [s] = await db.select().from(schema.pageSections).where(eq(schema.pageSections.id, sectionId));
  if (!s) return;
  await db.update(schema.pageSections).set({ sort: sql`${schema.pageSections.sort} + 1` }).where(and(eq(schema.pageSections.pageId, s.pageId), sql`${schema.pageSections.sort} > ${s.sort}`));
  await db.insert(schema.pageSections).values({ pageId: s.pageId, sort: s.sort + 1, type: s.type, hidden: true, audience: s.audience, draft: s.draft });
  await audit(actor, "section.duplicate", { type: "section", id: sectionId });
}

export async function removeSection(actor: Actor, sectionId: string, restore = false) {
  const db = await getDb();
  await db.update(schema.pageSections).set({ deletedAt: restore ? null : new Date() }).where(eq(schema.pageSections.id, sectionId));
  await audit(actor, restore ? "section.restore" : "section.delete", { type: "section", id: sectionId });
}

/** Publishing copies the working draft to the live content, keeps a version snapshot, and is audited. */
export async function publishPage(actor: Actor, pageId: string, opts: { publishAt?: Date | null } = {}) {
  const db = await getDb();
  const data = await pageWithDraft(pageId);
  if (!data) throw new Error("Page not found.");
  await db.insert(schema.contentVersions).values({ entityType: "page", entityId: pageId, snapshot: { page: data.page, sections: data.sections }, changedBy: actor.id, note: "Publish" });
  await db.transaction(async (tx) => {
    for (const sec of data.sections) {
      if (sec.deletedAt) await tx.update(schema.pageSections).set({ published: null, publishedHidden: true }).where(eq(schema.pageSections.id, sec.id));
      else await tx.update(schema.pageSections).set({ published: sec.draft, publishedHidden: sec.hidden, publishedSort: sec.sort }).where(eq(schema.pageSections.id, sec.id));
    }
    await tx.update(schema.pages).set({ status: "published", publishAt: opts.publishAt ?? null, updatedAt: new Date() }).where(eq(schema.pages.id, pageId));
  });
  await audit(actor, "page.publish", { type: "page", id: pageId }, { slug: data.page.slug, scheduled: !!opts.publishAt });
}

export async function updatePageMeta(actor: Actor, pageId: string, meta: { title?: string; seoTitle?: string; seoDescription?: string; showInNav?: boolean; slug?: string }) {
  const db = await getDb();
  const set: Partial<typeof schema.pages.$inferInsert> = { updatedAt: new Date() };
  if (meta.title !== undefined) set.title = meta.title;
  if (meta.seoTitle !== undefined) set.seoTitle = meta.seoTitle || null;
  if (meta.seoDescription !== undefined) set.seoDescription = meta.seoDescription || null;
  if (meta.showInNav !== undefined) set.showInNav = meta.showInNav;
  if (meta.slug) { const [pg] = await db.select().from(schema.pages).where(eq(schema.pages.id, pageId)); if (pg.kind !== "home") set.slug = meta.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-"); }
  await db.update(schema.pages).set(set).where(eq(schema.pages.id, pageId));
  await audit(actor, "page.meta", { type: "page", id: pageId });
}

export async function pageVersions(pageId: string) {
  const db = await getDb();
  return db.select({ id: schema.contentVersions.id, createdAt: schema.contentVersions.createdAt, note: schema.contentVersions.note }).from(schema.contentVersions).where(and(eq(schema.contentVersions.entityType, "page"), eq(schema.contentVersions.entityId, pageId))).orderBy(desc(schema.contentVersions.createdAt)).limit(20);
}

export async function restorePageVersion(actor: Actor, pageId: string, versionId: string) {
  const db = await getDb();
  const [v] = await db.select().from(schema.contentVersions).where(and(eq(schema.contentVersions.id, versionId), eq(schema.contentVersions.entityId, pageId)));
  if (!v) throw new Error("Version not found.");
  const snap = v.snapshot as { sections: (typeof schema.pageSections.$inferSelect)[] };
  for (const s of snap.sections) await db.update(schema.pageSections).set({ draft: s.draft, hidden: s.hidden, sort: s.sort, deletedAt: null }).where(eq(schema.pageSections.id, s.id));
  await audit(actor, "page.restore_version", { type: "page", id: pageId }, { versionId });
}

// ───────── lists used by public sections ─────────
export const publishedWings = async () => (await getDb()).select().from(schema.ministryWings).where(eq(schema.ministryWings.status, "published")).orderBy(asc(schema.ministryWings.sort));
export const publishedFaqs = async () => (await getDb()).select().from(schema.faqs).where(eq(schema.faqs.status, "published")).orderBy(asc(schema.faqs.sort));
export const publishedEvents = async () => (await getDb()).select().from(schema.events).where(eq(schema.events.status, "published")).orderBy(asc(schema.events.startsAt));
/** Only testimonials with recorded consent are ever shown. */
export const publishedTestimonials = async () => (await getDb()).select().from(schema.testimonials).where(and(eq(schema.testimonials.status, "published"), eq(schema.testimonials.consentRecorded, true))).orderBy(desc(schema.testimonials.createdAt));
export const navPages = async () => (await getDb()).select({ slug: schema.pages.slug, title: schema.pages.title }).from(schema.pages).where(and(eq(schema.pages.showInNav, true), eq(schema.pages.status, "published"), isNull(schema.pages.archivedAt), or(isNull(schema.pages.publishAt), lte(schema.pages.publishAt, new Date()))));
