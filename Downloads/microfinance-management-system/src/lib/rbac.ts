/**
 * Granular Hierarchical Role-Based Access Control (RBAC) System
 * Defines institutional permissions for IMARA Finance SaaS Platform
 */

export type Role =
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'BRANCH_MANAGER'
  | 'HEAD_OFFICE_MANAGER'
  | 'FIELD_OFFICER'
  | 'LOAN_OFFICER'
  | 'ACCOUNTANT'
  | 'AUDITOR'
  | 'CUSTOMER';

export type Permission =
  | 'users.create'
  | 'users.read'
  | 'users.update'
  | 'users.disable'
  | 'users.assign_branch'
  | 'customers.create'
  | 'customers.read'
  | 'customers.update'
  | 'customers.assign'
  | 'loans.create'
  | 'loans.read'
  | 'loans.update'
  | 'loans.submit'
  | 'loans.assess'
  | 'loans.approve'
  | 'loans.reject'
  | 'loans.disburse'
  | 'repayments.create'
  | 'repayments.read'
  | 'repayments.reverse'
  | 'savings.create'
  | 'savings.read'
  | 'accounting.read'
  | 'accounting.post'
  | 'reports.read'
  | 'reports.export'
  | 'audit.read'
  | 'settings.manage';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'users.create',
    'users.read',
    'users.update',
    'users.disable',
    'users.assign_branch',
    'customers.create',
    'customers.read',
    'customers.update',
    'customers.assign',
    'loans.create',
    'loans.read',
    'loans.update',
    'loans.submit',
    'loans.assess',
    'loans.approve',
    'loans.reject',
    'loans.disburse',
    'repayments.create',
    'repayments.read',
    'repayments.reverse',
    'savings.create',
    'savings.read',
    'accounting.read',
    'accounting.post',
    'reports.read',
    'reports.export',
    'audit.read',
    'settings.manage',
  ],

  HEAD_OFFICE_MANAGER: [
    'users.create',
    'users.read',
    'users.update',
    'users.disable',
    'users.assign_branch',
    'customers.create',
    'customers.read',
    'customers.update',
    'customers.assign',
    'loans.create',
    'loans.read',
    'loans.update',
    'loans.submit',
    'loans.assess',
    'loans.approve',
    'loans.reject',
    'loans.disburse',
    'repayments.create',
    'repayments.read',
    'repayments.reverse',
    'savings.create',
    'savings.read',
    'accounting.read',
    'accounting.post',
    'reports.read',
    'reports.export',
    'audit.read',
    'settings.manage',
  ],

  MANAGER: [
    'users.create',
    'users.read',
    'users.update',
    'users.disable',
    'users.assign_branch',
    'customers.create',
    'customers.read',
    'customers.update',
    'customers.assign',
    'loans.create',
    'loans.read',
    'loans.update',
    'loans.submit',
    'loans.assess',
    'loans.approve',
    'loans.reject',
    'loans.disburse',
    'repayments.create',
    'repayments.read',
    'savings.create',
    'savings.read',
    'accounting.read',
    'reports.read',
    'reports.export',
    'audit.read',
  ],

  BRANCH_MANAGER: [
    'users.create',
    'users.read',
    'users.update',
    'users.disable',
    'users.assign_branch',
    'customers.create',
    'customers.read',
    'customers.update',
    'customers.assign',
    'loans.create',
    'loans.read',
    'loans.update',
    'loans.submit',
    'loans.assess',
    'loans.approve',
    'loans.reject',
    'loans.disburse',
    'repayments.create',
    'repayments.read',
    'savings.create',
    'savings.read',
    'accounting.read',
    'reports.read',
    'reports.export',
    'audit.read',
  ],

  FIELD_OFFICER: [
    'customers.create',
    'customers.read',
    'customers.update',
    'loans.create',
    'loans.read',
    'loans.update',
    'loans.submit',
    'repayments.create',
    'repayments.read',
    'savings.create',
    'savings.read',
    'reports.read',
  ],

  LOAN_OFFICER: [
    'customers.create',
    'customers.read',
    'customers.update',
    'loans.create',
    'loans.read',
    'loans.update',
    'loans.submit',
    'loans.assess',
    'repayments.create',
    'repayments.read',
    'savings.create',
    'savings.read',
    'reports.read',
  ],

  ACCOUNTANT: [
    'customers.read',
    'loans.read',
    'repayments.create',
    'repayments.read',
    'repayments.reverse',
    'savings.create',
    'savings.read',
    'accounting.read',
    'accounting.post',
    'reports.read',
    'reports.export',
  ],

  AUDITOR: [
    'users.read',
    'customers.read',
    'loans.read',
    'repayments.read',
    'savings.read',
    'accounting.read',
    'reports.read',
    'reports.export',
    'audit.read',
  ],

  CUSTOMER: [
    'customers.read',
    'loans.read',
    'repayments.read',
    'savings.read',
  ],
};

/**
 * Check if a role possesses a specific granular permission
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const canonicalRole = role as Role;
  const permissions = ROLE_PERMISSIONS[canonicalRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if a user can create or manage staff accounts
 */
export function canManageStaff(role: string | undefined): boolean {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'HEAD_OFFICE_MANAGER' ||
    role === 'MANAGER' ||
    role === 'BRANCH_MANAGER'
  );
}

/**
 * Check if a user is a field-based operator (mobile-first view)
 */
export function isFieldOfficer(role: string | undefined): boolean {
  return (
    role === 'FIELD_OFFICER' ||
    role === 'LOAN_OFFICER' ||
    role === 'COLLECTION_OFFICER'
  );
}
