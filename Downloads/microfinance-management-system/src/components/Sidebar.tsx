import React from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  Clock,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
  Users2,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { translations } from '../lib/i18n';

export type TabType =
  | 'dashboard'
  | 'customers'
  | 'groups'
  | 'products'
  | 'origination'
  | 'servicing'
  | 'payments'
  | 'savings'
  | 'accounting'
  | 'mobile_money'
  | 'offline_sync'
  | 'audit'
  | 'reports'
  | 'staff'
  | 'about_demo';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, logout, applications, loans, offlineQueue, language } = useMfi();
  const t = translations[language];

  const pendingApprovalsCount = applications.filter(
    (a) => a.status === 'PENDING_APPROVAL' || a.status === 'ASSESSED' || a.status === 'SUBMITTED'
  ).length;
  const inArrearsLoansCount = loans.filter((l) => (l.daysInArrears || 0) > 0 || l.status === 'IN_ARREARS').length;
  const pendingSyncCount = offlineQueue.filter((q) => q.syncStatus === 'PENDING').length;

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'customers', label: t.customers, icon: <Users className="w-4 h-4" /> },
    { id: 'groups', label: t.groups, icon: <Users2 className="w-4 h-4" /> },
    { id: 'products', label: t.products, icon: <Layers className="w-4 h-4" /> },
    {
      id: 'origination',
      label: t.origination,
      icon: <FileText className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'servicing',
      label: t.servicing,
      icon: <Clock className="w-4 h-4" />,
      badge: inArrearsLoansCount > 0 ? inArrearsLoansCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'payments', label: t.payments, icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'savings', label: t.savings, icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'accounting', label: t.accounting, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'mobile_money', label: t.mobileMoney, icon: <Smartphone className="w-4 h-4" /> },
    {
      id: 'offline_sync',
      label: t.offlineSync,
      icon: <RefreshCw className="w-4 h-4" />,
      badge: pendingSyncCount > 0 ? pendingSyncCount : undefined,
      badgeColor: 'bg-sky-500 text-white',
    },
    { id: 'reports', label: t.reports, icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'staff', label: t.staffManagement, icon: <UserCheck className="w-4 h-4" /> },
    { id: 'audit', label: t.auditTrail, icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'about_demo', label: t.aboutDemo, icon: <Sparkles className="w-4 h-4 text-emerald-400" /> },
  ];

  const userInitials = currentUser
    ? `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || 'S'}`
    : 'IM';

  return (
    <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex-col flex-shrink-0">
      {/* Current User Card */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 shadow flex-shrink-0">
              {userInitials}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-white truncate">
                {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Guest User'}
              </p>
              <p className="text-xs text-emerald-400 font-medium truncate">
                {currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'Staff'}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors flex-shrink-0"
            title={t.signOut || 'Sign out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-slate-300 font-medium">PostgreSQL v16</span>
        </div>
        <span className="text-[10px] text-slate-500">TZS Standard</span>
      </div>
    </aside>
  );
};
