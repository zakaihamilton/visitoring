import { hash } from "@node-rs/argon2";
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { db, pool } from "@/db";
import { authSessions, siteEvents, sites, users, workspaces } from "@/db/schema";
import { createSiteKey, sha256 } from "@/lib/crypto";
import {
  authenticateWorkspaceUser,
  changeWorkspaceUserRole,
  createWorkspaceUser,
  deactivateWorkspaceUser,
  deleteWorkspaceUser,
  reactivateWorkspaceUser,
  resetWorkspaceUserPassword,
} from "@/lib/user-management";

const integration = Boolean(process.env.DATABASE_URL);
const suite = integration ? describe : describe.skip;
const initialPassword = "initial-password-123";
const nextPassword = "replacement-password-456";
const createdWorkspaceIds: string[] = [];

type Fixture = {
  workspaceId: string;
  slug: string;
  adminIds: string[];
  viewerIds: string[];
};

async function makeFixture({ admins = 1, viewers = 1 } = {}): Promise<Fixture> {
  const slug = `user-test-${randomUUID().slice(0, 8)}`;
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: "User management integration", slug })
    .returning({ id: workspaces.id });
  if (!workspace) throw new Error("Could not create a user management test workspace.");
  createdWorkspaceIds.push(workspace.id);

  const passwordHash = await hash(initialPassword);
  const adminIds: string[] = [];
  const viewerIds: string[] = [];
  for (let index = 0; index < admins; index += 1) {
    const [admin] = await db
      .insert(users)
      .values({
        workspaceId: workspace.id,
        email: `admin-${index}@example.test`,
        passwordHash,
        role: "admin",
      })
      .returning({ id: users.id });
    if (!admin) throw new Error("Could not create a test admin.");
    adminIds.push(admin.id);
  }
  for (let index = 0; index < viewers; index += 1) {
    const [viewer] = await db
      .insert(users)
      .values({
        workspaceId: workspace.id,
        email: `viewer-${index}@example.test`,
        passwordHash,
        role: "viewer",
      })
      .returning({ id: users.id });
    if (!viewer) throw new Error("Could not create a test viewer.");
    viewerIds.push(viewer.id);
  }

  return { workspaceId: workspace.id, slug, adminIds, viewerIds };
}

async function addSession(userId: string): Promise<void> {
  await db.insert(authSessions).values({
    userId,
    tokenHash: randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + 60_000),
  });
}

suite("workspace user management", () => {
  afterAll(async () => {
    if (createdWorkspaceIds.length)
      await db.delete(workspaces).where(inArray(workspaces.id, createdWorkspaceIds));
    await pool.end();
  });

  it("creates normalized viewer accounts and rejects invalid or duplicate input", async () => {
    const fixture = await makeFixture();
    const created = await createWorkspaceUser({
      workspaceId: fixture.workspaceId,
      email: "  New.Member@Example.test  ",
      password: initialPassword,
      role: "viewer",
    });
    expect(created.error).toBeUndefined();

    const [member] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.workspaceId, fixture.workspaceId), eq(users.email, "new.member@example.test")),
      )
      .limit(1);
    expect(member).toMatchObject({ role: "viewer", isActive: true });

    const duplicate = await createWorkspaceUser({
      workspaceId: fixture.workspaceId,
      email: "NEW.MEMBER@example.test",
      password: initialPassword,
      role: "admin",
    });
    expect(duplicate.error).toBe(true);

    expect(
      (
        await createWorkspaceUser({
          workspaceId: fixture.workspaceId,
          email: "not-an-email",
          password: initialPassword,
          role: "viewer",
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await createWorkspaceUser({
          workspaceId: fixture.workspaceId,
          email: "long-password@example.test",
          password: "short",
          role: "viewer",
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await createWorkspaceUser({
          workspaceId: fixture.workspaceId,
          email: "invalid-role@example.test",
          password: initialPassword,
          role: "owner",
        })
      ).error,
    ).toBe(true);
  });

  it("scopes account changes to a workspace and blocks self-management", async () => {
    const fixture = await makeFixture();
    const other = await makeFixture();
    const [foreignUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.workspaceId, other.workspaceId))
      .limit(1);
    if (!foreignUser) throw new Error("Could not find the foreign test account.");

    const outsideWorkspace = await changeWorkspaceUserRole({
      actorId: fixture.adminIds[0],
      workspaceId: fixture.workspaceId,
      userId: foreignUser.id,
      role: "admin",
    });
    expect(outsideWorkspace.error).toBe(true);
    await addSession(foreignUser.id);
    expect(
      (
        await resetWorkspaceUserPassword({
          actorId: fixture.adminIds[0],
          workspaceId: fixture.workspaceId,
          userId: foreignUser.id,
          password: nextPassword,
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await deactivateWorkspaceUser({
          actorId: fixture.adminIds[0],
          workspaceId: fixture.workspaceId,
          userId: foreignUser.id,
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await reactivateWorkspaceUser({
          actorId: fixture.adminIds[0],
          workspaceId: fixture.workspaceId,
          userId: foreignUser.id,
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await deleteWorkspaceUser({
          actorId: fixture.adminIds[0],
          workspaceId: fixture.workspaceId,
          userId: foreignUser.id,
        })
      ).error,
    ).toBe(true);
    expect(
      await authenticateWorkspaceUser({
        email: "admin-0@example.test",
        workspaceSlug: other.slug,
        password: initialPassword,
      }),
    ).toMatchObject({ id: foreignUser.id });
    const [foreignSessions] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(authSessions)
      .where(eq(authSessions.userId, foreignUser.id));
    expect(foreignSessions?.count).toBe(1);

    const adminId = fixture.adminIds[0];
    expect(
      (
        await changeWorkspaceUserRole({
          actorId: adminId,
          workspaceId: fixture.workspaceId,
          userId: adminId,
          role: "viewer",
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await resetWorkspaceUserPassword({
          actorId: adminId,
          workspaceId: fixture.workspaceId,
          userId: adminId,
          password: nextPassword,
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await deactivateWorkspaceUser({
          actorId: adminId,
          workspaceId: fixture.workspaceId,
          userId: adminId,
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await deleteWorkspaceUser({
          actorId: adminId,
          workspaceId: fixture.workspaceId,
          userId: adminId,
        })
      ).error,
    ).toBe(true);

    const [unchanged] = await db.select().from(users).where(eq(users.id, foreignUser.id)).limit(1);
    expect(unchanged?.role).toBe("admin");
  });

  it("changes roles while preserving one active admin", async () => {
    const fixture = await makeFixture({ admins: 2, viewers: 1 });
    const [firstAdmin, secondAdmin] = fixture.adminIds;
    const demotion = await changeWorkspaceUserRole({
      actorId: firstAdmin,
      workspaceId: fixture.workspaceId,
      userId: secondAdmin,
      role: "viewer",
    });
    expect(demotion.error).toBeUndefined();

    const [lastAdmin] = await db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, firstAdmin))
      .limit(1);
    if (!lastAdmin) throw new Error("Could not find the remaining admin.");
    const protectedDemotion = await changeWorkspaceUserRole({
      actorId: fixture.viewerIds[0],
      workspaceId: fixture.workspaceId,
      userId: lastAdmin.id,
      role: "viewer",
    });
    expect(protectedDemotion.error).toBe(true);
    expect(lastAdmin).toMatchObject({ role: "admin", isActive: true });
  });

  it("serializes simultaneous admin changes so at least one admin remains", async () => {
    const fixture = await makeFixture({ admins: 2 });
    const [firstAdmin, secondAdmin] = fixture.adminIds;
    const results = await Promise.all([
      changeWorkspaceUserRole({
        actorId: firstAdmin,
        workspaceId: fixture.workspaceId,
        userId: secondAdmin,
        role: "viewer",
      }),
      changeWorkspaceUserRole({
        actorId: secondAdmin,
        workspaceId: fixture.workspaceId,
        userId: firstAdmin,
        role: "viewer",
      }),
    ]);
    expect(results.filter((result) => !result.error)).toHaveLength(1);
    expect(results.filter((result) => result.error)).toHaveLength(1);

    const [remaining] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.workspaceId, fixture.workspaceId),
          eq(users.role, "admin"),
          eq(users.isActive, true),
        ),
      );
    expect(remaining?.count).toBe(1);
  });

  it("revokes sessions on password reset and requires the new password", async () => {
    const fixture = await makeFixture();
    const [created] = await db
      .insert(users)
      .values({
        workspaceId: fixture.workspaceId,
        email: "reset@example.test",
        passwordHash: await hash(initialPassword),
        role: "viewer",
      })
      .returning({ id: users.id });
    if (!created) throw new Error("Could not create the reset test account.");
    await addSession(created.id);

    const reset = await resetWorkspaceUserPassword({
      actorId: fixture.adminIds[0],
      workspaceId: fixture.workspaceId,
      userId: created.id,
      password: nextPassword,
    });
    expect(reset.error).toBeUndefined();
    const [sessionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(authSessions)
      .where(eq(authSessions.userId, created.id));
    expect(sessionCount?.count).toBe(0);
    expect(
      await authenticateWorkspaceUser({
        email: "reset@example.test",
        workspaceSlug: fixture.slug,
        password: initialPassword,
      }),
    ).toBeNull();
    expect(
      await authenticateWorkspaceUser({
        email: "reset@example.test",
        workspaceSlug: fixture.slug,
        password: nextPassword,
      }),
    ).toMatchObject({ id: created.id });
  });

  it("deactivates users, rejects their login, and lets an admin reactivate them", async () => {
    const fixture = await makeFixture();
    const [created] = await db
      .insert(users)
      .values({
        workspaceId: fixture.workspaceId,
        email: "deactivate@example.test",
        passwordHash: await hash(initialPassword),
        role: "viewer",
      })
      .returning({ id: users.id });
    if (!created) throw new Error("Could not create the deactivation test account.");
    await addSession(created.id);

    const deactivated = await deactivateWorkspaceUser({
      actorId: fixture.adminIds[0],
      workspaceId: fixture.workspaceId,
      userId: created.id,
    });
    expect(deactivated.error).toBeUndefined();
    expect(
      await authenticateWorkspaceUser({
        email: "deactivate@example.test",
        workspaceSlug: fixture.slug,
        password: initialPassword,
      }),
    ).toBeNull();
    const [sessionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(authSessions)
      .where(eq(authSessions.userId, created.id));
    expect(sessionCount?.count).toBe(0);

    const reactivated = await reactivateWorkspaceUser({
      actorId: fixture.adminIds[0],
      workspaceId: fixture.workspaceId,
      userId: created.id,
    });
    expect(reactivated.error).toBeUndefined();
    expect(
      await authenticateWorkspaceUser({
        email: "deactivate@example.test",
        workspaceSlug: fixture.slug,
        password: initialPassword,
      }),
    ).toMatchObject({ id: created.id });
  });

  it("deletes the account and sessions without deleting workspace analytics", async () => {
    const fixture = await makeFixture();
    const [created] = await db
      .insert(users)
      .values({
        workspaceId: fixture.workspaceId,
        email: "delete@example.test",
        passwordHash: await hash(initialPassword),
        role: "viewer",
      })
      .returning({ id: users.id });
    if (!created) throw new Error("Could not create the deletion test account.");
    await addSession(created.id);

    const key = createSiteKey();
    const [site] = await db
      .insert(sites)
      .values({
        workspaceId: fixture.workspaceId,
        name: "Delete test site",
        allowedDomains: ["users-test.example"],
        siteKeyHash: sha256(key),
        siteKeyPrefix: key.slice(0, 11),
      })
      .returning({ id: sites.id });
    if (!site) throw new Error("Could not create a deletion test site.");
    const [event] = await db
      .insert(siteEvents)
      .values({
        workspaceId: fixture.workspaceId,
        siteId: site.id,
        visitorId: "user-delete-test-visitor",
        sessionId: "user-delete-test-session",
        eventName: "page_view",
        path: "/",
        properties: {},
      })
      .returning({ id: siteEvents.id });
    if (!event) throw new Error("Could not create a deletion test event.");

    const deleted = await deleteWorkspaceUser({
      actorId: fixture.adminIds[0],
      workspaceId: fixture.workspaceId,
      userId: created.id,
    });
    expect(deleted.error).toBeUndefined();
    expect(await db.select().from(users).where(eq(users.id, created.id))).toHaveLength(0);
    expect(
      await db.select().from(authSessions).where(eq(authSessions.userId, created.id)),
    ).toHaveLength(0);
    expect(await db.select().from(siteEvents).where(eq(siteEvents.id, event.id))).toHaveLength(1);

    const reusedEmail = await createWorkspaceUser({
      workspaceId: fixture.workspaceId,
      email: "delete@example.test",
      password: initialPassword,
      role: "viewer",
    });
    expect(reusedEmail.error).toBeUndefined();
  });
});

describe("user management without a database", () => {
  it("rejects self-management before attempting database work", async () => {
    const input = { actorId: "same-user", workspaceId: "unused", userId: "same-user" };
    expect((await changeWorkspaceUserRole({ ...input, role: "viewer" })).error).toBe(true);
    expect((await resetWorkspaceUserPassword({ ...input, password: nextPassword })).error).toBe(
      true,
    );
    expect((await deactivateWorkspaceUser(input)).error).toBe(true);
    expect((await reactivateWorkspaceUser(input)).error).toBe(true);
    expect((await deleteWorkspaceUser(input)).error).toBe(true);
  });

  it("validates user fields before touching the database", async () => {
    const input = { workspaceId: "unused", email: "invalid", password: "short", role: "owner" };
    expect((await createWorkspaceUser(input)).error).toBe(true);
  });
});
