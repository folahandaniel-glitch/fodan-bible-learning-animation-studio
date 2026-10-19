import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field } from "@/components/forms";
import { forgotAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Forgot password" };

export default function Forgot() {
  return (
    <>
      <h1 className="text-2xl font-bold">Forgot your password?</h1>
      <p className="mb-4 text-sm text-mist">Enter your email address. If an account exists we will send a link that works once. Children without an email should ask their parent or teacher to help.</p>
      <ActionForm action={forgotAction} submit="Send reset link" submitClass="btn btn-primary w-full">
        <Field label="Email address" name="identifier" type="email" required autoComplete="email" />
      </ActionForm>
      <p className="mt-4 text-sm"><Link href="/login">Back to sign in</Link></p>
    </>
  );
}
