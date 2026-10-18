const KEY = "locale";

export const SUPPORTED_LOCALES = ["en", "sw"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function getStoredLocale(fallback: string): string {
  const stored = localStorage.getItem(KEY);
  return stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)
    ? stored
    : fallback;
}

export function storeLocale(locale: string): void {
  localStorage.setItem(KEY, locale);
}
