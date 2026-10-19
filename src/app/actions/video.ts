"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { actorOf, requireAdmin } from "@/server/guards";
import { audit } from "@/server/audit";
import type { ActionResult } from "@/components/forms";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Planning only. No provider is called and no credit is spent from here: generation needs a verified provider and an explicit confirmation. */
export async function createVideoProjectAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireAdmin("media.manage");
  try {
    const db = await getDb();
    const [s] = await db.select().from(schema.stories).where(eq(schema.stories.id, str(f, "storyId")));
    if (!s) throw new Error("Choose a story.");
    const script = s.scenes.map((sc, i) => `Scene ${i + 1}: ${sc.title}\nNarration: ${sc.text}`).join("\n\n");
    const rate = Math.max(1, Math.min(1000, Number(str(f, "rate")) || 5));
    await db.insert(schema.videoProjects).values({ storyId: s.id, title: `Animation: ${s.title}`, stage: "script", script, aspect: ["16:9", "9:16", "1:1"].includes(str(f, "aspect")) ? str(f, "aspect") : "16:9", estimatedCredits: s.scenes.length * rate, createdBy: u.id });
    await audit(await actorOf(u), "video.plan_create", { type: "story", id: s.id });
    revalidatePath("/admin/video");
    return { ok: true, message: "Plan created. Nothing was generated or charged." };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function videoStageAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireAdmin("media.manage");
  try {
    const db = await getDb(); const id = str(f, "id"); const op = str(f, "op");
    const [p] = await db.select().from(schema.videoProjects).where(eq(schema.videoProjects.id, id));
    if (!p) throw new Error("Project not found.");
    if (op === "script") await db.update(schema.videoProjects).set({ script: String(f.get("script") ?? "").slice(0, 20000), updatedAt: new Date() }).where(eq(schema.videoProjects.id, id));
    else if (op === "approve_script") {
      const blocks = p.script.split(/\n{2,}/).filter(Boolean);
      await db.update(schema.videoProjects).set({ stage: "storyboard", storyboard: blocks.map((b, i) => ({ scene: i + 1, prompt: b.slice(0, 600), seconds: 8 })), updatedAt: new Date() }).where(eq(schema.videoProjects.id, id));
    } else if (op === "to_cost") await db.update(schema.videoProjects).set({ stage: "cost_review", updatedAt: new Date() }).where(eq(schema.videoProjects.id, id));
    else throw new Error("That step is locked until a video provider is verified.");
    await audit(await actorOf(u), `video.${op}`, { type: "video_project", id });
    revalidatePath("/admin/video");
    return { ok: true, message: "Saved." };
  } catch (e) { return { error: (e as Error).message }; }
}
