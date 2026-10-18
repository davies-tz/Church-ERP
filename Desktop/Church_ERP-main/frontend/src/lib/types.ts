export interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_slug: string;
  member_id?: string | null;
  verification_status?: string | null;
}

export interface ChurchOption {
  id: string;
  name: string;
  level_key: string;
}

export interface Member {
  id: string;
  member_no: string;
  full_name: string;
  status: string;
  org_unit_id: string | null;
  org_unit_name: string | null;
  member_type: string | null;
  gender: string | null;
  dob: string | null;
  marital_status: string | null;
  occupation: string | null;
  education: string | null;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  region: string | null;
  district: string | null;
  ward: string | null;
  street: string | null;
  spouse_name: string | null;
  emergency_contact: string | null;
  has_photo: boolean;
}

export interface Level {
  key: string;
  label_en: string;
  label_sw: string;
  depth: number;
  parent_key: string | null;
}

export interface Leader {
  role_key: string;
  role_label_en: string;
  role_label_sw: string;
  user_name: string;
}

export interface OrgUnit {
  id: string;
  level_key: string;
  name: string;
  code: string | null;
  region: string | null;
  district: string | null;
  parent_id: string | null;
  path: string;
  depth: number;
  leaders: Leader[];
}

export interface ImportResult {
  created: number;
  errors: string[];
}

export interface Assignment {
  id: string;
  user_id: string;
  user_name: string;
  role_key: string;
  role_label_en: string;
  role_label_sw: string;
  org_unit_id: string | null;
  org_unit_name: string | null;
  scope_path: string;
  active: boolean;
  temp_password?: string | null;
}

export interface Role {
  key: string;
  label_en: string;
  label_sw: string;
  capabilities: string[];
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SacramentType {
  key: string;
  label_en: string;
  label_sw: string;
}

export interface Annotation {
  text: string;
  source_unit_name: string | null;
}

export interface Sacrament {
  id: string;
  type: string;
  type_label_en: string;
  type_label_sw: string;
  date: string;
  place: string | null;
  minister_name: string | null;
  register_book: string | null;
  register_page: string | null;
  witnesses: string[];
  spouse_name: string | null;
  notes: string | null;
  is_master: boolean;
  annotations: Annotation[];
}

export interface Timeline {
  member_id: string;
  member_name: string;
  member_no: string;
  records: Sacrament[];
}

export interface ServiceType {
  key: string;
  label_en: string;
  label_sw: string;
  sacrament_type: string | null;
}

export interface ServiceRequest {
  id: string;
  member_id: string;
  member_name: string;
  type: string;
  type_label_en: string;
  type_label_sw: string;
  sacrament_type: string | null;
  status: string;
  place: string | null;
  scheduled_date: string | null;
  notes: string | null;
  requested_by_name: string | null;
  decided_by_name: string | null;
  produced_record_id: string | null;
  produced_fee_id: string | null;
}

export interface FinanceCategory {
  key: string;
  label_en: string;
  label_sw: string;
  direction: string;
}

export interface PaymentMethod {
  key: string;
  label_en: string;
  label_sw: string;
}

export interface FinanceEntry {
  id: string;
  date: string;
  category: string;
  direction: string;
  amount: number;
  currency: string;
  method: string | null;
  member_id: string | null;
  member_name: string | null;
  note: string | null;
  approval_status: string;
  recorded_by_name: string | null;
  approved_by_name: string | null;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  net: number;
  pending: number;
  currency: string;
}

export interface AssetType {
  key: string;
  label_en: string;
  label_sw: string;
}

export interface Asset {
  id: string;
  type: string;
  name: string;
  org_unit_id: string | null;
  org_unit_name: string | null;
  code: string | null;
  acquisition_date: string | null;
  value: number | null;
  currency: string;
  condition: string | null;
  reg_no: string | null;
  custodian: string | null;
  status: string;
  notes: string | null;
}

export interface Maintenance {
  id: string;
  date: string;
  action: string;
  cost: number | null;
  note: string | null;
  recorded_by_name: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  reorder_level: number | null;
  low_stock: boolean;
  org_unit_name: string | null;
}

export interface AssetSummary {
  total_value: number;
  total_count: number;
  by_type: Record<string, { count: number; value: number }>;
  low_stock: number;
  currency: string;
}

export interface Dashboard {
  members_total: number;
  units_total: number;
  requests_pending: number;
  finance: FinanceSummary;
  assets: AssetSummary;
  sacraments_by_type: { key: string; label_en: string; label_sw: string; count: number }[];
  members_by_unit: { name: string; count: number }[];
  finance_by_category: {
    category: string;
    label_en: string;
    label_sw: string;
    direction: string;
    total: number;
  }[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  category: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface VerificationDoc {
  id: string;
  filename: string;
  content_type: string;
}

export interface VerificationRequest {
  id: string;
  member_id: string;
  member_name: string;
  baptized_at_unit_id: string | null;
  baptized_at_unit_name: string | null;
  never_baptized: boolean;
  note: string | null;
  status: string;
  created_at: string;
  documents: VerificationDoc[];
}

export interface MyVerification {
  verification_status: string | null;
  request: VerificationRequest | null;
}

export interface TransferRequest {
  id: string;
  member_id: string;
  member_name: string;
  from_unit_id: string | null;
  from_unit_name: string | null;
  to_unit_id: string;
  to_unit_name: string;
  reason: string | null;
  status: string;
  has_letter: boolean;
  created_at: string;
}

export interface MyTransfer {
  request: TransferRequest | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  urgency: string;
  org_unit_id: string | null;
  org_unit_name: string | null;
  published_by_name: string | null;
  created_at: string;
}

export interface LatestAnnouncement {
  announcement: Announcement | null;
}

export type T = (key: string) => string;
