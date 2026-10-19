import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/guards";
import { GAME_CATALOG } from "@/content/site";
import { getGameView, leaderboard } from "@/server/services/games";
import { ActionForm } from "@/components/forms";
import { startGameAction } from "@/app/actions/exam";
import { GameRunner } from "@/components/game-runner";
import { Crumbs } from "@/components/ui";

export const metadata = { title: "Play" };

export default async function Game({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ s?: string }> }) {
  const { key } = await params;
  const sp = await searchParams;
  const user = await requireUser(["student"]);
  const def = GAME_CATALOG.find((g) => g.key === key);
  if (!def) notFound();
  if (sp.s) {
    const v = await getGameView(user.id, sp.s);
    if (!v || v.key !== key) notFound();
    return <GameRunner sessionId={v.id} name={def.name} items={v.items} startScore={v.score} timedSeconds={key === "timed-revision" ? 120 : undefined} />;
  }
  const board = await leaderboard(key, user.orgId);
  return (
    <div className="max-w-2xl space-y-5">
      <Crumbs items={[{ href: "/student/games", label: "Games" }, { label: def.name }]} />
      <section className="card card-pad"><h1 className="text-3xl font-bold">{def.name}</h1><p className="mt-2">{def.blurb}</p><p className="mt-2 text-sm"><strong>Learning goal:</strong> {def.objective}</p>
        <ActionForm action={startGameAction.bind(null, key)} submit="▶ Play" submitClass="btn btn-gold mt-4" className=""><span /></ActionForm></section>
      <section className="card card-pad"><h2 className="text-lg font-bold">Top scores this month</h2><p className="text-xs text-mist">Friendly nicknames only{user.orgId ? ", in your own church or school" : ""}.</p>{board.length ? <ol className="mt-2 space-y-1">{board.map((b, k) => <li key={b.alias} className="flex justify-between text-sm"><span>{k + 1}. {b.alias}</span><strong>{b.best}</strong></li>)}</ol> : <p className="mt-2 text-sm text-mist">No scores yet. Be the first!</p>}</section>
      <Link href="/student/games" className="btn btn-ghost">All games</Link>
    </div>
  );
}
