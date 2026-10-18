import { TENANT_SLUG } from "./tenant";

const TOKEN_KEY = "cerp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Slug": TENANT_SLUG,
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Authenticated multipart upload (CSV import, photos). Lets the browser set the
// multipart Content-Type/boundary itself — do NOT set Content-Type here.
export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = { "X-Tenant-Slug": TENANT_SLUG };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { method: "POST", headers, body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return (await res.json()) as T;
}

// Authenticated fetch of a binary resource (e.g. a photo) as an object URL for <img>.
// Returns null if the resource is missing.
export async function fetchObjectUrl(path: string): Promise<string | null> {
  const headers: Record<string, string> = { "X-Tenant-Slug": TENANT_SLUG };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { headers });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}

// Authenticated file download (CSV reports). Fetches with the same headers as api(),
// then triggers a browser download of the returned blob.
export async function downloadFile(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = { "X-Tenant-Slug": TENANT_SLUG };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { headers });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
