"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type VisitoringStatus = "loading" | "ready" | "error";
export type VisitoringProperties = Record<string, unknown>;

export interface VisitoringApi {
  track(name: string, properties?: VisitoringProperties): void;
}

declare global {
  interface Window {
    Visitoring?: VisitoringApi;
  }
}

export interface VisitoringProviderProps {
  siteKey: string;
  scriptUrl?: string;
  endpoint?: string;
  children: ReactNode;
}

export interface VisitoringClient {
  status: VisitoringStatus;
  track(name: string, properties?: VisitoringProperties): void;
}

interface TrackCall {
  configKey: string;
  name: string;
  properties?: VisitoringProperties;
}

interface LoaderRegistry {
  configKey: string;
  promise: Promise<void>;
}

interface VisitoringWindow extends Window {
  __visitoringReactLoaderV1?: LoaderRegistry;
}

const DEFAULT_SCRIPT_URL = "https://visitoring.vercel.app/tracker.js";
const SCRIPT_ID = "visitoring-react-tracker";
const MAX_QUEUED_EVENTS = 100;
const VisitoringContext = createContext<VisitoringClient | null>(null);

function configKeyFor(siteKey: string, scriptUrl: string, endpoint?: string): string {
  return JSON.stringify([siteKey, scriptUrl, endpoint ?? ""]);
}

function loadTracker(
  configKey: string,
  siteKey: string,
  scriptUrl: string,
  endpoint?: string,
): Promise<void> {
  const targetWindow = window as VisitoringWindow;
  const existing = targetWindow.__visitoringReactLoaderV1;
  if (existing) {
    if (existing.configKey === configKey) return existing.promise;
    return Promise.reject(
      new Error("Only one Visitoring site configuration can be used on a page."),
    );
  }

  const existingApi = typeof window.Visitoring?.track === "function";
  const existingScript = document.querySelector<HTMLScriptElement>("script[data-site-key]");
  if (existingApi || existingScript) {
    return Promise.reject(
      new Error("A Visitoring tracker is already present outside VisitoringProvider."),
    );
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = scriptUrl;
    script.dataset.siteKey = siteKey;
    if (endpoint) script.dataset.endpoint = endpoint;

    script.addEventListener(
      "load",
      () => {
        if (typeof window.Visitoring?.track !== "function") {
          reject(new Error("The Visitoring tracker loaded without exposing its event API."));
          return;
        }
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`The Visitoring tracker failed to load from ${scriptUrl}.`)),
      { once: true },
    );
    document.head.appendChild(script);
  });

  targetWindow.__visitoringReactLoaderV1 = { configKey, promise };
  return promise;
}

export function VisitoringProvider({
  siteKey,
  scriptUrl = DEFAULT_SCRIPT_URL,
  endpoint,
  children,
}: VisitoringProviderProps) {
  const configKey = configKeyFor(siteKey, scriptUrl, endpoint);
  const queue = useRef<TrackCall[]>([]);
  const readyConfigKey = useRef<string | null>(null);
  const [loadState, setLoadState] = useState<{
    configKey: string;
    status: VisitoringStatus;
  }>({ configKey, status: "loading" });
  const loadStateRef = useRef(loadState);

  useEffect(() => {
    let active = true;
    readyConfigKey.current = null;
    loadStateRef.current = { configKey, status: "loading" };

    if (!/^vk_[A-Za-z0-9_-]+$/.test(siteKey)) {
      queue.current = [];
      const error = new Error("VisitoringProvider requires a valid Visitoring site key.");
      loadStateRef.current = { configKey, status: "error" };
      setLoadState(loadStateRef.current);
      console.error(error);
      return () => {
        active = false;
      };
    }

    loadTracker(configKey, siteKey, scriptUrl, endpoint)
      .then(() => {
        if (!active) return;
        const track = window.Visitoring?.track;
        if (typeof track !== "function") {
          throw new Error("The Visitoring tracker event API is unavailable.");
        }
        readyConfigKey.current = configKey;
        loadStateRef.current = { configKey, status: "ready" };
        setLoadState(loadStateRef.current);
        const pending = queue.current.filter((call) => call.configKey === configKey);
        queue.current = queue.current.filter((call) => call.configKey !== configKey);
        for (const call of pending) track.call(window.Visitoring, call.name, call.properties);
      })
      .catch((error: unknown) => {
        if (!active) return;
        queue.current = [];
        readyConfigKey.current = null;
        loadStateRef.current = { configKey, status: "error" };
        setLoadState(loadStateRef.current);
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, [configKey, endpoint, scriptUrl, siteKey]);

  const track = useCallback(
    (name: string, properties?: VisitoringProperties) => {
      const currentState = loadStateRef.current;
      if (currentState.configKey === configKey && currentState.status === "error") return;
      if (readyConfigKey.current === configKey) {
        window.Visitoring?.track(name, properties);
        return;
      }
      if (queue.current.length >= MAX_QUEUED_EVENTS) return;
      queue.current.push({ configKey, name, properties });
    },
    [configKey],
  );

  const status = loadState.configKey === configKey ? loadState.status : "loading";
  const value = useMemo<VisitoringClient>(() => ({ status, track }), [status, track]);

  return <VisitoringContext.Provider value={value}>{children}</VisitoringContext.Provider>;
}

export function useVisitoring(): VisitoringClient {
  const client = useContext(VisitoringContext);
  if (!client) {
    throw new Error("useVisitoring must be used within a VisitoringProvider.");
  }
  return client;
}
