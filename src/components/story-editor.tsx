"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { autosaveAction, uploadSceneImageAction } from "@/app/actions/studio";
import { SceneArt } from "./scene-art";
import { Narration } from "./story-reader";
import type { Scene } from "@/server/db/schema";

interface Props { id: string; initial: { title: string; subtitle: string; summary: string; passageRef: string; memoryVerseRef: string; discussion: string[]; scenes: Scene[]; status: string }; canPublishNote: boolean }
const ARTS = ["dawn:hills:sun", "day:hills:sun,tree", "night:hills:stars", "storm:sea:boat,wave", "day:desert:tent,palm", "day:city:temple", "dawn:garden:tree", "dusk:hills:cross", "dawn:garden:tomb,sun", "day:hills:bread,fish", "night:hills:star,manger", "day:hills:book"];

export function StoryEditor({ id, initial, canPublishNote }: Props) {
  const [d, setD] = useState(initial);
  const [i, setI] = useState(0);
  const [state, setState] = useState<"saved" | "saving" | "error">("saved");
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => start(async () => {
      const r = await autosaveAction(id, { title: d.title, subtitle: d.subtitle, summary: d.summary, passageRef: d.passageRef, memoryVerseRef: d.memoryVerseRef, discussion: d.discussion, scenes: d.scenes });
      setState(r.ok ? "saved" : "error"); setMsg(r.error ?? "");
    }), 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [d, id]);

  const sc = d.scenes[i] ?? d.scenes[0];
  const upd = (patch: Partial<Scene>) => setD((p) => ({ ...p, scenes: p.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
  const move = (dir: number) => setD((p) => { const a = [...p.scenes]; const j = i + dir; if (j < 0 || j >= a.length) return p; [a[i], a[j]] = [a[j], a[i]]; setI(j); return { ...p, scenes: a }; });
  const addScene = () => { setD((p) => ({ ...p, scenes: [...p.scenes.slice(0, i + 1), { title: `Scene ${p.scenes.length + 1}`, text: "", art: sc?.art }, ...p.scenes.slice(i + 1)] })); setI(i + 1); };
  const del = () => { if (d.scenes.length < 2 || !window.confirm("Delete this scene?")) return; setD((p) => ({ ...p, scenes: p.scenes.filter((_, k) => k !== i) })); setI(Math.max(0, i - 1)); };
  const insertQuote = (kind: Scene["kind"]) => upd({ kind });
  const [upMsg, setUpMsg] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
        <span className={`badge ${state === "saved" ? "badge-ok" : state === "saving" ? "badge-warn" : "badge-bad"}`}>{state === "saved" ? "All changes saved" : state === "saving" ? "Saving…" : `Not saved: ${msg}`}</span>
      </div>
      <div className="card card-pad grid gap-3 md:grid-cols-2">
        <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></div>
        <div><label className="label" htmlFor="st">Subtitle</label><input id="st" className="input" value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} /></div>
        <div><label className="label" htmlFor="pr">Main Bible passage</label><input id="pr" className="input" value={d.passageRef} onChange={(e) => setD({ ...d, passageRef: e.target.value })} /></div>
        <div><label className="label" htmlFor="mv">Memory verse reference</label><input id="mv" className="input" value={d.memoryVerseRef} onChange={(e) => setD({ ...d, memoryVerseRef: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="su">Summary</label><textarea id="su" className="input" rows={2} value={d.summary} onChange={(e) => setD({ ...d, summary: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="dq">Discussion questions (one per line)</label><textarea id="dq" className="input" rows={3} value={d.discussion.join("\n")} onChange={(e) => setD({ ...d, discussion: e.target.value.split("\n") })} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Scenes" className="card card-pad">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-mist">Scenes</h2>
          <ol className="space-y-1">{d.scenes.map((s, k) => <li key={k}><button type="button" onClick={() => setI(k)} aria-current={k === i ? "step" : undefined} className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-sm font-semibold ${k === i ? "bg-navy text-white" : "bg-sand text-navy"}`}>{k + 1}. {s.title || "Untitled"}</button></li>)}</ol>
          <div className="mt-3 flex flex-wrap gap-1"><button type="button" className="btn btn-ghost btn-sm" onClick={addScene}>＋ Add</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(-1)} disabled={i === 0}>↑</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(1)} disabled={i >= d.scenes.length - 1}>↓</button><button type="button" className="btn btn-ghost btn-sm" onClick={del} disabled={d.scenes.length < 2}>Delete</button></div>
        </nav>
        {sc && (
          <section className="space-y-3">
            <div className="card card-pad space-y-3">
              <div className="overflow-hidden rounded-xl">{sc.assetId ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/media/${sc.assetId}`} alt={sc.alt ?? ""} className="aspect-[2/1] w-full object-cover" /> : <SceneArt art={sc.art} className="aspect-[2/1] w-full" label="Scene illustration" />}</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div><label className="label" htmlFor="sct">Scene title</label><input id="sct" className="input" value={sc.title} onChange={(e) => upd({ title: e.target.value })} /></div>
                <div><label className="label" htmlFor="scr">Bible reference for this scene</label><input id="scr" className="input" value={sc.ref ?? ""} onChange={(e) => upd({ ref: e.target.value })} placeholder="Genesis 6:13-22" /></div>
              </div>
              <div><label className="label" htmlFor="sctx">Text (narration, dialogue or Scripture quotation)</label>
                <div className="mb-1 flex gap-1" role="group" aria-label="Kind of text">{(["narration", "dialogue", "scripture"] as const).map((k) => <button key={k} type="button" aria-pressed={sc.kind === k} className={`btn btn-sm ${sc.kind === k ? "btn-navy" : "btn-ghost"}`} onClick={() => insertQuote(k)}>{k}</button>)}</div>
                <textarea id="sctx" className="input" rows={7} value={sc.text} onChange={(e) => upd({ text: e.target.value })} />
                <p className="hint">Do not type Scripture from memory. Put the reference above and readers see the exact text from the Bible. Lists: start lines with a dash.</p></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div><label className="label" htmlFor="sca">Illustration style (built-in artwork)</label><select id="sca" className="input" value={sc.art ?? ""} onChange={(e) => upd({ art: e.target.value })}>{ARTS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
                <div><label className="label" htmlFor="scc">Caption</label><input id="scc" className="input" value={sc.caption ?? ""} onChange={(e) => upd({ caption: e.target.value })} /></div>
              </div>
            </div>
            <form className="card card-pad space-y-2" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setUpMsg("Uploading…"); const r = await uploadSceneImageAction(null, f); if (r.ok && r.id) { upd({ assetId: r.id, alt: String(f.get("alt")), caption: sc.caption || String(f.get("caption") ?? "") }); setUpMsg("Image added to this scene."); (e.target as HTMLFormElement).reset(); } else setUpMsg(r.error ?? "Failed."); }}>
              <h3 className="font-bold">Use your own authorised image</h3>
              <input type="file" name="file" accept="image/*" required className="input" aria-label="Image file" />
              <div className="grid gap-2 md:grid-cols-2"><input name="alt" className="input" placeholder="Alt text (describe the image) *" required /><input name="licence" className="input" placeholder="Licence or permission * (for example: own work, CC BY 4.0)" required /><input name="creator" className="input" placeholder="Creator" /><input name="sourceUrl" className="input" placeholder="Source link (if any)" /><input name="attribution" className="input" placeholder="Attribution text required by the licence" /><input name="permittedUse" className="input" placeholder="Permitted use" /></div>
              <div className="flex flex-wrap items-center gap-2"><button className="btn btn-primary btn-sm" type="submit">Upload and use</button>{sc.assetId && <button type="button" className="btn btn-ghost btn-sm" onClick={() => upd({ assetId: undefined })}>Remove image (use artwork)</button>}<span role="status" className="text-sm text-mist">{upMsg}</span></div>
              <p className="hint">Do not use images from the internet unless the licence allows it. Record where each image came from.</p>
            </form>
          </section>
        )}
      </div>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Listen to the whole story</h2><Narration sections={d.scenes.map((s) => ({ title: s.title, text: s.text }))} current={i} onSection={setI} /></section>
      {canPublishNote && <p className="text-xs text-mist">Only a reviewer can approve and publish. Submit for review when you are ready.</p>}
    </div>
  );
}
