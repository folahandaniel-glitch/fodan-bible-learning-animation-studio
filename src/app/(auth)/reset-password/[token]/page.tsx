import type { Metadata } from "next";
import { ActionForm, PasswordInput } from "@/components/forms";
import { resetAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <p className="mb-4 text-sm text-mist">This link works once and expires 30 minutes after it was sent.</p>
      <ActionForm action={resetAction.bind(null, token)} submit="Change password" submitClass="btn btn-primary w-full">
        <PasswordInput label="New password" autoComplete="new-password" showStrength />
        <PasswordInput label="Confirm new password" name="confirm" autoComplete="new-password" />
      </ActionForm>
    </>
  );
}
