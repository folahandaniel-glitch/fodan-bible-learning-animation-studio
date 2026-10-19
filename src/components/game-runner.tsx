"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { answerGameAction } from "@/app/actions/exam";
import type { PublicItem } from "@/server/services/games";

interface Result { correct: boolean; explanation: string; ref?: string; correctAnswer: string | string[]; points: number; score: number; finished: boolean }

export function GameRunner({ sessionId, name, items, startScore, timedSeconds }: { sessionId: string; name: string; items: PublicItem[]; startScore: number; timedSeconds?: number }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(startScore);
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [order, setOrder] = useState<string[]>(() => (items[0]?.kind === "order" ? items[0].items.map((x) => x.id) : []));
  const [left, setLeft] = useState(timedSeconds ?? 0);
  const [right, setRight] = useState(0);
  const it = items[i];

  useEffect(() => {
    if (!timedSeconds || done) return;
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { clearInterval(t); setDone(true); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, [timedSeconds, done]);

  async function submit(answer: string | string[]) {
    setBusy(true);
    const r = await answerGameAction(sessionId, i, answer);
    setBusy(false);
    if ("error" in r) { setRes(null); return; }
    setRes(r); setScore(r.score); if (r.correct) setRight((x) => x + 1);
  }
  function next() {
    if (!res) return;
    if (i + 1 >= items.length || res.finished) { setDone(true); return; }
    const n = items[i + 1]; setI(i + 1); setRes(null); setOrder(n.kind === "order" ? n.items.map((x) => x.id) : []);
  }
  const move = (idx: number, d: number) => setOrder((o) => { const a = [...o]; const j = idx + d; if (j < 0 || j >= a.length) return a; [a[idx], a[j]] = [a[j], a[idx]]; return a; });

  if (done || !it) {
    const total = items.length;
    return (
      <div className="card card-pad mx-auto max-w-lg text-center">
        <h2 className="text-3xl font-bold">{right === total ? "Perfect! 🎉" : right >= total / 2 ? "Well done! 🌟" : "Good effort! Keep practising 💪"}</h2>
        <p className="mt-2 text-lg">You got <strong>{right}</strong> of {total} right and scored <strong>{score}</strong> points.</p>
        <div className="mt-5 flex justify-center gap-3"><Link className="btn btn-primary" href="/student/games">More games</Link><Link className="btn btn-gold" href="/student">My dashboard</Link></div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-sm"><span className="font-semibold text-navy">{name} · {i + 1} of {items.length}</span><span className="flex gap-3">{timedSeconds ? <span role="timer" className="badge badge-warn">⏱ {left}s</span> : null}<span className="badge badge-ok">Score {score}</span></span></div>
      <div className="progress mb-4"><span style={{ width: `${(i / items.length) * 100}%` }} /></div>
      <section className="card card-pad" aria-live="polite">
        <h2 className="text-xl font-bold !font-sans">{it.prompt}</h2>
        {"sub" in it && it.sub && <blockquote className="scripture mt-3">{it.sub}</blockquote>}
        {it.kind === "choice" ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {it.options.map((o) => {
              const picked = res && res.correctAnswer === o.id;
              return <li key={o.id}><button type="button" disabled={busy || !!res} onClick={() => submit(o.id)} className={`btn w-full justify-start text-left ${picked ? "btn-primary" : "btn-ghost"} ${res && !picked ? "opacity-60" : ""}`}>{o.text}{picked && " ✓"}</button></li>;
            })}
          </ul>
        ) : (
          <div className="mt-4">
            <ol className="space-y-2">{order.map((id, k) => <li key={id} className="flex items-center gap-2 rounded-xl border-2 border-line bg-white p-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-navy text-sm font-bold text-white">{k + 1}</span><span className="flex-1">{it.items.find((x) => x.id === id)?.text}</span><button type="button" className="btn btn-ghost btn-sm" aria-label={`Move ${it.items.find((x) => x.id === id)?.text} up`} disabled={!!res || k === 0} onClick={() => move(k, -1)}>↑</button><button type="button" className="btn btn-ghost btn-sm" aria-label={`Move ${it.items.find((x) => x.id === id)?.text} down`} disabled={!!res || k === order.length - 1} onClick={() => move(k, 1)}>↓</button></li>)}</ol>
            {!res && <button type="button" className="btn btn-primary mt-3" disabled={busy} onClick={() => submit(order)}>Check my order</button>}
          </div>
        )}
        {res && (
          <div className={`alert mt-4 ${res.correct ? "alert-ok" : "alert-warn"}`} role="status">
            <p className="font-bold">{res.correct ? `Correct! +${res.points} points` : "Not quite. Here is the answer:"}</p>
            <p className="text-sm">{res.explanation}{res.ref ? ` (${res.ref})` : ""}</p>
            <button type="button" className="btn btn-primary btn-sm mt-3" onClick={next}>{i + 1 >= items.length ? "See my score" : "Next ▶"}</button>
          </div>
        )}
      </section>
    </div>
  );
}
