import { z } from "zod";
import { cleanPath, cleanReferrerHost, isValidAnonymousId } from "./privacy";

const idSchema = z.string().refine(isValidAnonymousId, "Invalid anonymous ID.");
const objectProperties = z
  .record(z.string(), z.unknown())
  .default({})
  .refine((value) => {
    try {
      return Object.keys(value).length <= 40 && JSON.stringify(value).length <= 8_192;
    } catch {
      return false;
    }
  }, "Event properties are too large.");

const legacyProperties = z.discriminatedUnion("event", [
  z.object({ event: z.literal("welcome_view"), properties: z.object({}).strict().default({}) }),
  z.object({
    event: z.literal("welcome_cta_click"),
    properties: z
      .object({
        target: z.enum(["demo", "login", "email"]),
        placement: z.enum(["header", "hero", "footer"]),
      })
      .strict(),
  }),
  z.object({
    event: z.literal("welcome_scroll_depth"),
    properties: z
      .object({
        depth: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]),
      })
      .strict(),
  }),
  z.object({
    event: z.literal("welcome_section_view"),
    properties: z
      .object({
        section: z.enum([
          "hero",
          "metrics",
          "challenge_solution",
          "roadmap",
          "regulations",
          "practitioners",
          "footer_cta",
        ]),
      })
      .strict(),
  }),
  z.object({
    event: z.literal("welcome_regulation_tab"),
    properties: z
      .object({
        regulation: z.enum(["eu-ai-act", "iso-42001", "gdpr-pci", "sox"]),
      })
      .strict(),
  }),
]);

const envelopeSchema = z
  .object({
    siteKey: z.string().optional(),
    site_key: z.string().optional(),
    visitorId: idSchema.optional(),
    anonymousId: idSchema.optional(),
    anonymous_id: idSchema.optional(),
    sessionId: idSchema,
    event: z.string().min(1).max(128).optional(),
    eventName: z.string().min(1).max(128).optional(),
    name: z.string().min(1).max(128).optional(),
    path: z.string().min(1).max(4096),
    referrerHost: z.string().max(2048).optional(),
    referrer_host: z.string().max(2048).optional(),
    properties: objectProperties,
  })
  .passthrough();

type CollectInput = {
  siteKey?: string;
  visitorId: string;
  sessionId: string;
  eventName: string;
  path: string;
  referrerHost?: string;
  properties: Record<string, unknown>;
};

export function parseEnvelope(body: unknown): CollectInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const legacyName = typeof raw.event === "string" ? raw.event : null;
  const shared = envelopeSchema.safeParse(body);
  if (!shared.success) return null;
  const data = shared.data;
  const visitorId = data.visitorId ?? data.anonymousId ?? data.anonymous_id;
  const eventName = data.eventName ?? data.name ?? data.event;
  if (!visitorId || !eventName) return null;

  let properties = data.properties;
  if (legacyName?.startsWith("welcome_")) {
    const parsedLegacy = legacyProperties.safeParse({
      event: legacyName,
      properties: raw.properties ?? {},
    });
    if (!parsedLegacy.success) return null;
    properties = parsedLegacy.data.properties as Record<string, unknown>;
  }
  return {
    siteKey: data.siteKey ?? data.site_key,
    visitorId,
    sessionId: data.sessionId,
    eventName,
    path: cleanPath(data.path),
    referrerHost: cleanReferrerHost(data.referrerHost ?? data.referrer_host) ?? undefined,
    properties,
  };
}
