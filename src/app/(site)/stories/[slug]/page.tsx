import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoryForViewer } from "@/server/services/content";
import { optionalUser } from "@/server/guards";
import { StoryReader } from "@/components/story-reader";
import { BibleText } from "@/components/bible-text";
import { ReviewNotice, Crumbs } from "@/components/ui";
import { isTranslation } from "@/lib/bible";
import { getDb, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { SceneArt } from "@/components/scene-art";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string; adv?: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const db = await getDb();
  const [s] = await db.select({ title: schema.stories.title, summary: schema.stories.summary }).from(schema.stories).where(eq(schema.stories.slug, (await params).slug));
  return { title: s?.title ?? "Story", description: s?.summary };
}

const LABELS: Record<string, string> = { background: "Historical and cultural background", characters: "Main characters", places: "Places", themes: "Main themes", storyline: "Place in the Bible's wider storyline", crossRefs: "Cross-references", prophetic: "Prophetic significance", apostolic: "Apostolic interpretation", literary: "Literary context", application: "Christian application", activity: "Suggested activity", words: "Important words" };

export default async function StoryPage({ params, searchParams }: P) {
  const { slug } = await params;
  const sp = await searchParams;
  const tr = isTranslation(sp.t) ? sp.t : "kjv";
  const user = await optionalUser();
  const story = await getStoryForViewer(user, slug, tr, { advanced: sp.adv === "1" });
  if (!story) notFound();
  const detailKeys = Object.keys(story.detail ?? {});
  return (
    <div className="container-page max-w-4xl py-10">
      <Crumbs items={[{ href: "/stories", label: "Stories" }, { label: story.title }]} />
      <header className="mb-5">
        <div className="mb-2 flex flex-wrap gap-2"><span className="badge">{story.testament === "OT" ? "Old Testament" : "New Testament"}</span><span className="badge badge-info">{story.passageRef}</span>{story.visibility === "public" && <span className="badge badge-ok">Free</span>}</div>
        <h1 className="text-3xl font-bold sm:text-4xl">{story.title}</h1>
        <p className="mt-2 text-lg text-mist">{story.summary}</p>
      </header>
      {story.access === "locked" ? (
        <div className="card overflow-hidden"><SceneArt art={story.coverArt} className="aspect-[3/1] w-full" /><div className="card-pad text-center"><h2 className="text-2xl font-bold">🔒 The full storybook opens with an active plan</h2><p className="mx-auto mt-2 max-w-xl text-mist">Illustrated pages, narration, discussion questions and notes open as soon as your payment is confirmed.</p><div className="mt-4 flex justify-center gap-3">{user ? <Link href="/plans" className="btn btn-gold">See plans</Link> : <><Link href={`/login?next=/stories/${story.slug}`} className="btn btn-primary">Sign in</Link><Link href="/register/student" className="btn btn-gold">Register</Link></>}</div></div></div>
      ) : (
        <div className="space-y-8">
          <ReviewNotice reviewStatus={story.reviewStatus} origin="ai_drafted" />
          <StoryReader title={story.title} scenes={(story.scenes ?? []).map((s, i) => ({ title: s.title, text: s.text, art: s.art, assetId: s.assetId, alt: s.alt, caption: s.caption, ref: s.ref, scripture: story.sceneScripture?.[i] ? <BibleText passages={[story.sceneScripture[i]!]} compact /> : undefined }))} />
          {story.memoryVerse && <section className="card card-pad bg-ivory"><h2 className="text-xl font-bold">Memory verse</h2><div className="mt-2"><BibleText passages={[story.memoryVerse]} compact /></div></section>}
          {!!story.discussion?.length && <section className="card card-pad"><h2 className="text-xl font-bold">Let us talk about it</h2><ol className="mt-2 list-decimal space-y-1 pl-5">{story.discussion.map((d) => <li key={d}>{d}</li>)}</ol></section>}
          <section>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-xl font-bold">Read the passage: {story.passageRef}</h2><div className="flex gap-1">{(["kjv", "bsb", "asv"] as const).map((t) => <Link key={t} href={`/stories/${story.slug}?t=${t}`} className={`btn btn-sm ${tr === t ? "btn-navy" : "btn-ghost"}`}>{t.toUpperCase()}</Link>)}</div></div>
            <BibleText passages={story.passage ?? []} />
          </section>
          {detailKeys.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Study notes</h2>{user?.role === "student" && <Link href={`/stories/${story.slug}?adv=${sp.adv === "1" ? "0" : "1"}${tr !== "kjv" ? `&t=${tr}` : ""}`} className="btn btn-ghost btn-sm">{sp.adv === "1" ? "Hide" : "Show"} advanced notes</Link>}</div>
              {detailKeys.filter((k) => LABELS[k]).map((k) => <div key={k} className="card card-pad"><h3 className="font-bold">{LABELS[k]}</h3><p className="mt-1">{String(story.detail![k])}</p></div>)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
