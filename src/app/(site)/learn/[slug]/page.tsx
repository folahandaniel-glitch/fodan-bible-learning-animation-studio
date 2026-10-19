import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLessonForViewer } from "@/server/services/content";
import { optionalUser } from "@/server/guards";
import { BibleText } from "@/components/bible-text";
import { Markdown } from "@/components/markdown";
import { Alert, Crumbs, ReviewNotice } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { completeLessonAction, startLessonQuizAction } from "@/app/actions/learn";
import { isTranslation, TRANSLATIONS } from "@/lib/bible";
import { getDb, schema } from "@/server/db";
import { eq } from "drizzle-orm";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string; quiz?: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDb();
  const [l] = await db.select({ title: schema.lessons.title }).from(schema.lessons).where(eq(schema.lessons.slug, slug));
  return { title: l?.title ?? "Lesson" };
}

export default async function LessonPage({ params, searchParams }: P) {
  const { slug } = await params;
  const sp = await searchParams;
  const tr = isTranslation(sp.t) ? sp.t : "kjv";
  const user = await optionalUser();
  const lesson = await getLessonForViewer(user, slug, tr);
  if (!lesson) notFound();
  const b = lesson.body;
  return (
    <article className="container-page max-w-4xl py-10">
      <Crumbs items={[{ href: "/classes", label: "Classes" }, { href: `/classes/${lesson.classSlug}`, label: lesson.className }, { label: lesson.title }]} />
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap gap-2"><span className="badge badge-info">{lesson.className}</span>{lesson.isFree && <span className="badge badge-ok">Free sample</span>}{lesson.access === "full" && lesson.contentLevel === "complete" && <span className="badge">Bible: {lesson.refs.join("; ")}</span>}</div>
        <h1 className="text-3xl font-bold sm:text-4xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-2 text-lg text-mist">{lesson.summary}</p>}
      </header>

      {lesson.access === "framework" && <Alert tone="warn"><strong>This lesson is still being written.</strong> The topic and passage ({lesson.refs.join("; ")}) are part of the curriculum framework. The full lesson will appear after it has been written and reviewed.</Alert>}

      {lesson.access === "locked" && (
        <div className="card card-pad border-gold bg-sand text-center">
          <h2 className="text-2xl font-bold">🔒 This lesson opens with an active plan</h2>
          <p className="mx-auto mt-2 max-w-xl text-mist">You can see the topic and passage ({lesson.refs.join("; ")}). The full lesson, quiz and activities open as soon as your payment is confirmed.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">{user ? <Link href="/plans" className="btn btn-gold">See plans</Link> : <><Link href={`/login?next=/learn/${lesson.slug}`} className="btn btn-primary">Sign in</Link><Link href="/register/student" className="btn btn-gold">Register</Link></>}</div>
        </div>
      )}

      {lesson.access === "full" && b && (
        <div className="space-y-6">
          <ReviewNotice reviewStatus={lesson.reviewStatus} origin={lesson.origin} />
          {sp.quiz && <Alert tone="warn">{sp.quiz}</Alert>}
          {!!b.objectives?.length && <section className="card card-pad"><h2 className="text-xl font-bold">What we will learn</h2><ul className="mt-2 list-disc space-y-1 pl-5">{b.objectives.map((o) => <li key={o}>{o}</li>)}</ul></section>}
          <section aria-labelledby="bible-h">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 id="bible-h" className="text-xl font-bold">Read the Bible passage</h2>
              <div className="flex gap-1" role="group" aria-label="Translation">{TRANSLATIONS.filter((t) => t.lang === "en").map((t) => <Link key={t.id} href={`/learn/${lesson.slug}?t=${t.id}`} aria-current={t.id === tr ? "true" : undefined} className={`btn btn-sm ${t.id === tr ? "btn-navy" : "btn-ghost"}`}>{t.name}</Link>)}</div></div>
            <BibleText passages={lesson.passages ?? []} />
            {!lesson.passages?.length && <p className="text-mist">Passage: {lesson.refs.join("; ")}. The text is not available in this translation.</p>}
          </section>
          {lesson.memoryVerse && <section className="card card-pad bg-ivory"><h2 className="text-xl font-bold">Memory verse</h2><div className="mt-2"><BibleText passages={[lesson.memoryVerse]} compact /></div></section>}
          {b.background && <section><h2 className="text-xl font-bold">Background</h2><Markdown source={b.background} /></section>}
          {b.explanation && <section><h2 className="text-xl font-bold">The lesson</h2><Markdown source={b.explanation} /></section>}
          {!!b.keyWords?.length && <section className="card card-pad"><h2 className="text-xl font-bold">Important words</h2><dl className="mt-2 grid gap-2 sm:grid-cols-2">{b.keyWords.map((k) => <div key={k.word}><dt className="font-bold text-navy">{k.word}</dt><dd className="text-sm text-mist">{k.meaning}</dd></div>)}</dl></section>}
          {b.application && <section><h2 className="text-xl font-bold">Living it out</h2><Markdown source={b.application} /></section>}
          {!!b.discussion?.length && <section className="card card-pad"><h2 className="text-xl font-bold">Let us talk about it</h2><ol className="mt-2 list-decimal space-y-1 pl-5">{b.discussion.map((d) => <li key={d}>{d}</li>)}</ol></section>}
          {(b.activity || b.homework) && <section className="grid gap-4 sm:grid-cols-2">{b.activity && <div className="card card-pad"><h2 className="text-lg font-bold">Activity</h2><p className="mt-1">{b.activity}</p></div>}{b.homework && <div className="card card-pad"><h2 className="text-lg font-bold">Take-home</h2><p className="mt-1">{b.homework}</p></div>}</section>}
          {lesson.parentNotes && user && (user.role === "parent" || user.role === "teacher" || user.role === "org_admin" || user.role.endsWith("admin") || user.role === "content_editor") && <section className="card card-pad border-leaf bg-leaf-50"><h2 className="text-lg font-bold">Notes for parents and guardians</h2><p className="mt-1">{lesson.parentNotes}</p></section>}
          {lesson.teacherNotes && (
            <section className="card card-pad border-royal bg-[#f3f7ff]" aria-label="Teacher notes">
              <h2 className="text-lg font-bold">Teacher notes <span className="badge badge-info">Teachers only</span></h2>
              {lesson.teacherNotes.preparation && <><h3 className="mt-2 font-bold">Preparation</h3><p>{lesson.teacherNotes.preparation}</p></>}
              {lesson.teacherNotes.notes && <><h3 className="mt-2 font-bold">Teaching notes</h3><p>{lesson.teacherNotes.notes}</p></>}
              {lesson.teacherNotes.advanced && <details className="mt-2"><summary className="cursor-pointer font-bold">Fuller scholarly notes</summary><p className="mt-1">{lesson.teacherNotes.advanced}</p></details>}
            </section>
          )}
          {lesson.editorialNotes && <section className="card card-pad"><h2 className="text-lg font-bold">Editorial notes <span className="badge">Editors only</span></h2><p className="text-sm">{lesson.editorialNotes}</p></section>}
          {user?.role === "student" && lesson.lessonIdForQuiz && (
            <section className="flex flex-wrap items-start gap-4">
              <form action={startLessonQuizAction.bind(null, lesson.lessonIdForQuiz, lesson.slug)}><button className="btn btn-gold" type="submit">Take the lesson quiz</button></form>
              <ActionForm action={completeLessonAction.bind(null, lesson.lessonIdForQuiz, lesson.slug)} submit={lesson.completed ? "✓ Completed (mark again)" : "Mark lesson complete"} submitClass="btn btn-primary" className="" ><span /></ActionForm>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
