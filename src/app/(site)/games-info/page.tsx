import type { Metadata } from "next";
import Link from "next/link";
import { GAME_CATALOG } from "@/content/site";
import { SitePageHeader } from "@/components/site-page-header";

export const metadata: Metadata = { title: "Bible games and trivia" };

export default function GamesInfo() {
  return (
    <div className="container-page max-w-4xl py-10">
      <SitePageHeader id="games" />
      <ul className="grid gap-3 sm:grid-cols-2">{GAME_CATALOG.map((g) => <li key={g.key} className="card card-pad"><h2 className="text-lg font-bold">{g.name}</h2><p className="text-sm">{g.blurb}</p><p className="mt-1 text-xs text-mist"><strong>Goal:</strong> {g.objective}</p></li>)}</ul>
      <p className="mt-6 flex gap-3"><Link className="btn btn-gold" href="/register/student">Register</Link><Link className="btn btn-ghost" href="/plans">Plans</Link></p>
    </div>
  );
}
