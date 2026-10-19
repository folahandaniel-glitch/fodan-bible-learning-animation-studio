"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actorOf, requireUser } from "@/server/guards";
import * as studio from "@/server/services/studio";
import { saveAsset } from "@/server/services/media";
import type { ActionResult } from "@/components/forms";
import type { ContentStatus, Scene } from "@/server/db/schema";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const ROLES = ["teacher", "super_admin", "curriculum_admin", "content_editor"] as const;
const su = (u: Awaited<ReturnType<typeof requireUser>>) => ({ id: u.id, role: u.role, orgId: u.orgId });
const fail = (e: unknown): ActionResult => { if (e && typeof e === "object" && "digest" in e) throw e; return { error: (e as Error).message }; };

export async function fromTemplateAction(slug: string, _: ActionResult): Promise<ActionResult> {
  const u = await requireUser([...ROLES]);
  try { const s = await studio.createFromTemplate(await actorOf(u), su(u), slug); redirect(`/studio/${s.id}`); } catch (e) { return fail(e); }
}
export async function blankStoryAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser([...ROLES]);
  try { const s = await studio.createBlank(await actorOf(u), su(u), str(f, "title") || "Untitled story", str(f, "ref")); redirect(`/studio/${s.id}`); } catch (e) { return fail(e); }
}

/** Autosave from the editor. Returns a small status object, never throws to the browser. */
export async function autosaveAction(id: string, patch: studio.StoryPatch): Promise<{ ok: boolean; error?: string; at?: string }> {
  const u = await requireUser([...ROLES]);
  try { await studio.autosave(su(u), id, patch); return { ok: true, at: new Date().toISOString() }; } catch (e) { return { ok: false, error: (e as Error).message }; }
}
export async function saveVersionAction(id: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser([...ROLES]);
  try { await studio.saveVersion(await actorOf(u), su(u), id, str(f, "note")); revalidatePath(`/studio/${id}`); return { ok: true, message: "Version saved." }; } catch (e) { return fail(e); }
}
export async function restoreVersionStoryAction(id: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser([...ROLES]);
  try { await studio.restoreVersion(await actorOf(u), su(u), id, str(f, "version")); revalidatePath(`/studio/${id}`); return { ok: true, message: "Restored. Reload the page to see it." }; } catch (e) { return fail(e); }
}
export async function storyWorkflowAction(id: string, to: ContentStatus, _: ActionResult): Promise<ActionResult> {
  const u = await requireUser([...ROLES]);
  try { await studio.setStatus(await actorOf(u), su(u), id, to); revalidatePath(`/studio/${id}`); return { ok: true, message: to === "review" ? "Submitted for review." : `Now ${to}.` }; } catch (e) { return fail(e); }
}

/** Authorised image upload for a scene. The licence details are recorded with the file. */
export async function uploadSceneImageAction(_: unknown, f: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  const u = await requireUser([...ROLES]);
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose an image." };
  if (!str(f, "licence")) return { ok: false, error: "Record the licence or permission for this image." };
  if (!str(f, "alt")) return { ok: false, error: "Describe the image for people who cannot see it (alt text)." };
  const r = await saveAsset(await actorOf(u), { filename: file.name, bytes: Buffer.from(await file.arrayBuffer()), kind: "image", alt: str(f, "alt"), caption: str(f, "caption"), sourceUrl: str(f, "sourceUrl") || undefined, creator: str(f, "creator") || undefined, licence: str(f, "licence"), attribution: str(f, "attribution") || undefined, permittedUse: str(f, "permittedUse") || undefined, isPublic: true, orgId: u.orgId });
  return r.ok ? { ok: true, id: r.id } : { ok: false, error: r.error };
}

export async function previewDocxAction(_: unknown, f: FormData) {
  const u = await requireUser([...ROLES]);
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false as const, error: "Choose a .docx file." };
  return studio.previewDocx(await actorOf(u), su(u), Buffer.from(await file.arrayBuffer()), file.name);
}
export async function createFromImportAction(payload: string, title: string, passageRef: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  const u = await requireUser([...ROLES]);
  try { const scenes = JSON.parse(payload) as Scene[]; const s = await studio.createFromImport(await actorOf(u), su(u), { title, scenes, passageRef }); return { ok: true, id: s.id }; } catch (e) { return { ok: false, error: (e as Error).message }; }
}
