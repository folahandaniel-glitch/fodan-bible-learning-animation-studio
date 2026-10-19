import { ActionForm, Field, PasswordInput } from "@/components/forms";
import { softnetLoginAction } from "@/app/actions/softnet";
import { SOFTNET_NAME } from "@/server/softnet";

export const metadata = { title: SOFTNET_NAME, robots: { index: false, follow: false } };

export default async function SoftnetLogin({ searchParams }: { searchParams: Promise<{ again?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center bg-navy p-4">
      <div className="card card-pad w-full">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-gold-700">Authorised developers only</p>
        <h1 className="mt-1 text-2xl font-bold">{SOFTNET_NAME}</h1>
        {sp.again && <p className="alert alert-warn mt-3 text-sm">Please sign in again to continue.</p>}
        <div className="mt-4"><ActionForm action={softnetLoginAction} submit="Sign in" submitClass="btn btn-navy w-full">
          <Field label="Username or email" name="identifier" required autoComplete="username" />
          <PasswordInput autoComplete="current-password" />
          <Field label="Authenticator code" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={8} hint="The 6-digit code from your authenticator app." />
        </ActionForm></div>
        <p className="mt-4 text-xs text-mist">All activity here is recorded.</p>
      </div>
    </main>
  );
}
