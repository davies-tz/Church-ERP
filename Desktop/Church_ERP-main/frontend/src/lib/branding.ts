import { api } from "./api";

export interface Branding {
  slug: string;
  name: string;
  display_name: string;
  tagline: string | null;
  logo_light_url: string | null;
  login_bg_url: string | null;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  font_key: string;
  default_locale: string;
  enabled_locales: string[];
}

export function fetchBranding(): Promise<Branding> {
  return api<Branding>("/tenant/branding");
}

// Apply the tenant's look by injecting CSS custom properties. Only structured,
// validated tokens are used here — never raw CSS from the tenant.
export function applyBranding(b: Branding) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", b.color_primary);
  root.style.setProperty("--brand-secondary", b.color_secondary);
  root.style.setProperty("--brand-accent", b.color_accent);
  root.style.setProperty("--brand-font", b.font_key);
  document.title = `${b.display_name} — Church ERP`;
}
