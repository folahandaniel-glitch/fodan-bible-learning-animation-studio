"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { actorOf, requireAdmin } from "@/server/guards";
import { adminCreateUser, changeRole, eraseUser, issueTemporaryPassword, setUserOrg, setUserStatus } from "@/server/services/admin-users";
import { createAccessKey, requestPasswordReset } from "@/server/services/auth";
import { changeEntitlement, grantEntitlement } from "@/server/services/entitlements";
import { markDisputed, markRefunded, reconcile } from "@/server/services/payments";
import { sendTemplate } from "@/server/services/email";
import { getSetting, setSetting, rawSetting, type SettingKey } from "@/server/settings";
import { audit } from "@/server/audit";
import { saveAsset, sniff } from "@/server/services/media";
import { sanitizeSvg, UnsafeSvgError } from "@/lib/svg";
import { requestCtx } from "@/server/auth/session";
import type { Role } from "@/server/db/schema";
import type { ActionResult } from "@/components/forms";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
type R = ActionResult & { secret?: string };
const run = async (fn: () => Promise<R | void>, ok = "Saved."): Promise<R> => {
  try { return (await fn()) ?? { ok: true, message: ok }; } catch (e) { if (e && typeof e === "object" && "digest" in e) throw e; return { error: (e as Error).message }; }
};

// ───────── users ─────────
export async function createUserAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("users.manage");
  return run(async () => {
    const r = await adminCreateUser(await actorOf(u), { id: u.id, role: u.role }, { fullName: str(f, "fullName"), email: str(f, "email"), username: str(f, "username"), role: str(f, "role") as Role, orgId: str(f, "orgId"), classLevelSlug: str(f, "classLevelSlug") });
    revalidatePath("/admin/users");
    return { ok: true, message: `Account created for ${r.user.fullName}. Temporary password (shown once, copy it now and share it privately; it must be changed at first sign-in): ${r.temporaryPassword}` };
  });
}
export async function userStatusAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("users.manage");
  return run(async () => { await setUserStatus(await actorOf(u), { id: u.id, role: u.role }, str(f, "id"), str(f, "status") as "active" | "suspended" | "deactivated"); revalidatePath("/admin/users"); return { ok: true, message: "Updated." }; });
}
export async function roleAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("users.manage");
  return run(async () => { await changeRole(await actorOf(u), { id: u.id, role: u.role }, str(f, "id"), str(f, "role") as Role); revalidatePath("/admin/users"); return { ok: true, message: "Role changed. The user was signed out." }; });
}
export async function resetEmailAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("users.manage");
  return run(async () => {
    const db = await getDb(); const [t] = await db.select().from(schema.users).where(eq(schema.users.id, str(f, "id")));
    if (!t?.email) throw new Error("This person has no email address. Issue a temporary password instead.");
    await requestPasswordReset(t.email, await requestCtx());
    await audit(await actorOf(u), "user.reset_link_sent", { type: "user", id: t.id });
    return { ok: true, message: "A reset link has been requested. If e-mail delivery is not configured it is held, not sent." };
  });
}
export async function tempPasswordAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("users.manage");
  return run(async () => { const t = await issueTemporaryPassword(await actorOf(u), { id: u.id, role: u.role }, str(f, "id")); return { ok: true, message: `Temporary password (shown once): ${t}. The person must change it at first sign-in.` }; });
}
export async function userOrgAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("users.manage");
  return run(async () => { await setUserOrg(await actorOf(u), { id: u.id, role: u.role }, str(f, "id"), str(f, "orgId") || null); revalidatePath("/admin/users"); return { ok: true, message: "Organisation updated." }; });
}

// ───────── organisations & keys ─────────
export async function orgStatusAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("orgs.manage");
  return run(async () => { const db = await getDb(); await db.update(schema.organizations).set({ status: str(f, "status") }).where(eq(schema.organizations.id, str(f, "id"))); await audit(await actorOf(u), "org.status", { type: "org", id: str(f, "id") }, { status: str(f, "status") }); if (str(f, "status") === "active") await db.update(schema.users).set({ status: "active" }).where(and(eq(schema.users.orgId, str(f, "id")), eq(schema.users.role, "org_admin"), eq(schema.users.status, "pending"))); revalidatePath("/admin/orgs"); });
}
export async function orgCreateAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("orgs.manage");
  return run(async () => {
    const name = str(f, "name"); if (name.length < 2) throw new Error("Enter a name.");
    const db = await getDb();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
    const [o] = await db.insert(schema.organizations).values({ name, slug, type: str(f, "type") || "church", country: str(f, "country") || null, contactEmail: str(f, "email") || null, status: "active" }).returning();
    await audit(await actorOf(u), "org.create", { type: "org", id: o.id }, { name }); revalidatePath("/admin/orgs");
  }, "Organisation created.");
}
export async function createKeyAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("keys.manage");
  return run(async () => {
    const purpose = str(f, "purpose") === "scholarship" ? "scholarship" : "registration";
    const key = await createAccessKey(await actorOf(u), { label: str(f, "label") || "Access code", purpose, role: (str(f, "role") || undefined) as Role | undefined, orgId: str(f, "orgId") || undefined, planId: str(f, "planId") || undefined, classLevelSlug: str(f, "classLevelSlug") || undefined, grantDays: purpose === "scholarship" ? Math.max(1, Number(str(f, "days")) || 30) : undefined, maxUses: Math.max(1, Number(str(f, "maxUses")) || 1), expiresAt: str(f, "expires") ? new Date(str(f, "expires")) : undefined });
    revalidatePath("/admin/keys");
    return { ok: true, message: `Code created. It is shown only now, copy it: ${key}` };
  });
}
export async function revokeKeyAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("keys.manage");
  return run(async () => { const db = await getDb(); await db.update(schema.accessKeys).set({ revokedAt: new Date() }).where(eq(schema.accessKeys.id, str(f, "id"))); await audit(await actorOf(u), "accesskey.revoke", { type: "accesskey", id: str(f, "id") }); revalidatePath("/admin/keys"); }, "Revoked.");
}

// ───────── finance & entitlements ─────────
export async function grantAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("entitlements.manage");
  return run(async () => {
    const q = str(f, "who").toLowerCase(); const db = await getDb();
    const [target] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${q} OR lower(${schema.users.username}) = ${q}`);
    if (!target) throw new Error("No user found with that username or email.");
    await grantEntitlement(await actorOf(u), { userId: target.id, planId: str(f, "planId") || undefined, days: Math.max(1, Math.min(3650, Number(str(f, "days")) || 30)), source: str(f, "source") === "admin" ? "admin" : "scholarship", reason: str(f, "reason") });
    revalidatePath("/admin/finance");
    return { ok: true, message: `Access granted to ${target.fullName}.` };
  });
}
export async function grantOrgAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("entitlements.manage");
  return run(async () => { await grantEntitlement(await actorOf(u), { orgId: str(f, "orgId"), planId: str(f, "planId") || undefined, days: Math.max(1, Number(str(f, "days")) || 365), seats: Math.max(1, Number(str(f, "seats")) || 50), source: "admin", reason: str(f, "reason") }); revalidatePath("/admin/finance"); return { ok: true, message: "Organisation licence granted." }; });
}
export async function changeEntitlementAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("entitlements.manage");
  return run(async () => { await changeEntitlement(await actorOf(u), str(f, "id"), { action: str(f, "action") as "extend" | "suspend" | "reactivate" | "revoke", days: Number(str(f, "days")) || 30, reason: str(f, "reason") }); revalidatePath("/admin/finance"); return { ok: true, message: "Updated." }; });
}
export async function refundAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("entitlements.manage");
  return run(async () => { await (str(f, "kind") === "dispute" ? markDisputed : markRefunded)(await actorOf(u), str(f, "id"), str(f, "reason")); revalidatePath("/admin/finance"); return { ok: true, message: "Recorded. If this was a refund, remember to issue it in the payment provider's dashboard." }; });
}
export async function reconcileAction(_: R | null): Promise<R> {
  await requireAdmin("finance.view");
  return run(async () => { const r = await reconcile(); revalidatePath("/admin/finance"); return { ok: true, message: `Checked ${r.stalePending} pending payments; ${r.settledNow} were confirmed.` }; });
}

// ───────── e-mail, settings, privacy ─────────
export async function saveEmailTemplateAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("emails.edit");
  return run(async () => {
    const db = await getDb(); const key = str(f, "key");
    await db.update(schema.emailTemplates).set({ subject: str(f, "subject").slice(0, 200), body: String(f.get("body") ?? "").slice(0, 8000), updatedAt: new Date() }).where(eq(schema.emailTemplates.key, key));
    await audit(await actorOf(u), "email.template_edit", { type: "email_template", id: key });
  });
}
export async function testEmailAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("emails.edit");
  return run(async () => {
    const to = str(f, "to"); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Enter a valid email address.");
    const r = await sendTemplate("admin_notice", to, { name: u.displayName, message: "This is a test message from the Fodan Bible Learning Centre." });
    return r.status === "sent" ? { ok: true, message: "Sent through the e-mail provider." } : { error: r.status === "held" ? "E-mail is not configured, so the message was held and NOT sent." : "The provider rejected the message. Check the sending domain." };
  });
}
const SETTINGS_KEYS = new Set(["brand", "contact", "social", "nav", "footer", "features", "terms", "doctrine"]);
export async function saveSettingAction(key: string, _: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin(key === "brand" ? "branding.edit" : "site.edit");
  return run(async () => {
    if (!SETTINGS_KEYS.has(key)) throw new Error("Unknown setting.");
    const cur = await getSetting(key as SettingKey);
    let value: unknown;
    const colour = (s: string, d: string) => (/^#[0-9a-fA-F]{6}$/.test(s) ? s : d);
    if (key === "brand") { const c = cur as Awaited<ReturnType<typeof getSetting<"brand">>>; value = { ...c, siteName: str(f, "siteName") || c.siteName, shortName: str(f, "shortName") || c.shortName, tagline: str(f, "tagline") || c.tagline, ministry: str(f, "ministry") || c.ministry, wing: str(f, "wing") || c.wing, primary: colour(str(f, "primary"), c.primary), secondary: colour(str(f, "secondary"), c.secondary), accent: colour(str(f, "accent"), c.accent), leaf: colour(str(f, "leaf"), c.leaf), ivory: colour(str(f, "ivory"), c.ivory) }; }
    else if (key === "contact" || key === "social") { const out: Record<string, string> = {}; for (const k of Object.keys(cur as object)) out[k] = str(f, k).slice(0, 300); value = out; }
    else if (key === "nav") { value = str(f, "lines").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [label, href] = l.split("|").map((x) => x.trim()); if (!label || !href || !/^(\/(?!\/)|https?:\/\/)/.test(href)) throw new Error(`Each menu line must look like: Label | /address  (problem: "${l}")`); return { label, href }; }); }
    else if (key === "footer") { const c = cur as Awaited<ReturnType<typeof getSetting<"footer">>>; value = { about: str(f, "about"), copyright: str(f, "copyright"), links: str(f, "lines").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [label, href] = l.split("|").map((x) => x.trim()); if (!label || !href || !/^(\/(?!\/)|https?:\/\/)/.test(href)) throw new Error(`Each link must look like: Label | /address  (problem: "${l}")`); return { label, href }; }) }; void c; }
    else if (key === "features") { const c = cur as Awaited<ReturnType<typeof getSetting<"features">>>; value = { ...c, registrationOpen: { student: f.get("r_student") === "on", parent: f.get("r_parent") === "on", teacher: f.get("r_teacher") === "on", org_admin: f.get("r_org_admin") === "on" }, loginMode: ["both", "email", "username"].includes(str(f, "loginMode")) ? str(f, "loginMode") : "both", bibleReaderPublic: f.get("bibleReaderPublic") === "on", teacherRequiresSubscription: f.get("teacherRequiresSubscription") === "on", graceDays: Math.max(0, Math.min(60, Number(str(f, "graceDays")) || 0)), requireReviewBeforePublish: f.get("requireReviewBeforePublish") === "on" }; }
    else if (key === "terms") { value = str(f, "lines").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6).map((name, i) => ({ n: i + 1, name })); if (!(value as unknown[]).length) throw new Error("Enter at least one term."); }
    else if (key === "doctrine") value = { position: str(f, "position").slice(0, 4000) };
    await setSetting(key as SettingKey, value, u.id);
    await audit(await actorOf(u), "settings.update", { type: "setting", id: key });
    revalidatePath("/", "layout");
  });
}

export async function dataRequestAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("privacy.handle");
  return run(async () => {
    const db = await getDb(); const id = str(f, "id"); const act = str(f, "action");
    const [dr] = await db.select().from(schema.dataRequests).where(eq(schema.dataRequests.id, id));
    if (!dr) throw new Error("Request not found.");
    if (act === "erase") { await eraseUser(await actorOf(u), { id: u.id, role: u.role }, dr.userId); return { ok: true, message: "Learning records and personal details were erased. Payment records were kept." }; }
    await db.update(schema.dataRequests).set({ status: act === "reject" ? "rejected" : "done", handledAt: new Date(), note: str(f, "note") || dr.note }).where(eq(schema.dataRequests.id, id));
    await audit(await actorOf(u), `privacy.request_${act}`, { type: "data_request", id });
    revalidatePath("/admin/privacy");
  });
}

// ───────── branding and logos ─────────
export async function uploadLogoAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("branding.edit");
  return run(async () => {
    const file = f.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("Choose a logo file (SVG or PNG).");
    if (file.size > 2 * 1024 * 1024) throw new Error("Logos must be 2 MB or smaller.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const sn = sniff(bytes);
    if (!sn || sn.kind !== "image" || sn.mime === "image/gif") throw new Error("Use an SVG, PNG, JPEG or WebP image.");
    const db = await getDb();
    const placements = [...f.getAll("placements").map(String)];
    let svg: string | null = null, assetId: string | null = null, mime = sn.mime;
    if (sn.mime === "image/svg+xml") { try { svg = sanitizeSvg(bytes.toString("utf8")); } catch (e) { throw new Error(e instanceof UnsafeSvgError ? e.message : "Invalid SVG."); } }
    else { const saved = await saveAsset(await actorOf(u), { filename: file.name, bytes, kind: "image", alt: str(f, "name"), isPublic: true }); if (!saved.ok) throw new Error(saved.error); assetId = saved.id; mime = saved.mime; }
    const [row] = await db.insert(schema.logos).values({ name: str(f, "name") || file.name, collection: str(f, "collection") || "CROP", ministrySlug: str(f, "ministrySlug") || null, kind: str(f, "kind") || "horizontal", variant: str(f, "variant") || "light", mime, svg, assetId, placements, active: true }).returning();
    await audit(await actorOf(u), "brand.logo_upload", { type: "logo", id: row.id }, { kind: row.kind, placements });
    revalidatePath("/admin/brand"); revalidatePath("/", "layout");
    return { ok: true, message: "Logo uploaded. Assign it to a place below to use it." };
  }, "Uploaded.");
}
export async function logoToggleAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("branding.edit");
  return run(async () => {
    const db = await getDb(); const id = str(f, "id"); const act = str(f, "action");
    if (act === "primary") { await db.update(schema.logos).set({ isPrimary: false }).where(eq(schema.logos.isPrimary, true)); await db.update(schema.logos).set({ isPrimary: true }).where(eq(schema.logos.id, id)); }
    else if (act === "defaultcrop") { await db.update(schema.logos).set({ isDefaultCrop: false }).where(eq(schema.logos.isDefaultCrop, true)); await db.update(schema.logos).set({ isDefaultCrop: true }).where(eq(schema.logos.id, id)); }
    else await db.update(schema.logos).set({ active: act === "activate" }).where(eq(schema.logos.id, id));
    await audit(await actorOf(u), `brand.logo_${act}`, { type: "logo", id }); revalidatePath("/admin/brand"); revalidatePath("/", "layout");
  });
}
export async function logoPlacementAction(_: R | null, f: FormData): Promise<R> {
  const u = await requireAdmin("branding.edit");
  return run(async () => {
    const map = await rawSetting<Record<string, { light?: string; dark?: string }>>("logoPlacements", {});
    const next = { ...map };
    for (const p of ["homepage", "login", "register", "dashboard", "certificate", "exam", "printable", "report", "email"]) next[p] = { light: str(f, `${p}_light`) || undefined, dark: str(f, `${p}_dark`) || undefined };
    await setSetting("logoPlacements", next, u.id);
    await audit(await actorOf(u), "brand.placements", { type: "setting", id: "logoPlacements" });
    revalidatePath("/", "layout");
  });
}
