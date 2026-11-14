import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  destroyAuthSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ destroyAuthSession: mocks.destroyAuthSession }));

import { logoutAction } from "@/app/login/actions";

beforeEach(() => vi.clearAllMocks());

describe("sign-out action", () => {
  it("revokes the app session and asks Perminister to reauthenticate next time", async () => {
    await expect(logoutAction()).rejects.toThrow("redirect:/login?loggedOut=1");
    expect(mocks.destroyAuthSession).toHaveBeenCalledOnce();
  });
});
