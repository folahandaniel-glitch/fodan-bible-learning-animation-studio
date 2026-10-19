"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SceneArt } from "./scene-art";

export interface ReaderScene { title: string; text: string; art?: string; assetId?: string; alt?: string; caption?: string; ref?: string; scripture?: ReactNode }

/** Browser text-to-speech. Voices depend on the device and browser; this does not produce a downloadable audio file. */
export function Narration({ sections, onSection, current }: { sections: { title: string; text: string }[]; onSection?: (i: number) => void; current: number }) {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(0.95);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const auto = useRef(false);
  const idx = useRef(current);
  idx.current = current;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setSupported(false); return; }
    const load = () => { const v = window.speechSynthesis.getVoices(); setVoices(v); if (v.length && !voiceURI) { const en = v.find((x) => x.lang.startsWith("en") && x.localService) ?? v.find((x) => x.lang.startsWith("en")) ?? v[0]; setVoiceURI(en.voiceURI); } };
    load(); window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", load); window.speechSynthesis.cancel(); };
  }, [voiceURI]);

  const speak = useCallback((i: number) => {
    const s = sections[i]; if (!s) { setState("idle"); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${s.title}. ${s.text}`);
    const v = voices.find((x) => x.voiceURI === voiceURI); if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = rate;
    u.onend = () => { if (auto.current && i + 1 < sections.length) { onSection?.(i + 1); speak(i + 1); } else { setState("idle"); auto.current = false; } };
    u.onerror = () => setState("idle");
    setState("playing"); window.speechSynthesis.speak(u);
  }, [sections, voices, voiceURI, rate, onSection]);

  if (!supported) return <p className="text-sm text-mist">Narration is not available in this browser. Try Chrome, Edge or Safari. The available voices depend on your device.</p>;
  return (
    <div className="rounded-xl border border-line bg-white p-3 text-sm" role="group" aria-label="Narration controls">
      <div className="flex flex-wrap items-center gap-2">
        {state !== "playing" ? <button type="button" className="btn btn-primary btn-sm" onClick={() => { if (state === "paused") { window.speechSynthesis.resume(); setState("playing"); } else { auto.current = true; speak(idx.current); } }}>{state === "paused" ? "Resume" : "▶ Listen"}</button>
          : <button type="button" className="btn btn-gold btn-sm" onClick={() => { window.speechSynthesis.pause(); setState("paused"); }}>⏸ Pause</button>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { auto.current = false; window.speechSynthesis.cancel(); setState("idle"); }}>⏹ Stop</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={current === 0} onClick={() => { onSection?.(current - 1); if (state !== "idle") speak(current - 1); }}>◀ Previous part</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={current >= sections.length - 1} onClick={() => { onSection?.(current + 1); if (state !== "idle") speak(current + 1); }}>Next part ▶</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">Voice
          <select className="input !min-h-0 !py-1 !text-sm" value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} aria-label="Narration voice">{voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select>
        </label>
        <label className="flex items-center gap-2">Speed
          <input type="range" min="0.6" max="1.4" step="0.05" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Speaking speed" /> <span>{rate.toFixed(2)}×</span>
        </label>
      </div>
      <p className="mt-2 text-xs text-mist">Voices depend on your device and browser. Narration plays in the browser only; it cannot be downloaded as an audio file.</p>
    </div>
  );
}

export function StoryReader({ scenes, title }: { scenes: ReaderScene[]; title: string }) {
  const [i, setI] = useState(0);
  const sc = scenes[i];
  const go = useCallback((n: number) => setI(Math.max(0, Math.min(scenes.length - 1, n))), [scenes.length]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [i, go]);
  if (!sc) return null;
  return (
    <section aria-label={`Storybook: ${title}`} className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="aspect-[2/1] w-full bg-sand">
          {sc.assetId
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={`/api/media/${sc.assetId}`} alt={sc.alt ?? ""} className="h-full w-full object-cover" loading="lazy" />
            : <SceneArt art={sc.art} className="h-full w-full" label={`Illustration for ${sc.title}`} />}
        </div>
        <div className="p-5 sm:p-7" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-700">Page {i + 1} of {scenes.length}</p>
          <h2 className="mt-1 text-2xl font-bold">{sc.title}</h2>
          <p className="mt-3 whitespace-pre-line text-lg leading-relaxed" style={{ fontSize: "clamp(1.05rem, 1.6vw, 1.3rem)" }}>{sc.text}</p>
          {sc.caption && <p className="mt-2 text-sm italic text-mist">{sc.caption}</p>}
          {sc.ref && sc.scripture && (
            <details className="mt-4"><summary className="cursor-pointer font-semibold text-royal">Read it in the Bible: {sc.ref}</summary><div className="mt-2">{sc.scripture}</div></details>
          )}
          {sc.ref && !sc.scripture && <p className="mt-3 text-sm text-mist">Bible passage: {sc.ref}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn btn-ghost" onClick={() => go(i - 1)} disabled={i === 0}>◀ Previous</button>
        <div className="flex gap-1.5" role="tablist" aria-label="Pages">{scenes.map((_, k) => <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Go to page ${k + 1}`} onClick={() => go(k)} className={`h-2.5 rounded-full transition-all ${k === i ? "w-6 bg-royal" : "w-2.5 bg-[#cfc7ac]"}`} />)}</div>
        <button type="button" className="btn btn-primary" onClick={() => go(i + 1)} disabled={i === scenes.length - 1}>Next ▶</button>
      </div>
      <Narration sections={scenes.map((s) => ({ title: s.title, text: s.text }))} current={i} onSection={go} />
    </section>
  );
}
