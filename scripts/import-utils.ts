import { cleanPath, cleanReferrerHost } from "@/lib/privacy";

export type SourceTelemetryEvent = {
  id: string;
  anonymous_id: string;
  session_id: string;
  event_name: string;
  path: string;
  referrer_host: string | null;
  properties: Record<string, unknown> | null;
  created_at: string;
};

export type SourceTelemetryRow = SourceTelemetryEvent & {
  cursor_created_at: string;
};

export function toImportedEvent(
  event: SourceTelemetryEvent,
  site: { id: string; workspaceId: string },
) {
  return {
    workspaceId: site.workspaceId,
    siteId: site.id,
    sourceId: `sentry8:${event.id}`,
    visitorId: event.anonymous_id,
    sessionId: event.session_id,
    eventName: event.event_name,
    path: cleanPath(event.path),
    referrerHost: cleanReferrerHost(event.referrer_host ?? undefined),
    properties: event.properties ?? {},
    device: null,
    browser: null,
    os: null,
    country: null,
    region: null,
    createdAt: event.created_at,
  };
}
