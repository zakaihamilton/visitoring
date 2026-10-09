import { z } from "zod";
import { cleanPath, cleanReferrerHost, isValidVisitorId } from "./privacy";

const idSchema = z.string().refine(isValidVisitorId, "Invalid visitor ID.");
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

const envelopeSchema = z
  .object({
    siteKey: z.string().optional(),
    visitorId: idSchema.optional(),
    sessionId: idSchema,
    eventName: z.string().min(1).max(128).optional(),
    path: z.string().min(1).max(4096),
    referrerHost: z.string().max(2048).optional(),
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
  const shared = envelopeSchema.safeParse(body);
  if (!shared.success) return null;
  const data = shared.data;
  const visitorId = data.visitorId;
  const eventName = data.eventName;
  if (!visitorId || !eventName) return null;

  return {
    siteKey: data.siteKey,
    visitorId,
    sessionId: data.sessionId,
    eventName,
    path: cleanPath(data.path),
    referrerHost: cleanReferrerHost(data.referrerHost) ?? undefined,
    properties: data.properties,
  };
}
