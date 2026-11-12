import type { Metadata } from "next";
import { getUiText } from "@/server/page-text";
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
  const ui = await getUiText();
  const label = f.loginMode === "email" ? "Email address" : f.loginMode === "username" ? "Username" : "Username or email";
  return (
    <>
      <h1 className="text-2xl font-bold">{ui["login.title"]}</h1>
      <p className="mb-4 text-sm text-mist">{ui["login.intro"]}</p>
      {sp.reset && <div className="mb-4"><Alert tone="ok">Your password was changed. Please sign in.</Alert></div>}
      <ActionForm action={loginAction} submit={ui["login.button"]} submitClass="btn btn-primary w-full">
        <input type="hidden" name="next" value={safeNext(sp.next) ?? ""} />
        <Field label={label} name="identifier" required autoComplete="username" />
        <PasswordInput autoComplete="current-password" />
        <Check name="remember" label={ui["login.remember"]} />
        <p className="text-sm"><Link href="/forgot-password">{ui["login.forgot"]}</Link></p>
      </ActionForm>
      <hr className="my-5 border-line" />
      <p className="text-sm font-semibold">{ui["login.newHere"]}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Link href="/register/student" className="btn btn-ghost btn-sm">{ui["reg.student"]}</Link>
        <Link href="/register/parent" className="btn btn-ghost btn-sm">{ui["reg.parent"]}</Link>
        <Link href="/register/teacher" className="btn btn-ghost btn-sm">{ui["reg.teacher"]}</Link>
        <Link href="/register/org_admin" className="btn btn-ghost btn-sm">{ui["reg.org_admin"]}</Link>
      </div>
      <p className="mt-4 text-xs text-mist">{ui["login.note"]} <Link href="/plans">See plans</Link>.</p>
    </>
  );
}
