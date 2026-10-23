import { z } from "zod";
import { cleanPath, cleanReferrerHost, isValidVisitorId } from "./privacy";

const MAX_PROPERTY_DEPTH = 3;
const MAX_PROPERTY_KEY_LENGTH = 64;

function isBoundedPropertyValue(value: unknown, depth = 0): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value !== "number" || Number.isFinite(value);
  }
  if (depth >= MAX_PROPERTY_DEPTH) return false;
  if (Array.isArray(value)) {
    return value.length <= 40 && value.every((item) => isBoundedPropertyValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      entries.length <= 40 &&
      entries.every(
        ([key, child]) =>
          key.length >= 1 &&
          key.length <= MAX_PROPERTY_KEY_LENGTH &&
          isBoundedPropertyValue(child, depth + 1),
      )
    );
  }
  return false;
}

const idSchema = z.string().refine(isValidVisitorId, "Invalid visitor ID.");
const objectProperties = z
  .record(z.string().min(1).max(MAX_PROPERTY_KEY_LENGTH), z.unknown())
  .default({})
  .refine((value) => {
    try {
      return (
        Object.keys(value).length <= 40 &&
        JSON.stringify(value).length <= 8_192 &&
        isBoundedPropertyValue(value)
      );
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
