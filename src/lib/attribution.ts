import Bowser from "bowser";
import { access } from "node:fs/promises";
import maxmind, { type CityResponse, type Reader } from "maxmind";

type Attribution = {
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
};

type GeoRecord = {
  country?: { iso_code?: string };
  subdivisions?: Array<{ iso_code?: string }>;
};

let geoReader: Promise<Reader<CityResponse> | null> | undefined;

async function getGeoReader(): Promise<Reader<CityResponse> | null> {
  const path = process.env.GEOIP_DB_PATH;
  if (!path) return null;
  if (!geoReader) {
    geoReader = (async () => {
      try {
        await access(path);
        return await maxmind.open<CityResponse>(path);
      } catch {
        return null;
      }
    })();
  }
  return geoReader;
}

function category(
  value: string | undefined,
  choices: Record<string, string>,
  fallback: string,
): string {
  if (!value) return fallback;
  const lowered = value.toLowerCase();
  for (const [needle, result] of Object.entries(choices))
    if (lowered.includes(needle)) return result;
  return fallback;
}

export function parseUserAgent(
  userAgent: string | null,
): Pick<Attribution, "device" | "browser" | "os"> {
  if (!userAgent) return { device: null, browser: null, os: null };
  const result = Bowser.getParser(userAgent).getResult();
  const deviceType = result.platform.type;
  return {
    device:
      deviceType === "mobile"
        ? "mobile"
        : deviceType === "tablet"
          ? "tablet"
          : deviceType === "desktop"
            ? "desktop"
            : "other",
    browser: category(
      result.browser.name,
      { chrome: "chrome", chromium: "chrome", safari: "safari", firefox: "firefox", edge: "edge" },
      "other",
    ),
    os: category(
      result.os.name,
      { windows: "windows", mac: "macos", ios: "ios", android: "android", linux: "linux" },
      "other",
    ),
  };
}

export function coarseGeo(
  result: GeoRecord | null | undefined,
): Pick<Attribution, "country" | "region"> {
  return {
    country: result?.country?.iso_code?.slice(0, 2) ?? null,
    region: result?.subdivisions?.[0]?.iso_code?.slice(0, 16) ?? null,
  };
}

export async function lookupGeo(ip: string): Promise<Pick<Attribution, "country" | "region">> {
  const reader = await getGeoReader();
  if (!reader || ip === "unknown") return { country: null, region: null };
  try {
    return coarseGeo(reader.get(ip));
  } catch {
    return { country: null, region: null };
  }
}

export async function parseAttribution(ip: string, userAgent: string | null): Promise<Attribution> {
  return { ...parseUserAgent(userAgent), ...(await lookupGeo(ip)) };
}
