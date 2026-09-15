import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  RefreshCw,
  Menu,
  X,
  FileText,
  Clock,
  PiggyBank,
  BookOpen,
  Smartphone,
  FileSpreadsheet,
  ShieldCheck,
  Layers,
  Users2,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { TabType } from './Sidebar';
import { useMfi } from '../context/MfiContext';
import { translations } from '../lib/i18n';

interface MobileBottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { language, offlineQueue } = useMfi();
  const t = translations[language];
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pendingSync = offlineQueue.filter((q) => q.syncStatus === 'PENDING').length;

  const mainItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: t.dashboard.split(' ')[0], icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'customers', label: t.customers.split(' ')[0], icon: <Users className="w-5 h-5" /> },
    { id: 'payments', label: language === 'sw' ? 'Rejesho' : 'Pay', icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'offline_sync', label: t.sync, icon: <RefreshCw className="w-5 h-5" />, badge: pendingSync > 0 ? pendingSync : undefined },
  ];

  const drawerItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'origination', label: t.origination, icon: <FileText className="w-4 h-4" /> },
    { id: 'servicing', label: t.servicing, icon: <Clock className="w-4 h-4" /> },
    { id: 'groups', label: t.groups, icon: <Users2 className="w-4 h-4" /> },
    { id: 'savings', label: t.savings, icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'accounting', label: t.accounting, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'mobile_money', label: t.mobileMoney, icon: <Smartphone className="w-4 h-4" /> },
    { id: 'products', label: t.products, icon: <Layers className="w-4 h-4" /> },
    { id: 'reports', label: t.reports, icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'staff', label: t.staffManagement, icon: <UserCheck className="w-4 h-4" /> },
    { id: 'audit', label: t.auditTrail, icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'about_demo', label: t.aboutDemo, icon: <Sparkles className="w-4 h-4 text-emerald-400" /> },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop & Menu */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden animate-in fade-in" onClick={() => setDrawerOpen(false)}>
          <div
            className="absolute bottom-16 inset-x-0 bg-slate-900 border-t border-slate-800 rounded-t-2xl p-4 shadow-2xl max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="font-bold text-sm text-white">{t.moreMenu}</span>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {drawerItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setDrawerOpen(false);
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold transition-all text-left ${
                    activeTab === item.id
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className={activeTab === item.id ? 'text-white' : 'text-emerald-400'}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Fixed Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md md:hidden px-2 py-1.5 shadow-lg">
        <div className="flex items-center justify-around">
          {mainItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setDrawerOpen(false);
                }}
                className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-xl transition-colors ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-xl transition-colors ${
              drawerOpen ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] mt-0.5 tracking-tight">{t.moreMenu.split(' ')[0]}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
