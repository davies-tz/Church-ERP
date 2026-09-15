import React from 'react';
import {
  Building2,
  Database,
  Globe,
  LogOut,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
  Languages,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { translations, Language } from '../lib/i18n';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const {
    currentUser,
    setCurrentUser,
    logout,
    users,
    branches,
    currentBranchId,
    setCurrentBranchId,
    isOnline,
    setIsOnline,
    offlineQueue,
    syncOfflineQueue,
    resetToSeedData,
    language,
    setLanguage,
  } = useMfi();

  const t = translations[language];
  const pendingOfflineCount = offlineQueue.filter((q) => q.syncStatus === 'PENDING').length;

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUser = users.find((u) => u.id === e.target.value);
    if (selectedUser) {
      setCurrentUser(selectedUser);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'sw' : 'en');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Institution Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-950/40">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">{t.appName}</span>
                <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Cloud SQL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xs:block truncate max-w-[200px] sm:max-w-xs">{t.appSubtitle}</p>
            </div>
          </div>

          {/* Controls: Language, Branch, Role Switcher, Online/Offline, Sync */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Language Switcher Pill */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
              title={language === 'en' ? 'Badili kwenda Kiswahili' : 'Switch to English'}
            >
              <Languages className="w-3.5 h-3.5 text-emerald-400" />
              <span className="uppercase">{language === 'en' ? 'SW' : 'EN'}</span>
            </button>

            {/* Branch Selector */}
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="branch-select" className="text-slate-400">{t.branch}:</label>
              <select
                id="branch-select"
                value={currentBranchId}
                onChange={(e) => setCurrentBranchId(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
              >
                <option value="ALL" className="bg-slate-900">{t.allBranches}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="hidden lg:flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <label htmlFor="user-role-select" className="text-slate-400">{t.role}:</label>
              <select
                id="user-role-select"
                value={currentUser?.id || ''}
                onChange={handleRoleChange}
                className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.firstName} {u.lastName} ({u.role.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Online / Offline Toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                isOnline
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-rose-950/60 border-rose-700 text-rose-300 hover:bg-rose-900/60'
              }`}
              title={isOnline ? t.online : t.offlineMode}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOnline ? t.online : t.offlineMode}</span>
            </button>

            {/* Offline Sync Badge */}
            {pendingOfflineCount > 0 && (
              <button
                onClick={syncOfflineQueue}
                className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow animate-pulse"
                title={t.sync}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t.sync} ({pendingOfflineCount})</span>
              </button>
            )}

            {/* Reset Database Seed */}
            <button
              onClick={resetToSeedData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset / Reseed Data"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={() => logout()}
              className="flex items-center space-x-1 p-1.5 px-2 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-700 transition-colors text-xs font-medium"
              title={t.signOut || 'Sign out'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.signOut || 'Sign out'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
