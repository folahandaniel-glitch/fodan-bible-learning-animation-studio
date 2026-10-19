import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { Crumbs } from "@/components/ui";
import { Markdown } from "@/components/markdown";

type P = { params: Promise<{ slug: string }> };
async function load(slug: string) {
  const db = await getDb();
  const [w] = await db.select().from(schema.ministryWings).where(and(eq(schema.ministryWings.slug, slug), eq(schema.ministryWings.status, "published")));
  return w;
}
export async function generateMetadata({ params }: P): Promise<Metadata> { const w = await load((await params).slug); return { title: w?.name ?? "Ministry wing", description: w?.tagline }; }

export default async function WingPage({ params }: P) {
  const w = await load((await params).slug);
  if (!w) notFound();
  const db = await getDb();
  const logo = w.logoId ? w.logoId : (await db.select({ id: schema.logos.id }).from(schema.logos).where(and(eq(schema.logos.ministrySlug, w.slug), eq(schema.logos.active, true))).limit(1))[0]?.id;
  return (
    <div className="container-page max-w-4xl py-10">
      <Crumbs items={[{ href: "/wings", label: "Ministry wings" }, { label: w.name }]} />
      <header className="mb-6 flex flex-wrap items-center gap-4">
        {logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/logo/${logo}`} alt={`${w.name} logo`} className="h-20 w-auto" /> : <span className="grid h-20 w-20 place-items-center rounded-2xl bg-navy text-xl font-bold text-gold">{w.code}</span>}
        <div><p className="text-xs font-bold uppercase tracking-widest text-gold-700">{w.kind === "institution" ? "Institution" : "Ministry wing"} · Fodan Gospel Outreach</p><h1 className="text-3xl font-bold">{w.name}</h1>{w.tagline && <p className="text-lg text-mist">{w.tagline}</p>}</div>
      </header>
      <div className="space-y-6">
        <p className="text-lg">{w.description}</p>
        {w.vision && <section className="card card-pad"><h2 className="text-xl font-bold">Vision</h2><p>{w.vision}</p></section>}
        {w.mission && <section className="card card-pad"><h2 className="text-xl font-bold">Mission</h2><p>{w.mission}</p></section>}
        {!!w.activities.length && <section className="card card-pad"><h2 className="text-xl font-bold">Activities</h2><ul className="mt-2 list-disc space-y-1 pl-5">{w.activities.map((a) => <li key={a}>{a}</li>)}</ul></section>}
        {w.audience && <p><strong>Who it serves:</strong> {w.audience}</p>}
        {w.body && <Markdown source={w.body} />}
        {w.slug === "crop" && <section className="card card-pad bg-sand"><h2 className="text-xl font-bold">What CROP means</h2><p>CROP stands for <strong>Child Rescue Operation Programmes</strong>. It is the children&apos;s wing of Fodan Gospel Outreach. This Bible Learning Centre is where CROP&apos;s Sunday School and Bible education is delivered.</p></section>}
        <div className="flex flex-wrap gap-3">
          {w.acceptsRegistration && w.registrationUrl && <Link href={w.registrationUrl} className="btn btn-gold">Register</Link>}
          <Link href={`/contact?about=${w.slug}`} className="btn btn-primary">Enquire about {w.code}</Link>
          {w.contactEmail && <a className="btn btn-ghost" href={`mailto:${w.contactEmail}`}>Email {w.code}</a>}
        </div>
      </div>
    </div>
  );
}
