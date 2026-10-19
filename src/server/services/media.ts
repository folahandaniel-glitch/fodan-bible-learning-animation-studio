import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { sanitizeSvg, UnsafeSvgError } from "@/lib/svg";
import { audit, type Actor } from "../audit";

export const LIMITS = { image: 5 * 1024 * 1024, audio: 10 * 1024 * 1024, docx: 8 * 1024 * 1024 };

export type Sniffed = { kind: "image" | "audio" | "docx" | "pdf"; mime: string };

/** Identifies a file by its content, not its name or declared type. */
export function sniff(b: Buffer): Sniffed | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") return { kind: "image", mime: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: "image", mime: "image/jpeg" };
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return { kind: "image", mime: "image/webp" };
  if (b.toString("ascii", 0, 3) === "GIF") return { kind: "image", mime: "image/gif" };
  if (b.toString("ascii", 0, 5) === "%PDF-") return { kind: "pdf", mime: "application/pdf" };
  if (b.toString("ascii", 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { kind: "audio", mime: "audio/mpeg" };
  if (b.toString("ascii", 0, 4) === "OggS") return { kind: "audio", mime: "audio/ogg" };
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE") return { kind: "audio", mime: "audio/wav" };
  if (b[0] === 0x50 && b[1] === 0x4b) return { kind: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  const head = b.toString("utf8", 0, 600).trimStart();
  if (/^(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return { kind: "image", mime: "image/svg+xml" };
  return null;
}

/** A .docx is a zip; refuse macro-enabled or otherwise odd packages. */
export function checkDocx(b: Buffer): string | null {
  const text = b.toString("latin1");
  if (!text.includes("word/document.xml")) return "This does not look like a Word (.docx) document.";
  if (/vbaProject\.bin/i.test(text)) return "Macro-enabled documents are not accepted.";
  if (/\.(exe|dll|bat|cmd|js|vbs)\b/i.test(text.slice(0, 200_000)) && /oleObject/i.test(text)) return "Embedded executable content is not accepted.";
  return null;
}

export interface UploadInput { filename: string; bytes: Buffer; kind?: "image" | "audio" | "docx"; alt?: string; caption?: string; sourceUrl?: string; creator?: string; licence?: string; attribution?: string; permittedUse?: string; isPublic?: boolean; orgId?: string | null }

export async function saveAsset(actor: Actor, input: UploadInput): Promise<{ ok: true; id: string; mime: string } | { ok: false; error: string }> {
  const sn = sniff(input.bytes);
  if (!sn) return { ok: false, error: "That file type is not allowed." };
  const want = input.kind ?? "image";
  if (sn.kind !== want) return { ok: false, error: `Expected ${want === "image" ? "an image" : want} but the file is ${sn.kind}.` };
  if (sn.kind === "image" && input.bytes.length > LIMITS.image) return { ok: false, error: "Images must be 5 MB or smaller." };
  if (sn.kind === "audio" && input.bytes.length > LIMITS.audio) return { ok: false, error: "Audio files must be 10 MB or smaller." };
  let data = input.bytes; let mime = sn.mime;
  if (mime === "image/svg+xml") {
    try { data = Buffer.from(sanitizeSvg(input.bytes.toString("utf8")), "utf8"); } catch (e) { return { ok: false, error: e instanceof UnsafeSvgError ? e.message : "Invalid SVG." }; }
  }
  if (sn.kind === "docx") { const p = checkDocx(input.bytes); if (p) return { ok: false, error: p }; }
  const db = await getDb();
  const [row] = await db.insert(schema.mediaAssets).values({
    kind: sn.kind, mime, filename: input.filename.replace(/[^\w.\- ]+/g, "_").slice(0, 120), data, size: data.length, alt: input.alt ?? "", caption: input.caption ?? "",
    sourceUrl: input.sourceUrl ?? null, creator: input.creator ?? null, licence: input.licence ?? null, attribution: input.attribution ?? null, permittedUse: input.permittedUse ?? null,
    retrievedAt: input.sourceUrl ? new Date() : null, isPublic: input.isPublic ?? true, uploadedBy: actor.id, orgId: input.orgId ?? null,
  }).returning({ id: schema.mediaAssets.id });
  await audit(actor, "media.upload", { type: "asset", id: row.id }, { mime, size: data.length, licence: input.licence });
  return { ok: true, id: row.id, mime };
}

export async function getAsset(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [a] = await db.select().from(schema.mediaAssets).where(and(eq(schema.mediaAssets.id, id), isNull(schema.mediaAssets.deletedAt)));
  return a ?? null;
}

export async function storageUsage() {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(*)::int`, bytes: sql<number>`coalesce(sum(${schema.mediaAssets.size}),0)::bigint::int` }).from(schema.mediaAssets).where(isNull(schema.mediaAssets.deletedAt));
  return r;
}
