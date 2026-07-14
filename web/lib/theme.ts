export const THEME_STORAGE_KEY = "weft-theme";

export type Theme = "dark" | "light";

/**
 * Inline script source injected into <head> so the persisted theme applies
 * before first paint (no flash of the wrong theme on reload).
 */
export function getInitialThemeScript(): string {
  return `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"dark";document.documentElement.classList.toggle("dark",t==="dark");}catch(e){}})();`;
}

export function readDocumentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function toggleDocumentTheme(): Theme {
  const next: Theme = readDocumentTheme() === "dark" ? "light" : "dark";
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // localStorage unavailable — theme just won't persist across reloads
  }
  return next;
}
