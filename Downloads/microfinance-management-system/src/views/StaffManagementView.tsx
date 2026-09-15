import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Filter,
  Building2,
  Shield,
  KeyRound,
  Eye,
  Edit2,
  UserX,
  CheckCircle2,
  X,
  AlertTriangle,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Lock,
  RefreshCw,
  Clock,
  Activity,
  FileCheck
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { User, RoleName } from '../types';
import { canManageStaff, hasPermission } from '../lib/rbac';
import { translations, formatDateLocale } from '../lib/i18n';

export const StaffManagementView: React.FC = () => {
  const { currentUser, branches, currentBranchId, language } = useMfi();
  const t = translations[language];

  const [staffList, setStaffList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    role: 'FIELD_OFFICER' as RoleName,
    branchId: 'br-kariakoo',
    initialPassword: 'Imara@2025',
  });

  const isAuthorized = canManageStaff(currentUser?.role);

  // Fetch staff list from backend
  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('imara_auth_token');
      const res = await fetch('/api/staff', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
      setStatusMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    try {
      const token = localStorage.getItem('imara_auth_token');
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to create employee');
      }

      setStatusMessage({
        type: 'success',
        text: `Employee ${result.firstName} ${result.lastName} created successfully!`,
      });
      setIsCreateModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        role: 'FIELD_OFFICER',
        branchId: 'br-kariakoo',
        initialPassword: 'Imara@2025',
      });
      fetchStaff();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const token = localStorage.getItem('imara_auth_token');
      const res = await fetch(`/api/staff/${user.id}/toggle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error('Failed to update employee status');
      setStatusMessage({
        type: 'success',
        text: `Status for ${user.firstName} ${user.lastName} changed successfully.`,
      });
      fetchStaff();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleResetAccess = async (user: User) => {
    if (!confirm(`Are you sure you want to reset password and access for ${user.firstName} ${user.lastName}?`)) return;

    try {
      const token = localStorage.getItem('imara_auth_token');
      const res = await fetch(`/api/staff/${user.id}/reset-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset access');

      setStatusMessage({
        type: 'success',
        text: `Password reset successfully. Temporary password: ${data.temporaryPassword}`,
      });
      fetchStaff();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRoleFilter === 'ALL' || s.role === selectedRoleFilter;
    const matchesBranch = selectedBranchFilter === 'ALL' || s.branchId === selectedBranchFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || s.status === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesBranch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Staff & Team Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              RBAC Controlled
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Hierarchical staff directory. Only authorized Managers and Super Admins can provision employee accounts.
          </p>
        </div>

        {isAuthorized && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Employee Account</span>
          </button>
        )}
      </div>

      {/* Security Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-white">Hierarchical Security Policy: </span>
          Public self-registration for employees is disabled. Every employee account must have an authorized role, assigned branch, and official employee number assigned by a Manager.
        </div>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button type="button" onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="HEAD_OFFICE_MANAGER">Head Office Manager</option>
            <option value="BRANCH_MANAGER">Branch Manager</option>
            <option value="FIELD_OFFICER">Field Officer</option>
            <option value="LOAN_OFFICER">Loan Officer</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="AUDITOR">Auditor</option>
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Branch</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Login</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading team members...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No staff records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const branchObj = branches.find((b) => b.id === staff.branchId);
                  const isStaffActive = staff.status === 'ACTIVE';

                  return (
                    <tr key={staff.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                            {staff.firstName[0]}
                            {staff.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {staff.firstName} {staff.lastName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              @{staff.username || staff.email.split('@')[0]} • {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                            staff.role === 'SUPER_ADMIN' || staff.role === 'HEAD_OFFICE_MANAGER'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : staff.role === 'BRANCH_MANAGER'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : staff.role === 'FIELD_OFFICER' || staff.role === 'LOAN_OFFICER'
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                              : staff.role === 'ACCOUNTANT'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-700/50 text-slate-300'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {staff.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs font-medium text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{branchObj ? branchObj.name : staff.branchId}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isStaffActive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isStaffActive ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {isStaffActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">
                        {staff.lastLoginAt ? formatDateLocale(String(staff.lastLoginAt), language) : 'Never'}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Profile */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(staff);
                              setIsProfileModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="View Profile & Performance"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Reset Access */}
                          {isAuthorized && (
                            <button
                              type="button"
                              onClick={() => handleResetAccess(staff)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition"
                              title="Reset Password & Access"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}

                          {/* Toggle Active/Disabled */}
                          {isAuthorized && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(staff)}
                              className={`p-1.5 rounded-lg transition ${
                                isStaffActive
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                              }`}
                              title={isStaffActive ? 'Disable Access' : 'Activate Access'}
                            >
                              {isStaffActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Employee Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Create Employee Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Baraka"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Mkumbo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. baraka.mkumbo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. baraka@tusonge-mfi.co.tz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as RoleName })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FIELD_OFFICER">FIELD_OFFICER (Mobile Operations)</option>
                    <option value="LOAN_OFFICER">LOAN_OFFICER (Credit Underwriting)</option>
                    <option value="BRANCH_MANAGER">BRANCH_MANAGER (Branch Operations)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (General Ledger & Treasury)</option>
                    <option value="AUDITOR">AUDITOR (Compliance & Audit Trail)</option>
                    <option value="HEAD_OFFICE_MANAGER">HEAD_OFFICE_MANAGER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Branch *</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Initial Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.initialPassword}
                    onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 shrink-0">Default: Imara@2025</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile Drawer / Modal */}
      {isProfileModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black flex items-center justify-center text-base">
                  {selectedEmployee.firstName[0]}
                  {selectedEmployee.lastName[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <div className="text-xs text-emerald-400 font-semibold">{selectedEmployee.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">Username</span>
                  <span className="font-semibold text-white font-mono">{selectedEmployee.username}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">Account Status</span>
                  <span className="font-semibold text-emerald-400">{selectedEmployee.status}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="text-white font-medium">{selectedEmployee.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Branch ID:</span>
                  <span className="text-white font-medium">{selectedEmployee.branchId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Customers:</span>
                  <span className="text-white font-medium">84 Active Accounts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Disbursed Portfolio:</span>
                  <span className="text-emerald-400 font-bold">TZS 142,500,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Repayment Collection Rate:</span>
                  <span className="text-cyan-400 font-bold">98.6%</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
