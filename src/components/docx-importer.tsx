"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFromImportAction, previewDocxAction } from "@/app/actions/studio";
import type { Scene } from "@/server/db/schema";

type Res = Awaited<ReturnType<typeof previewDocxAction>> | null;

export function DocxImporter() {
  const [res, action, pending] = useActionState<Res, FormData>(previewDocxAction, null);
  const router = useRouter();
  const [title, setTitle] = useState(""); const [ref, setRef] = useState(""); const [err, setErr] = useState(""); const [seen, setSeen] = useState<Res>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [saving, start] = useTransition();
  if (res?.ok && seen !== res) { setSeen(res); setTitle(res.preview.title); setScenes(res.preview.scenes); setRef(res.preview.scenes.find((s) => s.ref)?.ref ?? ""); }
  return (
    <div className="space-y-5">
      <form action={action} className="card card-pad space-y-3">
        <label className="label" htmlFor="docx">Word document (.docx, up to 8 MB)</label>
        <input id="docx" name="file" type="file" accept=".docx" required className="input" />
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Reading…" : "Preview import"}</button>
        {res && !res.ok && <p role="alert" className="alert alert-error">{res.error}</p>}
      </form>
      {res?.ok && (
        <div className="space-y-4">
          <div className="alert alert-info text-sm" role="status">Preview only: nothing is saved yet, and no existing story is ever overwritten. Found {res.preview.stats.headings} headings, {res.preview.stats.paragraphs} paragraphs, {res.preview.stats.lists} lists, {res.preview.stats.tables} tables, {res.preview.stats.images} images and {res.preview.stats.refs} Bible references.</div>
          {res.preview.warnings.length > 0 && <div className="alert alert-warn text-sm"><strong>Please check:</strong><ul className="mt-1 list-disc pl-5">{res.preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
          <div className="card card-pad grid gap-3 md:grid-cols-2"><div><label className="label" htmlFor="it">Story title</label><input id="it" className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div><div><label className="label" htmlFor="ir">Main Bible passage (required)</label><input id="ir" className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Genesis 6:9-22" /></div></div>
          <ol className="space-y-3">{scenes.map((s, k) => <li key={k} className="card card-pad"><label className="sr-only" htmlFor={`st${k}`}>Scene title</label><input id={`st${k}`} className="input font-bold" value={s.title} onChange={(e) => setScenes((a) => a.map((x, j) => (j === k ? { ...x, title: e.target.value } : x)))} />{s.assetId && /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/media/${s.assetId}`} alt={s.alt ?? ""} className="mt-2 max-h-40 rounded-lg" />}<label className="sr-only" htmlFor={`sx${k}`}>Scene text</label><textarea id={`sx${k}`} className="input mt-2" rows={4} value={s.text} onChange={(e) => setScenes((a) => a.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)))} />{s.ref && <p className="mt-1 text-xs text-mist">Bible reference detected: {s.ref}</p>}<button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setScenes((a) => a.filter((_, j) => j !== k))}>Remove this scene</button></li>)}</ol>
          <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn btn-gold" disabled={saving || !scenes.length} onClick={() => start(async () => { const r = await createFromImportAction(JSON.stringify(scenes), title, ref); if (r.ok && r.id) router.push(`/studio/${r.id}`); else setErr(r.error ?? "Could not save."); })}>{saving ? "Saving…" : "Create a new draft story"}</button>{err && <p role="alert" className="text-sm font-semibold text-danger">{err}</p>}</div>
        </div>
      )}
    </div>
  );
}
