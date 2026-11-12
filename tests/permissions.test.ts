import { beforeAll, describe, expect, it } from "vitest";
process.env.FBL_DB_MEMORY = "1";
(process.env as Record<string, string>).NODE_ENV = "test";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { can, hasAdminAccess } from "@/lib/permissions";
import { setExtraPerms } from "@/server/services/admin-users";

describe("assignable admin permissions", () => {
  it("role defaults are unchanged and string subjects stay role-only", () => {
    expect(can("content_editor", "site.edit")).toBe(false);
    expect(can("super_admin", "users.manage")).toBe(true);
    expect(can(null, "site.edit")).toBe(false);
  });
  it("granted permissions apply to staff, never to learners, and users.manage is never grantable", () => {
    const editor = { role: "content_editor" as const, extraPerms: ["site.edit", "users.manage"] };
    expect(can(editor, "site.edit")).toBe(true);
    expect(can(editor, "users.manage")).toBe(false);
    expect(can(editor, "finance.view")).toBe(false);
    expect(can({ role: "student" as const, extraPerms: ["site.edit"] }, "site.edit")).toBe(false);
    expect(can({ role: "parent" as const, extraPerms: ["site.edit"] }, "site.edit")).toBe(false);
    expect(hasAdminAccess({ role: "teacher" as const, extraPerms: ["site.edit"] })).toBe(true);
    expect(hasAdminAccess({ role: "teacher" as const, extraPerms: [] })).toBe(false);
  });
  describe("setExtraPerms", () => {
    let boss = "", editor = "", kid = "";
    const mk = async (role: "super_admin" | "content_editor" | "student", tag: string) => {
      const db = await getDb();
      const [u] = await db.insert(schema.users).values({ email: `${tag}${Date.now()}@example.com`, fullName: tag, displayName: tag, passwordHash: "x", role }).returning();
      return u.id;
    };
    beforeAll(async () => { boss = await mk("super_admin", "boss"); editor = await mk("content_editor", "ed"); kid = await mk("student", "kid"); });
    it("only the Super Admin can assign; unknown and unsafe permissions are dropped; audited", async () => {
      const actor = { id: boss, role: "super_admin" };
      await expect(setExtraPerms(actor, { id: editor, role: "content_editor" }, editor, ["site.edit"])).rejects.toThrow(/Only the Super Admin/);
      const saved = await setExtraPerms(actor, { id: boss, role: "super_admin" }, editor, ["site.edit", "users.manage", "nonsense", "site.edit"]);
      expect(saved).toEqual(["site.edit"]);
      const db = await getDb();
      const [row] = await db.select().from(schema.users).where(eq(schema.users.id, editor));
      expect(row.extraPerms).toEqual(["site.edit"]);
      const log = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "user.permissions_set"));
      expect(log.length).toBeGreaterThan(0);
    });
    it("refuses learners and the Super Admin", async () => {
      const actor = { id: boss, role: "super_admin" };
      await expect(setExtraPerms(actor, { id: boss, role: "super_admin" }, kid, ["site.edit"])).rejects.toThrow(/cannot receive/);
      await expect(setExtraPerms(actor, { id: boss, role: "super_admin" }, boss, ["site.edit"])).rejects.toThrow(/already holds/);
    });
  });
});
