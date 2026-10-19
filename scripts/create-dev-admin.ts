/**
 * Creates a developer administrator for FODAN SOFTNET ADVMINISTRATIVE (the separate control plane).
 *   npm run admin:create-dev -- developer@example.com "Full Name"
 * Prints a temporary password and an authenticator (TOTP) secret ONCE. A second factor is mandatory for this plane.
 * Developer accounts can be revoked by the Super Admin (Admin > Integrations > Developer access).
 */
import fs from "node:fs";
import path from "node:path";
for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
}
(process.env as Record<string, string>).NODE_ENV ||= "development";

async function main() {
  const [email, name] = [process.argv[2], process.argv[3]];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) { console.error('Usage: npm run admin:create-dev -- email "Full Name"'); process.exit(1); }
  const OTPAuth = await import("otpauth");
  const { getDb, schema } = await import("../src/server/db");
  const { hashPassword } = await import("../src/server/auth/password");
  const { temporaryPassword, seal } = await import("../src/server/crypto");
  const { audit } = await import("../src/server/audit");
  const db = await getDb();
  const temp = temporaryPassword();
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ issuer: "FODAN SOFTNET", label: email, algorithm: "SHA1", digits: 6, period: 30, secret });
  const [u] = await db.insert(schema.users).values({ email: email.toLowerCase(), fullName: name, displayName: name.split(" ")[0], passwordHash: await hashPassword(temp), role: "developer_admin", status: "active", mustChangePassword: false, totpSecret: seal(secret.base32), totpEnabled: true }).returning();
  await audit({ id: null, label: "cli" }, "softnet.developer_created", { type: "user", id: u.id }, { email }, { plane: "softnet" });
  console.log(`Developer administrator created: ${email}\nPassword (change policy is up to you; store it in a password manager): ${temp}\nAuthenticator secret (add to an authenticator app): ${secret.base32}\nOr scan/open: ${totp.toString()}\nSign in at /softnet/login`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
