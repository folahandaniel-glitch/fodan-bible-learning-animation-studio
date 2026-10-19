import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, Check, Field, PasswordInput, Select } from "@/components/forms";
import { registerAction } from "@/app/actions/auth";
import { getSetting } from "@/server/settings";
import { getDb, schema } from "@/server/db";
import { and, eq, asc } from "drizzle-orm";

const TYPES = ["student", "parent", "teacher", "org_admin"] as const;
type T = (typeof TYPES)[number];
const TITLES: Record<T, string> = { student: "Register a child or student", parent: "Register as a parent or guardian", teacher: "Register as a Sunday School teacher", org_admin: "Register your church or school" };
export const metadata: Metadata = { title: "Register" };

export default async function Register({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!TYPES.includes(type as T)) notFound();
  const t = type as T;
  const f = await getSetting("features");
  if (!f.registrationOpen[t]) return <><h1 className="text-2xl font-bold">{TITLES[t]}</h1><p className="mt-3">Registration for this account type is currently closed. Please <Link href="/contact">contact us</Link>.</p></>;
  const db = await getDb();
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  const orgs = t === "teacher" ? await db.select({ id: schema.organizations.id, name: schema.organizations.name }).from(schema.organizations).where(and(eq(schema.organizations.status, "active"))).orderBy(asc(schema.organizations.name)) : [];
  return (
    <>
      <h1 className="text-2xl font-bold">{TITLES[t]}</h1>
      <p className="mb-4 text-sm text-mist">{t === "student" ? "A parent or guardian should help with this form. We ask only for what is needed." : t === "teacher" ? "Your church or learning centre must approve your account before you can see any class." : t === "org_admin" ? "The Super Admin approves new churches and schools before they can use class tools." : "Create your account, then add or link your children."}</p>
      <ActionForm action={registerAction.bind(null, t)} submit="Create account" submitClass="btn btn-gold w-full">
        <Field label={t === "student" ? "Child's full name" : "Your full name"} name="fullName" required autoComplete="name" maxLength={100} />
        {t === "student" && <Field label="Nickname shown in the app (optional)" name="displayName" maxLength={30} hint="This is the friendly name used on the dashboard. It should not be a full name." />}
        {t === "student" ? <Field label="Choose a username" name="username" required autoComplete="username" pattern="[A-Za-z0-9._\-]{3,30}" hint="3 to 30 letters, numbers, dots or dashes. Do not use your full name or birth date." /> : <>
          <Field label="Email address" name="email" type="email" required autoComplete="email" inputMode="email" />
          <Field label="Username (optional)" name="username" autoComplete="username" pattern="[A-Za-z0-9._\-]{3,30}" hint="You can sign in with your email or this username." />
        </>}
        {t === "student" && <>
          <Select label="Class" name="classLevelSlug" required options={classes.map((c) => ({ value: c.slug, label: c.name }))} />
          <Select label="Age group" name="ageBand" options={[{ value: "", label: "Choose (optional)" }, { value: "under-7", label: "Under 7" }, { value: "7-9", label: "7 to 9" }, { value: "10-12", label: "10 to 12" }, { value: "13-15", label: "13 to 15" }, { value: "16+", label: "16 or older" }]} hint="We use an age group instead of a date of birth." />
        </>}
        {(t === "parent" || t === "teacher") && <Field label="Mobile number (optional)" name="phone" type="tel" autoComplete="tel" inputMode="tel" />}
        {t === "parent" && <Select label="Your relationship to the child" name="relationship" options={[{ value: "parent", label: "Parent" }, { value: "guardian", label: "Guardian" }, { value: "other", label: "Other family member" }]} />}
        {t === "teacher" && <>
          <Field label="Teaching role or age group" name="teachingRole" placeholder="e.g. Primary 3 Sunday School" maxLength={100} />
          {orgs.length > 0 && <Select label="Your church or learning centre" name="orgId" options={[{ value: "", label: "Choose (or use an invitation code)" }, ...orgs.map((o) => ({ value: o.id, label: o.name }))]} hint="Your organisation must approve you." />}
        </>}
        {t === "org_admin" && <>
          <Field label="Name of the church or school" name="orgName" required maxLength={120} />
          <Select label="Type" name="orgType" options={[{ value: "church", label: "Church" }, { value: "school", label: "School" }, { value: "centre", label: "Learning centre" }]} />
          <Field label="Country" name="country" autoComplete="country-name" maxLength={60} />
        </>}
        <PasswordInput label="Password" name="password" autoComplete="new-password" showStrength />
        <PasswordInput label="Confirm password" name="confirm" autoComplete="new-password" hint="Type the same password again." />
        {(t === "student" || t === "teacher") && <Field label="Invitation or access code (optional)" name="accessKey" hint="Given by your church or teacher. A code never replaces payment unless it is a scholarship." />}
        <div className="hidden" aria-hidden><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        {t === "student" && <Check name="guardian" required label={<>I am the parent or guardian and I agree to the <Link href="/p/privacy">child privacy notice</Link>.</>} />}
        <Check name="terms" required label={<>I accept the <Link href="/p/terms">terms of use</Link> and <Link href="/p/privacy">privacy notice</Link>.</>} />
      </ActionForm>
      <p className="mt-4 text-sm">Already registered? <Link href="/login">Sign in</Link></p>
    </>
  );
}
