"use client";
import { useActionState, useState, useTransition } from "react";
import { commitImportAction, previewImportAction } from "@/app/actions/teaching";
import type { ParsedQuestion } from "@/lib/question-import";

type Prev = Awaited<ReturnType<typeof previewImportAction>>;

export function QuestionImporter({ classes, admin }: { classes: { slug: string; name: string }[]; admin: boolean }) {
  const [prev, formAction, pending] = useActionState<Prev, FormData>(previewImportAction, null);
  const [list, setList] = useState<(ParsedQuestion & { include: boolean })[] | null>(null);
  const [shownFor, setShownFor] = useState<Prev>(null);
  const [cls, setCls] = useState(""); const [topic, setTopic] = useState(""); const [status, setStatus] = useState<"draft" | "review" | "published">("draft"); const [skip, setSkip] = useState(true);
  const [result, setResult] = useState<{ saved?: number; skipped?: number; rejected?: number; errors?: string[]; error?: string } | null>(null);
  const [saving, start] = useTransition();
  // adopt a fresh preview into editable state
  if (prev?.ok && prev.questions && shownFor !== prev) { setShownFor(prev); setList(prev.questions.map((q, i) => ({ ...q, include: !q.errors.length && !prev.duplicates?.includes(i) }))); setResult(null); }

  const update = (i: number, fn: (q: ParsedQuestion & { include: boolean }) => ParsedQuestion & { include: boolean }) => setList((l) => l && l.map((q, k) => { if (k !== i) return q; const n = fn(q); const errs: string[] = []; if (!n.text.trim()) errs.push("The question text is empty."); if (["mcq", "tf", "multi"].includes(n.type) && (n.options.filter((o) => o.text.trim()).length < 2 || !n.options.some((o) => o.correct && o.text.trim()))) errs.push("Needs at least two options and a correct answer."); return { ...n, errors: errs }; }));
  const chosen = list?.filter((q) => q.include && !q.errors.length) ?? [];

  return (
    <div className="space-y-5">
      <form action={formAction} className="card card-pad space-y-3">
        <div><label htmlFor="file" className="label">Choose a file (.docx, .xlsx, .csv or .txt)</label><input id="file" type="file" name="file" accept=".docx,.xlsx,.csv,.txt" required className="input" /></div>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Reading…" : "Preview import"}</button>
        {prev && !prev.ok && <p role="alert" className="alert alert-error">{prev.error}</p>}
      </form>
      {list && (
        <div className="space-y-4">
          <div className="alert alert-info text-sm" role="status">Found {list.length} questions: {list.filter((q) => !q.errors.length).length} ready, {list.filter((q) => q.errors.length).length} with problems. {prev?.duplicates?.length ? `${prev.duplicates.length} look like questions that already exist (they are unticked and will be skipped).` : ""} Nothing is saved until you press Import. Existing questions are never overwritten.</div>
          <div className="card card-pad grid gap-3 sm:grid-cols-4">
            <div><label className="label" htmlFor="icls">Default class</label><select id="icls" className="input" value={cls} onChange={(e) => setCls(e.target.value)}><option value="">Any</option>{classes.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
            <div><label className="label" htmlFor="itop">Default topic</label><input id="itop" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
            {admin && <div><label className="label" htmlFor="ist">Save as</label><select id="ist" className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="draft">Draft</option><option value="review">Under review</option><option value="published">Published</option></select></div>}
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="h-5 w-5" /> Skip duplicates</label>
          </div>
          <ol className="space-y-3">
            {list.map((q, i) => (
              <li key={i} className={`card card-pad ${q.errors.length ? "border-danger" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={q.include && !q.errors.length} disabled={!!q.errors.length} onChange={(e) => update(i, (x) => ({ ...x, include: e.target.checked }))} className="h-5 w-5" /> Line {q.line} · {q.type}{prev?.duplicates?.includes(i) && <span className="badge badge-warn">possible duplicate</span>}</label></div>
                <label className="sr-only" htmlFor={`qt${i}`}>Question text</label>
                <textarea id={`qt${i}`} className="input mt-2" rows={2} value={q.text} onChange={(e) => update(i, (x) => ({ ...x, text: e.target.value }))} />
                {q.options.length > 0 && <ul className="mt-2 space-y-1">{q.options.map((o, k) => <li key={k} className="flex items-center gap-2"><input type={q.type === "multi" ? "checkbox" : "radio"} name={`c${i}`} checked={o.correct} aria-label={`Option ${k + 1} is correct`} onChange={() => update(i, (x) => ({ ...x, options: x.options.map((oo, kk) => ({ ...oo, correct: x.type === "multi" ? (kk === k ? !oo.correct : oo.correct) : kk === k })) }))} /><input className="input !min-h-0 !py-1" value={o.text} aria-label={`Option ${k + 1} text`} onChange={(e) => update(i, (x) => ({ ...x, options: x.options.map((oo, kk) => (kk === k ? { ...oo, text: e.target.value } : oo)) }))} /></li>)}</ul>}
                {q.acceptedAnswers.length > 0 && <p className="mt-2 text-sm">Accepted answers: {q.acceptedAnswers.join(" | ")}</p>}
                {q.errors.map((e) => <p key={e} className="mt-1 text-sm font-semibold text-danger">⚠ {e}</p>)}
                {q.warnings.map((e) => <p key={e} className="mt-1 text-sm text-gold-700">• {e}</p>)}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-gold" disabled={!chosen.length || saving} onClick={() => start(async () => setResult(await commitImportAction(JSON.stringify(chosen.map(({ include, ...q }) => (void include, q))), { classLevelSlug: cls || undefined, topic: topic || undefined, status, skipDuplicates: skip, filename: prev?.filename })))}>{saving ? "Importing…" : `Import ${chosen.length} questions`}</button>
            {result && (result.error ? <p role="alert" className="alert alert-error">{result.error}</p> : <p role="status" className="alert alert-ok">Imported {result.saved}. Skipped {result.skipped}. Rejected {result.rejected}.{result.errors?.length ? ` ${result.errors.join(" ")}` : ""}</p>)}
          </div>
        </div>
      )}
      <details className="card card-pad text-sm"><summary className="cursor-pointer font-semibold">Format guide (including the ★ marker)</summary>
        <div className="mt-3 space-y-2">
          <p><strong>Word or text:</strong> number each question, letter the options, and put <code>★</code> before or after the correct option.</p>
          <pre className="overflow-x-auto rounded-lg bg-sand p-3">{`1. Who built the ark?
A. Moses
B. ★ Noah
C. Abraham
D. David
Explanation: Genesis 6:14
Ref: Genesis 6:14`}</pre>
          <p>You can also write <code>Answer: B</code>. More than one ★ makes a multiple-select question (you will be asked to check it). True/false questions use True and False as the options.</p>
          <p><strong>Excel or CSV:</strong> columns <code>Question, A, B, C, D, Correct, Explanation, Reference, Class, Topic, Difficulty, Tags</code>. <code>Correct</code> can be a letter (B) or the ★ can sit in the option cell. A row with no options and an answer becomes a fill-in-the-blank question.</p>
        </div></details>
    </div>
  );
}
