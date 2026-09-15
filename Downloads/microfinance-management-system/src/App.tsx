/**
 * Core Microfinance Management System (MMS) Entry Point
 * Implements modular banking monolith with double-entry accounting,
 * BOT prudential compliance, and mobile money treasury.
 */
import React, { useState } from 'react';
import { MfiProvider, useMfi } from './context/MfiContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { CustomersView } from './views/CustomersView';
import { GroupsView } from './views/GroupsView';
import { LoanProductsView } from './views/LoanProductsView';
import { LoanOriginationView } from './views/LoanOriginationView';
import { LoanServicingView } from './views/LoanServicingView';
import { PaymentEngineView } from './views/PaymentEngineView';
import { SavingsView } from './views/SavingsView';
import { AccountingView } from './views/AccountingView';
import { MobileMoneyView } from './views/MobileMoneyView';
import { OfflineSyncView } from './views/OfflineSyncView';
import { AuditTrailView } from './views/AuditTrailView';
import { ReportsView } from './views/ReportsView';
import { StaffManagementView } from './views/StaffManagementView';
import { AboutDemoView } from './views/AboutDemoView';

function AppContent() {
  const { currentUser, isAuthLoading, login } = useMfi();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [unauthView, setUnauthView] = useState<'LOGIN' | 'ABOUT_DEMO'>('LOGIN');

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
          IMARA FINANCE • Security Verification
        </p>
      </div>
    );
  }

  // When visitor is unauthenticated, allow seamless toggle between Login screen and About/Demo presentation
  if (!currentUser) {
    if (unauthView === 'ABOUT_DEMO') {
      return (
        <AboutDemoView
          onGoToLogin={() => setUnauthView('LOGIN')}
          onExploreDemo={async () => {
            // Log in seamlessly as demo manager to enter the live workspace
            await login('amina.manager', 'Imara@2025');
            setActiveTab('dashboard');
          }}
        />
      );
    }

    return (
      <LoginView
        onLoginSuccess={(redirectTab) => {
          setActiveTab(redirectTab);
        }}
        onViewAboutDemo={() => setUnauthView('ABOUT_DEMO')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-950 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
            {activeTab === 'customers' && <CustomersView />}
            {activeTab === 'groups' && <GroupsView />}
            {activeTab === 'products' && <LoanProductsView />}
            {activeTab === 'origination' && <LoanOriginationView />}
            {activeTab === 'servicing' && <LoanServicingView />}
            {activeTab === 'payments' && <PaymentEngineView />}
            {activeTab === 'savings' && <SavingsView />}
            {activeTab === 'accounting' && <AccountingView />}
            {activeTab === 'mobile_money' && <MobileMoneyView />}
            {activeTab === 'offline_sync' && <OfflineSyncView />}
            {activeTab === 'staff' && <StaffManagementView />}
            {activeTab === 'audit' && <AuditTrailView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'about_demo' && (
              <AboutDemoView
                onGoToLogin={() => setActiveTab('dashboard')}
                onExploreDemo={() => setActiveTab('dashboard')}
              />
            )}
          </div>
        </main>
      </div>

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MfiProvider>
        <AppContent />
      </MfiProvider>
    </ToastProvider>
  );
}
