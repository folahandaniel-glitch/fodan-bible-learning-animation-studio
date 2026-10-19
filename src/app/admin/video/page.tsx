import { desc } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { Alert, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, Field, Select, TextArea } from "@/components/forms";
import { createVideoProjectAction, videoStageAction } from "@/app/actions/video";
import { InlineAction } from "@/components/forms";

export const metadata = { title: "Animation (optional)", robots: { index: false } };
const STEPS = ["Select story", "Edit script", "Approve script", "Storyboard", "Review scenes", "Cost estimate", "Confirm credits", "Generate scenes", "Assemble", "Review and approve", "Export"];

export default async function Video() {
  await requireAdmin("media.manage");
  const db = await getDb();
  const [projects, stories, ledger] = await Promise.all([db.select().from(schema.videoProjects).orderBy(desc(schema.videoProjects.createdAt)), db.select({ id: schema.stories.id, title: schema.stories.title }).from(schema.stories).orderBy(schema.stories.title), db.select().from(schema.creditLedger).orderBy(desc(schema.creditLedger.createdAt)).limit(10)]);
  const provider = !!process.env.VIDEO_PROVIDER_API_KEY;
  return (
    <div className="space-y-6">
      <PageHeader title="Animation studio (optional, paid add-on)" subtitle="The ordinary storybook, narration and Word import need none of this. AI video is not required and is not free." />
      <Alert tone="warn"><strong>Generation is switched off.</strong> {provider ? "A key is present but no provider integration is wired and verified, so nothing can be generated or charged." : "No video provider is configured, so nothing can be generated or charged."} You can plan a project (script, storyboard and cost estimate) now; the confirm-and-generate steps stay locked until a provider is verified for pricing, terms, availability and permitted use.</Alert>
      <ol className="flex flex-wrap gap-2 text-xs">{STEPS.map((s, i) => <li key={s} className="badge badge-info">{i + 1}. {s}</li>)}</ol>
      <section className="card card-pad max-w-2xl"><h2 className="mb-2 text-lg font-bold">Plan an animation</h2>
        <ActionForm action={createVideoProjectAction} submit="Create plan" submitClass="btn btn-gold"><Select label="Story" name="storyId" options={stories.map((s) => ({ value: s.id, label: s.title }))} /><Select label="Shape" name="aspect" options={[{ value: "16:9", label: "16:9 (widescreen)" }, { value: "9:16", label: "9:16 (phone, vertical)" }, { value: "1:1", label: "1:1 (square)" }]} /><Field label="Credits per scene (set by your provider's pricing)" name="rate" type="number" defaultValue={5} /></ActionForm><p className="hint mt-2">The script and storyboard are drafted from the story&apos;s own scenes. You review and approve each step.</p></section>
      {projects.map((p) => (
        <article key={p.id} className="card card-pad"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-sans text-base font-bold">{p.title}</h2><span className="flex gap-2"><StatusBadge status={p.stage === "done" ? "complete" : "draft"} /><span className="badge">{p.stage.replace("_", " ")}</span><span className="badge badge-info">{p.aspect}</span></span></div>
          <p className="mt-1 text-sm">Storyboard: {p.storyboard.length} scenes · estimated <strong>{p.estimatedCredits} credits</strong> (not charged).</p>
          <details className="mt-2"><summary className="cursor-pointer font-semibold text-royal">Script</summary><ActionForm action={videoStageAction} submit="Save script" submitClass="btn btn-ghost btn-sm" className="mt-2 space-y-2"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="op" value="script" /><TextArea label="Script" name="script" rows={8} defaultValue={p.script} /></ActionForm></details>
          <div className="mt-3 flex flex-wrap gap-2">{p.stage === "script" && <InlineAction action={videoStageAction} label="Approve script and build storyboard" className="btn btn-primary btn-sm" hidden={{ id: p.id, op: "approve_script" }} />}{p.stage === "storyboard" && <InlineAction action={videoStageAction} label="Approve storyboard and show cost" className="btn btn-primary btn-sm" hidden={{ id: p.id, op: "to_cost" }} />}{p.stage === "cost_review" && <span className="badge badge-warn">Confirming credits is locked: no verified provider.</span>}</div></article>
      ))}
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Credit ledger</h2>{ledger.length ? <ul className="text-sm">{ledger.map((l) => <li key={l.id}>{l.createdAt.toLocaleDateString()} · {l.kind} · {l.credits} · {l.note}</li>)}</ul> : <p className="text-sm text-mist">No credits have been granted, reserved or charged. Charges and refunds will be recorded here with a unique key so a retry can never bill twice.</p>}</section>
    </div>
  );
}
