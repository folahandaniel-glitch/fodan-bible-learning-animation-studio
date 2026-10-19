import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_400px_at_80%_-10%,rgba(227,169,43,.18),transparent),linear-gradient(#fffdf6,#fff8e7)]">
      <a href="#main" className="skip-link">Skip to content</a>
      <main id="main" className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-8">
        <Link href="/" className="mx-auto mb-6 block" aria-label="Home"><Logo placement="login" className="h-20 w-auto" /></Link>
        <div className="card card-pad shadow-lg sm:p-8">{children}</div>
        <p className="mt-4 text-center text-xs text-mist">A Bible education service of Fodan Gospel Outreach · <Link href="/p/privacy">Privacy</Link> · <Link href="/p/safeguarding">Child safeguarding</Link></p>
      </main>
    </div>
  );
}
