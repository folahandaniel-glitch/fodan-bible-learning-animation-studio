import { requireUser } from "@/server/guards";
import { ActionForm, PasswordInput } from "@/components/forms";
import { changePasswordAction } from "@/app/actions/auth";
import { Alert, PageHeader } from "@/components/ui";

export const metadata = { title: "Change password" };

export default async function PasswordPage() {
  const user = await requireUser(undefined, { allowPasswordChange: true, allowPending: true });
  return (
    <div className="max-w-md">
      <PageHeader title={user.mustChangePassword ? "Set your new password" : "Change password"} />
      {user.mustChangePassword && <div className="mb-4"><Alert tone="warn">For your security you must choose a new password before continuing. The temporary password stops working once you do.</Alert></div>}
      <ActionForm action={changePasswordAction} submit="Change password" submitClass="btn btn-primary">
        {!user.mustChangePassword && <PasswordInput label="Current password" name="current" autoComplete="current-password" />}
        <PasswordInput label="New password" autoComplete="new-password" showStrength />
        <PasswordInput label="Confirm new password" name="confirm" autoComplete="new-password" />
      </ActionForm>
    </div>
  );
}
