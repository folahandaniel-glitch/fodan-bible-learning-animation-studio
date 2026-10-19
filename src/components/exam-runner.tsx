"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveAnswerAction, submitExamAction } from "@/app/actions/exam";

export interface RunnerQuestion { id: string; type: string; text: string; options: { id: string; text: string }[]; imageAssetId: string | null; answer: string | string[] | null; flagged: boolean; marks: number }

const fmt = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

export function ExamRunner({ attemptId, title, questions, remainingMs }: { attemptId: string; title: string; questions: RunnerQuestion[]; remainingMs: number }) {
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, string | string[] | null>>(() => Object.fromEntries(questions.map((q) => [q.id, q.answer])));
  const [flag, setFlag] = useState<Record<string, boolean>>(() => Object.fromEntries(questions.map((q) => [q.id, q.flagged])));
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [left, setLeft] = useState(remainingMs);
  const [submitting, setSubmitting] = useState(false);
  const end = useRef(Date.now() + remainingMs);
  const pending = useRef(new Map<string, { a: string | string[] | null; f: boolean }>());
  const q = questions[i];
  const doSubmit = useCallback(async () => { if (submitting) return; setSubmitting(true); await flushAll(); await submitExamAction(attemptId); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, submitting]);

  async function flushOne(qid: string, a: string | string[] | null, f: boolean) {
    setSaving("saving");
    try {
      const r = await saveAnswerAction(attemptId, qid, a, f);
      if (r.expired) { await submitExamAction(attemptId); return; }
      pending.current.delete(qid); setSaving("saved");
    } catch { pending.current.set(qid, { a, f }); setSaving("offline"); }
  }
  async function flushAll() { for (const [qid, v] of [...pending.current]) await flushOne(qid, v.a, v.f); }
  const save = (qid: string, a: string | string[] | null, f: boolean) => { pending.current.set(qid, { a, f }); void flushOne(qid, a, f); };

  useEffect(() => {
    const t = setInterval(() => { const ms = end.current - Date.now(); setLeft(ms); if (ms <= 0) { clearInterval(t); void doSubmit(); } }, 500);
    return () => clearInterval(t);
  }, [doSubmit]);
  // Retry anything that failed while the connection was down.
  useEffect(() => { const t = setInterval(() => { if (pending.current.size) void flushAll(); }, 5000); return () => clearInterval(t); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (pending.current.size) { e.preventDefault(); } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, []);

  const answered = (id: string) => { const a = ans[id]; return Array.isArray(a) ? a.length > 0 : !!a; };
  const nAns = questions.filter((x) => answered(x.id)).length;
  const low = left < 60_000;

  const choose = (opt: string) => {
    let next: string | string[];
    if (q.type === "multi") { const cur = Array.isArray(ans[q.id]) ? (ans[q.id] as string[]) : []; next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]; }
    else next = opt;
    setAns((p) => ({ ...p, [q.id]: next })); save(q.id, next, flag[q.id] ?? false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="sticky top-[57px] z-30 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-2 sm:mx-0 sm:rounded-xl sm:border">
        <div><h1 className="text-lg font-bold">{title}</h1><p className="text-xs text-mist" aria-live="polite">{nAns} of {questions.length} answered · {saving === "saving" ? "Saving…" : saving === "saved" ? "All answers saved" : saving === "offline" ? "Offline: will retry" : "Answers save automatically"}</p></div>
        <div role="timer" aria-label="Time remaining" className={`rounded-xl px-4 py-2 font-mono text-2xl font-bold ${low ? "bg-[#fde3e0] text-danger" : "bg-sand text-navy"}`}>{fmt(left)}</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <section className="card card-pad" aria-labelledby="q-h">
          <p className="text-sm font-semibold text-mist">Question {i + 1} of {questions.length} · {q.marks} {q.marks === 1 ? "mark" : "marks"}{q.type === "multi" ? " · choose all that apply" : ""}</p>
          <h2 id="q-h" className="mt-1 text-xl font-bold !font-sans">{q.text}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {q.imageAssetId && <img src={`/api/media/${q.imageAssetId}`} alt="" className="mt-3 max-h-64 rounded-xl" />}
          <div className="mt-4 space-y-2">
            {(q.type === "mcq" || q.type === "tf" || q.type === "multi") && (
              <fieldset><legend className="sr-only">Answer options</legend>
                {q.options.map((o) => {
                  const on = Array.isArray(ans[q.id]) ? (ans[q.id] as string[]).includes(o.id) : ans[q.id] === o.id;
                  return (
                    <label key={o.id} className={`mb-2 flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${on ? "border-royal bg-[#eef3ff]" : "border-line bg-white hover:bg-sand"}`}>
                      <input type={q.type === "multi" ? "checkbox" : "radio"} name={`q-${q.id}`} checked={on} onChange={() => choose(o.id)} className="h-5 w-5 accent-[var(--color-royal)]" />
                      <span className="text-base">{o.text}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}
            {(q.type === "fill" || q.type === "short") && <div><label htmlFor="ans" className="label">Your answer</label><input id="ans" className="input" maxLength={400} value={typeof ans[q.id] === "string" ? (ans[q.id] as string) : ""} onChange={(e) => setAns((p) => ({ ...p, [q.id]: e.target.value }))} onBlur={(e) => save(q.id, e.target.value, flag[q.id] ?? false)} autoComplete="off" /></div>}
            {q.type === "essay" && <div><label htmlFor="ans" className="label">Your answer</label><textarea id="ans" className="input min-h-40" maxLength={8000} value={typeof ans[q.id] === "string" ? (ans[q.id] as string) : ""} onChange={(e) => setAns((p) => ({ ...p, [q.id]: e.target.value }))} onBlur={(e) => save(q.id, e.target.value, flag[q.id] ?? false)} /><p className="hint">A teacher will mark this answer.</p></div>}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>◀ Previous</button>
            <button type="button" aria-pressed={flag[q.id]} className={`btn btn-sm ${flag[q.id] ? "btn-gold" : "btn-ghost"}`} onClick={() => { const f = !flag[q.id]; setFlag((p) => ({ ...p, [q.id]: f })); save(q.id, ans[q.id] ?? null, f); }}>{flag[q.id] ? "⚑ Marked for review" : "⚐ Mark for review"}</button>
            {i < questions.length - 1 ? <button type="button" className="btn btn-primary" onClick={() => setI(i + 1)}>Next ▶</button> : <button type="button" className="btn btn-gold" onClick={() => { if (window.confirm(`Submit your answers now? You have answered ${nAns} of ${questions.length} questions.`)) void doSubmit(); }} disabled={submitting}>Submit exam</button>}
          </div>
        </section>
        <aside className="card card-pad h-fit" aria-label="Question navigator">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-mist">Questions</h2>
          <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">{questions.map((x, k) => <button key={x.id} type="button" onClick={() => setI(k)} aria-label={`Question ${k + 1}${answered(x.id) ? ", answered" : ", not answered"}${flag[x.id] ? ", marked for review" : ""}`} aria-current={k === i ? "step" : undefined} className={`h-9 rounded-lg text-sm font-bold ${k === i ? "ring-2 ring-royal" : ""} ${flag[x.id] ? "bg-gold text-navy" : answered(x.id) ? "bg-leaf text-white" : "bg-sand text-navy"}`}>{k + 1}</button>)}</div>
          <p className="mt-3 text-xs text-mist"><span className="inline-block h-3 w-3 rounded bg-leaf align-middle" /> answered · <span className="inline-block h-3 w-3 rounded bg-gold align-middle" /> review · <span className="inline-block h-3 w-3 rounded bg-sand align-middle" /> not yet</p>
          <button type="button" className="btn btn-navy mt-4 w-full" disabled={submitting} onClick={() => { if (window.confirm(`Submit now? ${questions.length - nAns} questions are unanswered.`)) void doSubmit(); }}>Submit exam</button>
        </aside>
      </div>
    </div>
  );
}
