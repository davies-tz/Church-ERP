import { api } from "./api";

export interface Grant {
  role_key: string;
  scope_path: string;
  capabilities: string[];
}

export interface Permissions {
  user_id: string;
  capabilities: string[];
  grants: Grant[];
}

export function fetchPermissions(): Promise<Permissions> {
  return api<Permissions>("/me/permissions");
}
