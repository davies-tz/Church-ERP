// Platform provisioning API client. These endpoints are NOT tenant-scoped; they are
// guarded by the operator token (X-Platform-Token), not a tenant JWT.

export interface TemplateLevel {
  key: string;
  label_en: string;
  label_sw: string;
}
export interface TemplateInfo {
  key: string;
  label: string;
  levels: TemplateLevel[];
}
export interface TenantSummary {
  slug: string;
  name: string;
  display_name: string;
}
export interface ProvisionResult {
  id: string;
  slug: string;
  name: string;
  admin_email: string;
  portal_path: string;
}
export interface ProvisionInput {
  slug: string;
  name: string;
  template: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  display_name?: string;
  color_primary?: string;
  color_accent?: string;
  default_locale: string;
}

async function pf<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Platform-Token": token,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const fetchTemplates = (token: string) =>
  pf<TemplateInfo[]>("/platform/templates", token);
export const fetchTenants = (token: string) =>
  pf<TenantSummary[]>("/platform/tenants", token);
export const provisionTenant = (token: string, body: ProvisionInput) =>
  pf<ProvisionResult>("/platform/tenants", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
