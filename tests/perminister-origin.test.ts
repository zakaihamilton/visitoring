import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { perministerRecoveryUrl } from "@/lib/perminister-origin";

afterEach(() => vi.unstubAllEnvs());

it("uses the configured sign-in origin and rejects invalid origins", () => {
  vi.stubEnv("PERMINISTER_BASE_URL", "");
  expect(perministerRecoveryUrl()).toBe("https://www.perminister.com/forgot-password");
  vi.stubEnv("PERMINISTER_BASE_URL", "https://identity.example");
  expect(perministerRecoveryUrl()).toBe("https://identity.example/forgot-password");
  vi.stubEnv("PERMINISTER_BASE_URL", "https://user:secret@identity.example");
  expect(perministerRecoveryUrl()).toBeNull();
});
