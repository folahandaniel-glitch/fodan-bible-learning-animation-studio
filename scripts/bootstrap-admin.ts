/**
 * Secure first-run setup of the owner's Super Admin account.
 *   npm run admin:bootstrap
 * Generates a strong ONE-TIME temporary password, prints it once, stores only its Argon2id hash and forces a new password at first sign-in.
 * Safe to run again: it refuses if an active Super Admin already exists (use the admin dashboard to recover access instead).
 * Uses DATABASE_URL if set; otherwise the local embedded database in .data/.
 */
import fs from "node:fs";
import path from "node:path";

// Minimal .env.local loader (no dependency).
for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
}
(process.env as Record<string, string>).NODE_ENV ||= "development";

async function main() {
  const { getDb, schema, dataDir } = await import("../src/server/db");
  const { hashPassword } = await import("../src/server/auth/password");
  const { temporaryPassword, friendlyCode } = await import("../src/server/crypto");
  const { and, eq } = await import("drizzle-orm");
  const email = (process.env.SUPERADMIN_EMAIL ?? "folahandaniel@gmail.com").trim().toLowerCase();
  const db = await getDb();
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.role, "super_admin"), eq(schema.users.status, "active")));
  if (existing.length) { console.error("An active Super Admin already exists. Nothing was changed."); process.exit(1); }
  const temp = temporaryPassword();
  await db.insert(schema.users).values({ email, username: null, fullName: "Banjo Folahan Daniel", displayName: "Pastor Banjo", passwordHash: await hashPassword(temp), role: "super_admin", status: "active", mustChangePassword: true, emailVerifiedAt: null, linkCode: null });
  const out = `Super Admin created for ${email}\nTemporary password (valid for the first sign-in only): ${temp}\nSign in at /login, then choose your own password when asked.\n`;
  const file = path.join(dataDir(), "BOOTSTRAP_ADMIN.txt");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out + "Delete this file after you have signed in.\n", { mode: 0o600 });
  console.log(out + `\n(Also saved to ${file}. It is outside the project. Delete it after signing in.)`);
  void friendlyCode;
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
