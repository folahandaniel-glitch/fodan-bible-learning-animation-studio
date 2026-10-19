import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Check, Field, PasswordInput } from "@/components/forms";
import { loginAction } from "@/app/actions/auth";
import { getSetting } from "@/server/settings";
import { safeNext } from "@/server/guards";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; denied?: string }> }) {
  const sp = await searchParams;
  const f = await getSetting("features");
  const label = f.loginMode === "email" ? "Email address" : f.loginMode === "username" ? "Username" : "Username or email";
  return (
    <>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mb-4 text-sm text-mist">Welcome back. Sign in to continue learning.</p>
      {sp.reset && <div className="mb-4"><Alert tone="ok">Your password was changed. Please sign in.</Alert></div>}
      <ActionForm action={loginAction} submit="Sign in" submitClass="btn btn-primary w-full">
        <input type="hidden" name="next" value={safeNext(sp.next) ?? ""} />
        <Field label={label} name="identifier" required autoComplete="username" />
        <PasswordInput autoComplete="current-password" />
        <Check name="remember" label="Keep me signed in on this device for 30 days" />
        <p className="text-sm"><Link href="/forgot-password">Forgot your password?</Link></p>
      </ActionForm>
      <hr className="my-5 border-line" />
      <p className="text-sm font-semibold">New here? Register:</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Link href="/register/student" className="btn btn-ghost btn-sm">Child or student</Link>
        <Link href="/register/parent" className="btn btn-ghost btn-sm">Parent or guardian</Link>
        <Link href="/register/teacher" className="btn btn-ghost btn-sm">Sunday School teacher</Link>
        <Link href="/register/org_admin" className="btn btn-ghost btn-sm">Church or school</Link>
      </div>
      <p className="mt-4 text-xs text-mist">You can register and sign in before paying. Lessons, quizzes, exams and games open once your plan payment is confirmed. <Link href="/plans">See plans</Link>.</p>
    </>
  );
}
