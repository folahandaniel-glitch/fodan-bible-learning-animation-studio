import "server-only";
import { notFound, redirect } from "next/navigation";
import * as OTPAuth from "otpauth";
import { getSession, type Resolved } from "./auth/session";
import { unseal } from "./crypto";

export const SOFTNET_NAME = "FODAN SOFTNET ADVMINISTRATIVE";
const FRESH_MS = 30 * 60_000;

export function verifyTotp(sealedSecret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({ issuer: "FODAN SOFTNET", label: "developer", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(unseal(sealedSecret)) });
    return totp.validate({ token: token.replace(/\s/g, ""), window: 1 }) !== null;
  } catch { return false; }
}

/**
 * The developer control plane gate: a developer administrator, with a second factor verified in this session and a recent sign-in.
 * Everyone else gets a plain 404, so the area is not advertised. A URL is never the security: the session is.
 */
export async function requireDeveloper(): Promise<Resolved> {
  const s = await getSession();
  if (!s) redirect("/softnet/login");
  if (s.user.role !== "developer_admin") notFound();
  if (!s.mfaOk || Date.now() - s.recentAuthAt.getTime() > FRESH_MS) redirect("/softnet/login?again=1");
  return s;
}
