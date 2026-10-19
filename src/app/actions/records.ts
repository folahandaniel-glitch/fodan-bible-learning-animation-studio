"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import type { AnyPgTable, PgColumn } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/server/db";
import { actorOf, requireAdmin } from "@/server/guards";
import { audit } from "@/server/audit";
import { ENTITIES, type FieldSpec } from "@/lib/admin-entities";
import { FEATURES } from "@/server/services/entitlements";
import type { ActionResult } from "@/components/forms";

type Tbl = AnyPgTable & { id: PgColumn };
const TABLES: Record<string, Tbl> = {
  ministryWings: schema.ministryWings, faqs: schema.faqs, events: schema.events, testimonials: schema.testimonials, enquiries: schema.enquiries, timelineEvents: schema.timelineEvents,
  plans: schema.plans, trainingModules: schema.trainingModules, organizations: schema.organizations,
} as unknown as Record<string, Tbl>;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function coerce(spec: FieldSpec, f: FormData): unknown {
  switch (spec.kind) {
    case "bool": return f.get(spec.name) === "on";
    case "number": { const n = Number(str(f, spec.name)); return Number.isFinite(n) ? Math.round(n) : 0; }
    case "money": { const n = Number(str(f, spec.name).replace(/,/g, "")); if (!Number.isFinite(n) || n < 0) throw new Error("Enter a valid price."); return Math.round(n * 100); }
    case "lines": return String(f.get(spec.name) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    case "multi": return f.getAll(spec.name).map(String).filter((v) => v in FEATURES);
    case "datetime": return str(f, spec.name) ? new Date(str(f, spec.name)) : null;
    default: return str(f, spec.name).slice(0, spec.kind === "textarea" ? 20000 : 500);
  }
}

export async function saveRecordAction(entity: string, id: string | null, _: ActionResult, f: FormData): Promise<ActionResult> {
  const spec = ENTITIES[entity];
  if (!spec) return { error: "Unknown record type." };
  const u = await requireAdmin(spec.perm);
  try {
    const table = TABLES[spec.table];
    const values: Record<string, unknown> = {};
    for (const fs of spec.fields) {
      if (fs.required && !str(f, fs.name) && fs.kind !== "bool" && fs.kind !== "multi") throw new Error(`${fs.label.split(" (")[0]} is required.`);
      values[fs.name] = coerce(fs, f);
    }
    if (entity === "plans") {
      if (!values.isDraft && Number(values.priceMinor) <= 0) throw new Error("A plan needs a price above zero before it can be published. Tick 'Keep as draft' or enter a price.");
      values.slug = String(values.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      values.currency = String(values.currency || "NGN").toUpperCase().slice(0, 3);
      values.updatedAt = new Date();
    }
    if (entity === "wings" && !id) values.slug = String(values.name).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `wing-${Date.now()}`;
    if (entity === "timeline" && !id) values.slug = String(values.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Math.random().toString(36).slice(2, 5);
    if (entity === "training") values.slug = String(values.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const db = await getDb();
    if (id) await db.update(table).set(values).where(eq(table.id, id));
    else { if (!spec.create) throw new Error("Not allowed."); await db.insert(table).values(values as never); }
    await audit(await actorOf(u), `${entity}.${id ? "update" : "create"}`, { type: entity, id: id ?? undefined });
    revalidatePath(`/admin/data/${entity}`); revalidatePath("/", "layout");
    return { ok: true, message: "Saved." };
  } catch (e) {
    const msg = (e as Error).message;
    return { error: /unique|duplicate/i.test(msg) ? "That name or short name is already used. Choose another." : msg };
  }
}

export async function deleteRecordAction(entity: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  const spec = ENTITIES[entity];
  if (!spec || spec.remove === "none") return { error: "Not allowed." };
  const u = await requireAdmin(spec.perm);
  try {
    const table = TABLES[spec.table]; const db = await getDb(); const id = str(f, "id");
    if (spec.remove === "archive") {
      const col = entity === "plans" ? { active: false } : { status: "draft" };
      await db.update(table).set(col as never).where(eq(table.id, id));
    } else await db.delete(table).where(eq(table.id, id));
    await audit(await actorOf(u), `${entity}.${spec.remove === "archive" ? "archive" : "delete"}`, { type: entity, id });
    revalidatePath(`/admin/data/${entity}`); revalidatePath("/", "layout");
    return { ok: true, message: spec.remove === "archive" ? "Hidden (restore by editing it)." : "Deleted." };
  } catch (e) { return { error: (e as Error).message }; }
}
