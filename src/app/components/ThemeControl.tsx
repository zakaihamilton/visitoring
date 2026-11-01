"use client";

import { useEffect, useState } from "react";
import { DropdownSelect } from "./DropdownSelect";
import styles from "./theme-control.module.css";
import {
  applyThemePreference,
  isThemePreference,
  readThemePreference,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

const themeLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const storedPreference = readThemePreference();
    setPreference(storedPreference);
    applyThemePreference(storedPreference);

    function syncPreference(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const nextPreference = readThemePreference();
      setPreference(nextPreference);
      applyThemePreference(nextPreference);
    }

    window.addEventListener("storage", syncPreference);
    return () => window.removeEventListener("storage", syncPreference);
  }, []);

  function handleChange(value: string) {
    if (!isThemePreference(value)) return;

    setPreference(value);
    applyThemePreference(value);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Keep the selected theme active for this page when storage is unavailable.
    }
  }

  return (
    <div className={styles.control}>
      <label htmlFor="color-theme">Theme</label>
      <DropdownSelect
        id="color-theme"
        name="colorTheme"
        aria-label="Color theme"
        options={THEME_PREFERENCES.map((value) => ({ value, label: themeLabels[value] }))}
        value={preference}
        onValueChange={handleChange}
        compact
      />
    </div>
  );
}
