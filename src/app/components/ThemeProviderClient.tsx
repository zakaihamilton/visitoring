"use client";

import { ThemeProvider } from "panel-frame-ui";
import type { ReactNode } from "react";
import { applyThemePreference, THEME_STORAGE_KEY } from "./theme";

const themePersistence = {
  type: "localStorage" as const,
  key: THEME_STORAGE_KEY,
};

export function ThemeProviderClient({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      persistence={themePersistence}
      onThemeChange={applyThemePreference}
    >
      {children}
    </ThemeProvider>
  );
}
