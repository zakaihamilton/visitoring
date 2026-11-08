export const THEME_STORAGE_KEY = "visitoring-theme";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

const THEME_COLORS = {
  light: "#f5f7f4",
  dark: "#0d1615",
} as const;

const THEME_COLOR_MEDIA = {
  light: "(prefers-color-scheme: light)",
  dark: "(prefers-color-scheme: dark)",
} as const;

export function isThemePreference(value: string | null): value is ThemePreference {
  return value !== null && THEME_PREFERENCES.some((preference) => preference === value);
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference) {
  document.documentElement.dataset.theme = preference;
  applyThemeColorPreference(preference);
}

function applyThemeColorPreference(preference: ThemePreference) {
  const themeColorTags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');

  themeColorTags.forEach((tag) => {
    const variant =
      tag.dataset.visitoringThemeColor === "dark" || tag.media.includes("dark") ? "dark" : "light";
    tag.dataset.visitoringThemeColor = variant;
    tag.content = THEME_COLORS[variant];
    tag.media =
      preference === "system"
        ? THEME_COLOR_MEDIA[variant]
        : variant === preference
          ? "all"
          : "not all";
  });
}

export const THEME_BOOTSTRAP_SCRIPT = `try {
  var preference = localStorage.getItem("${THEME_STORAGE_KEY}");
  document.documentElement.dataset.theme = ["system", "light", "dark"].includes(preference) ? preference : "system";
} catch {
  document.documentElement.dataset.theme = "system";
}
function syncVisitoringThemeColor() {
  var preference = document.documentElement.dataset.theme || "system";
  var colors = ${JSON.stringify(THEME_COLORS)};
  var media = ${JSON.stringify(THEME_COLOR_MEDIA)};
  document.querySelectorAll('meta[name="theme-color"]').forEach(function (tag) {
    var variant = tag.dataset.visitoringThemeColor || (tag.media.indexOf("dark") !== -1 ? "dark" : "light");
    tag.dataset.visitoringThemeColor = variant;
    tag.content = colors[variant];
    tag.media = preference === "system" ? media[variant] : variant === preference ? "all" : "not all";
  });
}
syncVisitoringThemeColor();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncVisitoringThemeColor);`;
