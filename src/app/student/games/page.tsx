import Link from "next/link";
import { requireUser } from "@/server/guards";
import { GAME_CATALOG } from "@/content/site";
import { myGameStats } from "@/server/services/games";
import { getEntitlement, hasFeature } from "@/server/services/entitlements";
import { PageHeader } from "@/components/ui";
import { SceneArt } from "@/components/scene-art";

export const metadata = { title: "Bible games" };
const ART = ["day:hills:book", "dusk:city:scroll", "dawn:hills:sun,star", "night:hills:stars", "day:garden:tree", "dawn:sea:boat"];

export default async function Games() {
  const user = await requireUser(["student"]);
  const [stats, ent] = await Promise.all([myGameStats(user.id), getEntitlement(user.id)]);
  const open = hasFeature(ent, "games");
  return (
    <div>
      <PageHeader title="Bible games" subtitle="Learn while you play. Scores use your friendly nickname, never your full name." />
      {!open && <div className="alert alert-warn mb-6">Games open when your plan is active. <Link href="/plans" className="font-bold">See plans</Link>.</div>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_CATALOG.map((g, i) => {
          const st = stats.find((s) => s.gameKey === g.key);
          return (
            <li key={g.key}><Link href={`/student/games/${g.key}`} className="card card-hover block h-full overflow-hidden no-underline"><SceneArt art={ART[i % ART.length]} className="aspect-[3/1] w-full" /><div className="p-4"><h2 className="text-lg font-bold">{g.name}</h2><p className="text-sm text-mist">{g.blurb}</p><p className="mt-1 text-xs"><strong>Learning goal:</strong> {g.objective}</p>{st && <p className="mt-2 text-xs"><span className="badge badge-ok">Best {st.best}</span> <span className="badge">{st.plays} plays</span></p>}</div></Link></li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-mist">Team quizzes and teacher-led classroom competitions are planned but not available yet.</p>
    </div>
  );
}
