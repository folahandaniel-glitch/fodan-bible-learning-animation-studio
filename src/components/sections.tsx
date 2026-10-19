import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { listClasses } from "@/server/services/content";
import { publishedEvents, publishedFaqs, publishedTestimonials, publishedWings, type RenderSection } from "@/server/services/site";
import { getPassages } from "@/server/bible-data";
import { MEMORY_VERSES } from "@/content/question-bank";
import { Logo } from "./ui";
import { SceneArt } from "./scene-art";
import { Markdown } from "./markdown";
import { ContactForm } from "./contact-form";

type C = Record<string, unknown>;
const s = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
interface Cta { label: string; href: string }
const cta = (v: unknown): Cta | null => { const o = v as Cta | undefined; return o && o.label && o.href ? o : null; };
const safeHref = (h: string) => (/^(\/(?!\/)|https?:\/\/|mailto:|#)/i.test(h) ? h : "#");

function SectionShell({ id, title, intro, children, tone = "plain" }: { id: string; title?: string; intro?: string; children: React.ReactNode; tone?: "plain" | "sand" | "navy" }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={tone === "sand" ? "bg-sand py-12" : tone === "navy" ? "bg-navy py-12 text-ivory" : "py-12"}>
      <div className="container-page">
        {title && <h2 id={`${id}-h`} className={`text-2xl font-bold sm:text-3xl ${tone === "navy" ? "!text-ivory" : ""}`}>{title}</h2>}
        {intro && <p className={`mt-2 max-w-3xl ${tone === "navy" ? "text-[#d9dff0]" : "text-mist"}`}>{intro}</p>}
        <div className={title || intro ? "mt-6" : ""}>{children}</div>
      </div>
    </section>
  );
}

function embedUrl(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1).replace(/[^\w-]/g, "")}`;
    if (/(^|\.)youtube\.com$/.test(url.hostname)) { const v = url.searchParams.get("v"); return v ? `https://www.youtube-nocookie.com/embed/${v.replace(/[^\w-]/g, "")}` : null; }
    if (url.hostname === "vimeo.com") return `https://player.vimeo.com/video/${url.pathname.slice(1).replace(/[^\d]/g, "")}`;
  } catch { /* fall through */ }
  return null;
}

export async function Section({ sec }: { sec: RenderSection }) {
  const c = sec.content as C;
  const id = `sec-${sec.id.slice(0, 8)}`;
  switch (sec.type) {
    case "hero": {
      const p = cta(c.primaryCta), q = cta(c.secondaryCta), t = cta(c.tertiaryCta);
      return (
        <section aria-labelledby={`${id}-h`} className="hero-bg text-ivory">
          <div className="container-page grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-16">
            <div>
              <Logo placement={s(c.logoPlacement, "homepage")} on="dark" className="mb-5 h-16 w-auto sm:h-20" />
              {s(c.kicker) && <p className="text-xs font-bold uppercase tracking-[.2em] text-gold">{s(c.kicker)}</p>}
              <h1 id={`${id}-h`} className="mt-2 text-4xl font-bold !text-ivory sm:text-5xl">{s(c.heading)}</h1>
              <p className="mt-4 max-w-xl text-lg text-[#d9dff0]">{s(c.subheading)}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {p && <Link href={safeHref(p.href)} className="btn btn-gold">{p.label}</Link>}
                {q && <Link href={safeHref(q.href)} className="btn btn-ghost-light">{q.label}</Link>}
                {t && <Link href={safeHref(t.href)} className="btn btn-ghost-light">{t.label}</Link>}
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border-4 border-white/20 shadow-2xl">
              <SceneArt art={s(c.art, "dawn:hills:sun,book,star")} className="aspect-[2/1] w-full" label="Illustration: sunrise over hills with an open Bible" />
              <p className="bg-black/30 px-3 py-1 text-[11px] text-white/80">Artistic illustration for learning.</p>
            </div>
          </div>
        </section>
      );
    }
    case "about":
      return (
        <SectionShell id={id} title={s(c.title)}>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3 text-lg">{arr<string>(c.body).map((p, i) => <p key={i}>{p}</p>)}{s(c.note) && <p className="text-sm italic text-mist">{s(c.note)}</p>}</div>
            <div className="grid gap-3">{arr<{ title: string; text: string }>(c.pillars).map((p) => <div key={p.title} className="card card-pad"><h3 className="text-lg font-bold">{p.title}</h3><p className="text-mist">{p.text}</p></div>)}</div>
          </div>
        </SectionShell>
      );
    case "wings": {
      const wings = await publishedWings();
      return (
        <SectionShell id={id} title={s(c.title)} intro={s(c.intro)} tone="sand">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wings.map((w) => (
              <li key={w.id}>
                <Link href={`/wings/${w.slug}`} className="card card-hover block h-full p-5 no-underline">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-sm font-bold text-gold">{w.code}</span>
                    <div><h3 className="text-lg font-bold leading-tight">{w.name}</h3><p className="text-xs uppercase tracking-wide text-mist">{w.kind === "institution" ? "Institution" : "Ministry wing"}{w.constituency ? ` · ${w.constituency}` : ""}</p></div>
                  </div>
                  <p className="mt-3 text-sm text-ink">{w.tagline || w.description.slice(0, 120)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </SectionShell>
      );
    }
    case "crop": case "parents": case "teachers": case "cbt": {
      const tone = sec.type === "crop" ? "navy" : sec.type === "teachers" ? "sand" : "plain";
      const ctaLinks: Record<string, Cta[]> = { crop: [{ label: "Meet the wings", href: "/wings/crop" }], parents: [{ label: "Register as a parent", href: "/register/parent" }, { label: "See plans", href: "/plans" }], teachers: [{ label: "Register as a teacher", href: "/register/teacher" }], cbt: [{ label: "Preview the curriculum", href: "/classes" }] };
      return (
        <SectionShell id={id} title={s(c.title)} tone={tone}>
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="space-y-3 text-lg">
              {(Array.isArray(c.body) ? arr<string>(c.body) : [s(c.body)]).map((p, i) => <p key={i}>{p}</p>)}
              <div className="flex flex-wrap gap-3 pt-2">{ctaLinks[sec.type].map((l) => <Link key={l.href} href={l.href} className={tone === "navy" ? "btn btn-gold" : "btn btn-primary"}>{l.label}</Link>)}</div>
            </div>
            <ul className={`space-y-3 ${tone === "navy" ? "" : ""}`}>{arr<string>(c.points).map((p) => <li key={p} className={`flex gap-3 rounded-xl p-3 ${tone === "navy" ? "bg-white/10" : "bg-white border border-line"}`}><span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-full bg-gold" /><span>{p}</span></li>)}</ul>
          </div>
        </SectionShell>
      );
    }
    case "learning":
      return (
        <SectionShell id={id} title={s(c.title)} intro={s(c.intro)}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {arr<{ title: string; text: string; href: string }>(c.features).map((f) => <li key={f.title}><Link href={safeHref(f.href)} className="card card-hover block h-full p-5 no-underline"><h3 className="text-lg font-bold">{f.title}</h3><p className="mt-1 text-sm text-ink">{f.text}</p><span className="mt-3 inline-block text-sm font-semibold text-royal">Explore →</span></Link></li>)}
          </ul>
        </SectionShell>
      );
    case "storybook": {
      const db = await getDb();
      const stories = (await db.select().from(schema.stories).where(and(eq(schema.stories.status, "published"), eq(schema.stories.isTemplate, false), eq(schema.stories.visibility, "public")))).slice(0, 6);
      return (
        <SectionShell id={id} title={s(c.title)} intro={s(c.intro)} tone="sand">
          {stories.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stories.map((st) => <li key={st.id}><Link href={`/stories/${st.slug}`} className="card card-hover block h-full overflow-hidden no-underline"><SceneArt art={st.coverArt} className="aspect-[2/1] w-full" /><div className="p-4"><h3 className="font-bold">{st.title}</h3><p className="text-sm text-mist">{st.passageRef}</p></div></Link></li>)}</ul> : <p className="text-mist">Public sample stories will appear here once the administrator marks them public.</p>}
          <div className="mt-5"><Link href="/stories" className="btn btn-primary">Browse the story library</Link></div>
        </SectionShell>
      );
    }
    case "classes": {
      const classes = await listClasses();
      return (
        <SectionShell id={id} title={s(c.title)} intro={s(c.intro)}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {classes.map((k) => <li key={k.id}><Link href={`/classes/${k.slug}`} className="card card-hover block h-full p-4 no-underline"><p className="text-xs font-bold uppercase tracking-wide text-gold-700">{k.stage}</p><h3 className="text-xl font-bold">{k.name}</h3><p className="text-sm text-mist">{k.title}</p><p className="mt-2 text-xs"><span className="badge badge-ok">{k.readyCount} lessons ready</span> <span className="badge">{k.topicCount} topics</span></p></Link></li>)}
          </ul>
          <p className="mt-4 text-sm text-mist">Every topic has its Bible passage. A topic shows as &ldquo;lesson ready&rdquo; only when a full lesson exists; the rest of the framework is being written and reviewed.</p>
        </SectionShell>
      );
    }
    case "timeline": {
      const db = await getDb();
      const ev = (await db.select().from(schema.timelineEvents).orderBy(asc(schema.timelineEvents.sort))).filter((_, i) => i % 5 === 0).slice(0, 7);
      return (
        <SectionShell id={id} title={s(c.title)} intro={s(c.intro)} tone="navy">
          <ol className="flex gap-3 overflow-x-auto pb-3">{ev.map((e) => <li key={e.id} className="w-56 shrink-0 rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold uppercase text-gold">{e.era}</p><h3 className="!text-ivory text-base font-bold">{e.title}</h3><p className="mt-1 text-xs text-[#d9dff0]">{e.ref}</p></li>)}</ol>
          <Link href="/timeline" className="btn btn-gold mt-4">Explore the timeline</Link>
        </SectionShell>
      );
    }
    case "featured": {
      const db = await getDb();
      const free = await db.select().from(schema.lessons).where(and(eq(schema.lessons.isFree, true), eq(schema.lessons.status, "published")));
      const verses = MEMORY_VERSES.slice(0, 4).map((v) => ({ ref: v.ref, text: getPassages(v.ref, "kjv")[0]?.verses.map((x) => x.text).join(" ") })).filter((v) => v.text);
      return (
        <SectionShell id={id} title={s(c.title)} intro={s(c.intro)}>
          <div className="grid gap-6 lg:grid-cols-2">
            <ul className="space-y-3">{free.map((l) => <li key={l.id}><Link href={`/learn/${l.slug}`} className="card card-hover block p-4 no-underline"><span className="badge badge-ok">Free sample</span><h3 className="mt-1 text-lg font-bold">{l.title}</h3><p className="text-sm text-mist">{l.body.scriptureSummary}</p></Link></li>)}{!free.length && <li className="text-mist">No free sample lessons are currently published.</li>}</ul>
            <ul className="space-y-3">{verses.map((v) => <li key={v.ref} className="scripture">{v.text}<span className="mt-1 block text-sm font-sans text-mist">{v.ref} (KJV)</span></li>)}</ul>
          </div>
        </SectionShell>
      );
    }
    case "testimonials": {
      const t = await publishedTestimonials();
      if (!t.length) return null;
      return <SectionShell id={id} title={s(c.title)} intro={s(c.intro)} tone="sand"><ul className="grid gap-4 md:grid-cols-2">{t.map((x) => <li key={x.id} className="card card-pad"><blockquote className="font-display text-lg">&ldquo;{x.body}&rdquo;</blockquote><p className="mt-2 text-sm font-semibold">{x.name}{x.role ? `, ${x.role}` : ""}</p></li>)}</ul></SectionShell>;
    }
    case "events": {
      const ev = await publishedEvents();
      if (!ev.length) return null;
      return <SectionShell id={id} title={s(c.title)} intro={s(c.intro)}><ul className="grid gap-4 md:grid-cols-2">{ev.map((e) => <li key={e.id} className="card card-pad"><span className="badge badge-info">{e.kind}</span><h3 className="mt-1 text-lg font-bold">{e.title}</h3><p className="text-sm text-mist">{e.startsAt ? e.startsAt.toDateString() : "Date to be announced"}{e.location ? ` · ${e.location}` : ""}</p><p className="mt-2 text-sm">{e.description}</p>{e.registrationUrl && <a className="btn btn-ghost btn-sm mt-3" href={e.registrationUrl} rel="noopener noreferrer">Register</a>}</li>)}</ul></SectionShell>;
    }
    case "faq": {
      const f = await publishedFaqs();
      return <SectionShell id={id} title={s(c.title)} intro={s(c.intro)} tone="sand"><div className="space-y-2">{f.map((q) => <details key={q.id} className="card px-4 py-3"><summary className="cursor-pointer font-semibold text-navy">{q.question}</summary><p className="mt-2 text-ink">{q.answer}</p></details>)}</div></SectionShell>;
    }
    case "contact":
      return <SectionShell id={id} title={s(c.title)} intro={s(c.intro)}><div className="max-w-xl"><ContactForm /></div></SectionShell>;
    case "richtext":
      return <SectionShell id={id} title={s(c.title)}><div className="max-w-3xl"><Markdown source={s(c.body)} /></div></SectionShell>;
    case "cta": {
      const b = cta({ label: s(c.button), href: s(c.href) });
      return <SectionShell id={id} tone="navy"><div className="text-center"><h2 className="text-2xl font-bold !text-ivory">{s(c.title)}</h2><p className="mx-auto mt-2 max-w-2xl text-[#d9dff0]">{s(c.text)}</p>{b && <Link href={safeHref(b.href)} className="btn btn-gold mt-4">{b.label}</Link>}</div></SectionShell>;
    }
    case "image":
      return <SectionShell id={id} title={s(c.title)}><figure className="mx-auto max-w-3xl">{/* eslint-disable-next-line @next/next/no-img-element */}{s(c.assetId) && <img src={`/api/media/${s(c.assetId)}`} alt={s(c.alt)} className="w-full rounded-2xl" loading="lazy" />}{s(c.caption) && <figcaption className="mt-2 text-center text-sm text-mist">{s(c.caption)}</figcaption>}</figure></SectionShell>;
    case "video": {
      const e = embedUrl(s(c.url));
      return <SectionShell id={id} title={s(c.title)}>{e ? <div className="mx-auto aspect-video max-w-3xl overflow-hidden rounded-2xl"><iframe src={e} title={s(c.title, "Video")} className="h-full w-full" loading="lazy" allow="encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div> : <p className="text-mist">The video link is not a supported YouTube or Vimeo address.</p>}{s(c.transcript) && <details className="mx-auto mt-3 max-w-3xl"><summary className="cursor-pointer font-semibold">Transcript</summary><p className="mt-2 whitespace-pre-line">{s(c.transcript)}</p></details>}</SectionShell>;
    }
    case "cards":
      return <SectionShell id={id} title={s(c.title)}><ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{arr<{ title: string; text: string; href?: string }>(c.items).map((i) => <li key={i.title} className="card card-pad"><h3 className="text-lg font-bold">{i.title}</h3><p className="text-mist">{i.text}</p>{i.href && <Link href={safeHref(i.href)} className="mt-2 inline-block font-semibold">Learn more →</Link>}</li>)}</ul></SectionShell>;
    default:
      return null;
  }
}
