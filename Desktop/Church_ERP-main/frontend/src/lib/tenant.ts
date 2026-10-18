// Work out which church this browser is visiting.
// Production: subdomain (grace.churcherp.app). Local dev: ?tenant=grace or
// grace.localhost:5173. Falls back to "grace" so the demo just works.
export function resolveTenantSlug(): string {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("tenant");
  if (fromQuery) {
    localStorage.setItem("tenant_slug", fromQuery);
    return fromQuery;
  }

  const host = window.location.hostname; // e.g. grace.localhost or grace.churcherp.app
  const parts = host.split(".");
  const isPlainHost = host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (!isPlainHost && parts.length > 1) {
    return parts[0];
  }

  return localStorage.getItem("tenant_slug") || "grace";
}

export const TENANT_SLUG = resolveTenantSlug();
