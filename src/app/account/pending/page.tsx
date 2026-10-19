import { eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { homeFor } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Awaiting approval" };

export default async function Pending() {
  const user = await requireUser(undefined, { allowPending: true });
  if (user.status !== "pending") redirect(homeFor(user.role));
  const db = await getDb();
  const org = user.orgId ? (await db.select().from(schema.organizations).where(eq(schema.organizations.id, user.orgId)))[0] : null;
  return (
    <div className="max-w-xl">
      <PageHeader title="Your account is waiting for approval" />
      <div className="card card-pad">
        {user.role === "teacher" ? <p>Thank you for registering as a teacher. {org ? <>An administrator of <strong>{org.name}</strong> must approve your account.</> : "Your church or learning centre must approve your account."} Until then you cannot see any class or learner. You will receive an email when you are approved (if email delivery is set up).</p> : <p>Thank you for registering. The Super Admin reviews new churches and schools before they can use class tools. We will contact you.</p>}
      </div>
    </div>
  );
}
