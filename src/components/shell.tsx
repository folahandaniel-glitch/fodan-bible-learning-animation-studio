import Link from "next/link";
import type { ReactNode } from "react";
import { getSetting } from "@/server/settings";
import { navPages } from "@/server/services/site";
import { optionalUser } from "@/server/guards";
import { homeFor, ROLE_LABELS } from "@/lib/permissions";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./ui";
import { getDb, schema } from "@/server/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { SessionUser } from "@/server/auth/session";

export async function SiteHeader() {
  const [nav, extra, user] = await Promise.all([getSetting("nav"), navPages(), optionalUser()]);
  const items = [...nav, ...extra.map((p) => ({ label: p.title, href: `/p/${p.slug}` }))];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur no-print">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="container-page flex items-center justify-between gap-4 py-2">
        <Link href="/" aria-label="Home"><Logo placement="dashboard" className="h-11 w-auto" /></Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {items.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-navy no-underline hover:bg-sand">{n.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link href={homeFor(user.role)} className="btn btn-navy btn-sm">My dashboard</Link>
              <form action={logoutAction}><button className="btn btn-ghost btn-sm" type="submit">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <details className="relative">
                <summary className="btn btn-gold btn-sm cursor-pointer list-none">Register ▾</summary>
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-line bg-white p-2 shadow-xl">
                  <Link className="block rounded-lg px-3 py-2 text-sm no-underline hover:bg-sand" href="/register/student">Child or student</Link>
                  <Link className="block rounded-lg px-3 py-2 text-sm no-underline hover:bg-sand" href="/register/parent">Parent or guardian</Link>
                  <Link className="block rounded-lg px-3 py-2 text-sm no-underline hover:bg-sand" href="/register/teacher">Sunday School teacher</Link>
                  <Link className="block rounded-lg px-3 py-2 text-sm no-underline hover:bg-sand" href="/register/org_admin">Church or school</Link>
                </div>
              </details>
            </>
          )}
        </div>
        <details className="relative lg:hidden">
          <summary className="btn btn-ghost btn-sm cursor-pointer list-none" aria-label="Open menu">Menu ☰</summary>
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-xl">
            {items.map((n) => <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm font-semibold no-underline hover:bg-sand">{n.label}</Link>)}
            <hr className="my-2 border-line" />
            {user ? (<><Link href={homeFor(user.role)} className="block rounded-lg px-3 py-2 text-sm font-semibold no-underline hover:bg-sand">My dashboard</Link><form action={logoutAction}><button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sand" type="submit">Sign out</button></form></>) : (
              <>
                <Link href="/login" className="block rounded-lg px-3 py-2 text-sm font-semibold no-underline hover:bg-sand">Sign in</Link>
                <Link href="/register/student" className="block rounded-lg px-3 py-2 text-sm no-underline hover:bg-sand">Register a child</Link>
                <Link href="/register/parent" className="block rounded-lg px-3 py-2 text-sm no-underline hover:bg-sand">Register as a parent</Link>
                <Link href="/register/teacher" className="block rounded-lg px-3 py-2 text-sm no-underline hover:bg-sand">Register as a teacher</Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const [footer, contact, social, brand] = await Promise.all([getSetting("footer"), getSetting("contact"), getSetting("social"), getSetting("brand")]);
  const links = Object.entries(social).filter(([, v]) => v);
  const db = await getDb();
  const [parent] = await db.select({ id: schema.logos.id }).from(schema.logos).where(and(eq(schema.logos.kind, "parent"), eq(schema.logos.active, true)));
  return (
    <footer className="mt-16 bg-navy text-ivory no-print">
      <div className="container-page grid gap-8 py-10 md:grid-cols-3">
        <div>
          <Logo placement="homepage" on="dark" className="h-14 w-auto" />
          <p className="mt-3 text-sm text-[#d9dff0]">{footer.about}</p>
          {parent && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/logo/${parent.id}`} alt="Fodan Gospel Outreach" className="mt-4 h-12 w-auto rounded bg-white p-1" loading="lazy" />
          )}
        </div>
        <div>
          <h2 className="!text-ivory text-lg font-bold">Quick links</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {footer.links.map((l) => <li key={l.href}><Link href={l.href} className="!text-[#ffd98a]">{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="!text-ivory text-lg font-bold">Contact</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-[#d9dff0]">
            {contact.email && <li><a className="!text-[#ffd98a]" href={`mailto:${contact.email}`}>{contact.email}</a></li>}
            {contact.phone && <li>{contact.phone}</li>}
            {contact.whatsapp && <li><a className="!text-[#ffd98a]" href={`https://wa.me/${contact.whatsapp}`} rel="noopener noreferrer" target="_blank">WhatsApp</a></li>}
            {contact.address && <li>{contact.address}</li>}
            {links.map(([k, v]) => <li key={k}><a className="!text-[#ffd98a] capitalize" href={String(v)} rel="noopener noreferrer" target="_blank">{k}</a></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-[#aeb8d4]">© {new Date().getFullYear()} {footer.copyright} · {brand.ministry}</div>
    </footer>
  );
}

export interface NavItem { href: string; label: string; icon?: string }

export async function PortalShell({ user, nav, children, current }: { user: SessionUser; nav: NavItem[]; children: ReactNode; current?: string }) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.notifications).where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
  return (
    <div className="min-h-screen bg-[#fffdf6]">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line bg-white no-print">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-3"><Link href="/" aria-label="Public website"><Logo placement="dashboard" className="h-10 w-auto" /></Link><span className="badge badge-info hidden sm:inline-flex">{ROLE_LABELS[user.role]}</span></div>
          <div className="flex items-center gap-2">
            <Link href="/account/notifications" className="btn btn-ghost btn-sm" aria-label={`Notifications${n ? `, ${n} unread` : ""}`}>🔔{n > 0 && <span className="badge badge-bad">{n}</span>}</Link>
            <Link href="/account" className="btn btn-ghost btn-sm">{user.displayName}</Link>
            <form action={logoutAction}><button className="btn btn-navy btn-sm" type="submit">Sign out</button></form>
          </div>
        </div>
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 lg:hidden">
          {nav.map((n2) => <Link key={n2.href} href={n2.href} aria-current={current === n2.href ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold no-underline ${current === n2.href ? "bg-navy text-white" : "text-navy hover:bg-sand"}`}>{n2.label}</Link>)}
        </nav>
      </header>
      <div className="mx-auto flex max-w-[90rem]">
        <aside className="no-print sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 overflow-y-auto border-r border-line bg-white p-3 lg:block">
          <nav aria-label="Dashboard sections" className="space-y-1">
            {nav.map((n2) => <Link key={n2.href} href={n2.href} aria-current={current === n2.href ? "page" : undefined} className={`block rounded-lg px-3 py-2 text-sm font-semibold no-underline ${current === n2.href ? "bg-navy text-white" : "text-navy hover:bg-sand"}`}>{n2.label}</Link>)}
          </nav>
        </aside>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "My dashboard" }, { href: "/learn", label: "Lessons" }, { href: "/stories", label: "Bible stories" }, { href: "/student/exams", label: "Exams" },
  { href: "/student/games", label: "Games" }, { href: "/timeline", label: "Timeline" }, { href: "/bible", label: "Read the Bible" }, { href: "/account/billing", label: "Plan & billing" },
];
export const PARENT_NAV: NavItem[] = [
  { href: "/parent", label: "My children" }, { href: "/parent/add-child", label: "Add or link a child" }, { href: "/plans", label: "Plans" }, { href: "/account/billing", label: "Billing" }, { href: "/stories", label: "Bible stories" }, { href: "/learn", label: "Curriculum" },
];
export const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", label: "My classes" }, { href: "/teacher/marking", label: "Marking" }, { href: "/teacher/exams", label: "Exams" }, { href: "/learn", label: "Lesson plans" }, { href: "/studio", label: "Story studio" }, { href: "/teacher/training", label: "Training" },
];
export const CHURCH_NAV: NavItem[] = [
  { href: "/church", label: "Overview" }, { href: "/church/classes", label: "Classes" }, { href: "/church/people", label: "Teachers & learners" }, { href: "/church/keys", label: "Invitation codes" }, { href: "/plans", label: "Plans" }, { href: "/account/billing", label: "Billing" },
];
