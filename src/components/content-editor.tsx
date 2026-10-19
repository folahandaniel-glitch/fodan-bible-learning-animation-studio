"use client";
import { useState } from "react";
import { ActionForm } from "./forms";
import { saveSectionAction } from "@/app/actions/content";

type J = string | number | boolean | null | J[] | { [k: string]: J };
const LONG = /body|text|description|subheading|transcript|answer|note|intro|about/i;
const label = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

function Node({ k, v, set, depth = 0 }: { k: string; v: J; set: (v: J) => void; depth?: number }) {
  if (typeof v === "string") {
    const long = LONG.test(k) || v.length > 80 || v.includes("\n");
    return <div><label className="label">{label(k)}</label>{long ? <textarea className="input" rows={Math.min(10, Math.max(3, Math.ceil(v.length / 70)))} value={v} onChange={(e) => set(e.target.value)} /> : <input className="input" value={v} onChange={(e) => set(e.target.value)} />}</div>;
  }
  if (typeof v === "number") return <div><label className="label">{label(k)}</label><input type="number" className="input" value={v} onChange={(e) => set(Number(e.target.value))} /></div>;
  if (typeof v === "boolean") return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="h-5 w-5" />{label(k)}</label>;
  if (Array.isArray(v)) {
    const allStr = v.every((x) => typeof x === "string");
    if (allStr) return <div><label className="label">{label(k)} <span className="font-normal text-mist">(one per line)</span></label><textarea className="input" rows={Math.max(3, v.length + 1)} value={(v as string[]).join("\n")} onChange={(e) => set(e.target.value.split("\n"))} onBlur={(e) => set(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} /></div>;
    return (
      <fieldset className="rounded-xl border border-line p-3"><legend className="px-2 text-sm font-bold">{label(k)}</legend>
        {v.map((item, i) => (
          <div key={i} className="mb-3 rounded-lg bg-sand p-3">
            <Node k={`${label(k)} ${i + 1}`} v={item} set={(nv) => set(v.map((x, j) => (j === i ? nv : x)))} depth={depth + 1} />
            <div className="mt-2 flex gap-2"><button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => { const a = [...v]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set(a); }}>↑</button><button type="button" className="btn btn-ghost btn-sm" disabled={i === v.length - 1} onClick={() => { const a = [...v]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set(a); }}>↓</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => set(v.filter((_, j) => j !== i))}>Remove</button></div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const proto = v[v.length - 1]; set([...v, proto && typeof proto === "object" && !Array.isArray(proto) ? Object.fromEntries(Object.keys(proto).map((kk) => [kk, ""])) : ""]); }}>Add another</button>
      </fieldset>
    );
  }
  if (v && typeof v === "object") {
    return <fieldset className={depth ? "" : "space-y-3"}>{depth > 0 ? null : null}<div className="space-y-3">{Object.entries(v).map(([kk, vv]) => <Node key={kk} k={kk} v={vv} set={(nv) => set({ ...v, [kk]: nv })} depth={depth + 1} />)}</div></fieldset>;
  }
  return null;
}

export function SectionEditor({ sectionId, pageId, initial, audience }: { sectionId: string; pageId: string; initial: Record<string, J>; audience: string }) {
  const [data, setData] = useState<J>(initial);
  const [aud, setAud] = useState(audience);
  return (
    <ActionForm action={saveSectionAction.bind(null, sectionId, pageId)} submit="Save draft" submitClass="btn btn-primary btn-sm">
      <input type="hidden" name="content" value={JSON.stringify(data)} />
      <input type="hidden" name="audience" value={aud} />
      <Node k="content" v={data} set={setData} />
      <div><label className="label" htmlFor={`aud-${sectionId}`}>Who sees this section</label>
        <select id={`aud-${sectionId}`} className="input !w-auto" value={aud} onChange={(e) => setAud(e.target.value)}><option value="all">Everyone</option><option value="guests">Visitors who are not signed in</option><option value="members">Signed-in users</option><option value="students">Students</option><option value="parents">Parents</option><option value="teachers">Teachers</option></select></div>
      <p className="hint">Image sections need the file ID of an uploaded image (Branding and logos shows uploaded files). Video sections accept YouTube or Vimeo links only.</p>
    </ActionForm>
  );
}
