import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  PiggyBank,
  Users,
  Wallet,
  ArrowLeftRight,
  FileText,
  UserPlus,
  Coins,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { calculatePortfolioAtRisk } from '../engines/arrearsEngine';
import { formatTZS, translations } from '../lib/i18n';
import { TabType } from '../components/Sidebar';

interface DashboardViewProps {
  setActiveTab: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const {
    loans,
    customers,
    savingsAccounts,
    applications,
    chartOfAccounts,
    currentBranchId,
    branches,
    payments,
    summaryMetrics,
    language,
  } = useMfi();

  const t = translations[language];

  // Filter loans by current branch if specified
  const filteredLoans =
    currentBranchId === 'ALL' ? loans : loans.filter((l) => l.branchId === currentBranchId);

  const parMetrics = calculatePortfolioAtRisk(filteredLoans);

  const grossPortfolio = summaryMetrics?.grossPortfolio ?? parMetrics.grossLoanPortfolio;
  const activeBorrowers = summaryMetrics?.activeBorrowers ?? parMetrics.activeLoans;
  const totalDisbursed = summaryMetrics?.totalDisbursed ?? filteredLoans.reduce((acc, l) => acc + l.disbursedPrincipal, 0);

  const totalSavings =
    summaryMetrics?.totalSavings ??
    savingsAccounts
      .filter((s) => currentBranchId === 'ALL' || s.branchId === currentBranchId)
      .reduce((acc, s) => acc + s.balance, 0);

  const mpesaFloat =
    summaryMetrics?.liquidity?.mpesaFloat ??
    chartOfAccounts.find((a) => a.code === '1020' || a.code === '1030')?.balance ??
    0;

  const cashVault =
    summaryMetrics?.liquidity?.cashInVault ??
    chartOfAccounts.find((a) => a.code === '1010')?.balance ??
    0;

  const totalLiquid =
    summaryMetrics?.liquidity?.totalLiquid ?? mpesaFloat + cashVault;

  const pendingApps = applications.filter(
    (a) => a.status === 'PENDING_APPROVAL' || a.status === 'ASSESSED' || a.status === 'SUBMITTED'
  );

  const recentPayments = payments.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4" />
              <span>
                {currentBranchId === 'ALL'
                  ? language === 'sw'
                    ? 'Matawi Yote ya Tanzania (Makao Makuu)'
                    : 'Institutional Overview (All Tanzanian Branches)'
                  : branches.find((b) => b.id === currentBranchId)?.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {language === 'sw' ? 'Mfumo wa Uendeshaji wa Mikopo na Fedha' : 'Core Banking & Portfolio MIS'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-2xl">
              {language === 'sw'
                ? 'Hesabu kamili ya Double-Entry (DR/CR), viwango vya PAR kulingana na miongozo ya Benki Kuu ya Tanzania (BOT).'
                : 'Double-entry accounting, Bank of Tanzania (BOT) prudential PAR classification, and mobile money treasury.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('origination')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center space-x-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>{t.applyLoan}</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5"
            >
              <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
              <span>{t.recordPayment}</span>
            </button>
          </div>
        </div>

        {/* Quick Action Shortcuts Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => setActiveTab('customers')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors text-left"
          >
            <UserPlus className="w-4 h-4 text-sky-400" />
            <span className="truncate">{t.newCustomer}</span>
          </button>
          <button
            onClick={() => setActiveTab('origination')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="truncate">{t.applyLoan}</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors text-left"
          >
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span className="truncate">{t.recordPayment}</span>
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors text-left"
          >
            <Coins className="w-4 h-4 text-purple-400" />
            <span className="truncate">{t.savingsDeposit}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Loan Portfolio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t.grossPortfolio}</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {formatTZS(grossPortfolio, language)}
            </h3>
            <div className="flex items-center text-xs text-slate-400 mt-1">
              <span className="text-emerald-400 font-bold mr-1">{activeBorrowers} {t.activeBorrowers}</span>
              <span>• {customers.length} {language === 'sw' ? 'Wateja' : 'Clients'}</span>
            </div>
          </div>
        </div>

        {/* Portfolio at Risk (PAR30) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t.par30}</span>
            <div
              className={`p-2.5 rounded-xl border ${
                parMetrics.par30Rate > 5
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">{parMetrics.par30Rate}%</h3>
              <span className="text-xs text-slate-400">({formatTZS(parMetrics.par30Principal, language)})</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {parMetrics.par30Rate <= 5 ? (
                <span className="text-emerald-400 font-semibold">
                  {language === 'sw' ? 'Ndani ya kiwango cha BOT < 5%' : 'Within BOT < 5% benchmark'}
                </span>
              ) : (
                <span className="text-rose-400 font-semibold">
                  {language === 'sw' ? 'Inazidi kiwango cha BOT cha 5%' : 'Exceeds 5% prudential threshold'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer Savings Deposits */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t.totalSavings}</span>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {formatTZS(totalSavings, language)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'sw' ? 'Akiba ya lazima & amana za hiari' : 'Voluntary deposits & loan collateral'}
            </p>
          </div>
        </div>

        {/* Mobile Money & Vault Float */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t.liquidFloat}</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {formatTZS(totalLiquid, language)}
            </h3>
            <div className="text-xs text-slate-400 mt-1 flex justify-between">
              <span>M-Pesa: {formatTZS(mpesaFloat, language)}</span>
              <span>Vault: {formatTZS(cashVault, language)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAR Aging Analysis & Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PAR Aging Regulatory Buckets */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'sw'
                  ? 'Madaraja ya Mikopo Iliyochelewa (PAR Buckets)'
                  : 'Portfolio At Risk (PAR) Regulatory Buckets'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'sw'
                  ? 'Miongozo ya Benki Kuu ya Tanzania (BOT Prudential Guidelines)'
                  : 'Bank of Tanzania prudential aging categories'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
            >
              <span>{language === 'sw' ? 'Ripoti Kamili' : 'Full Aging Report'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* PAR 1 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">
                  {language === 'sw' ? 'PAR 1 (Siku 1 - 6 - Ufuatiliaji wa Awali)' : 'PAR 1 (1 - 6 Days Past Due)'}
                </span>
                <span className="text-white font-mono">
                  {parMetrics.par1Rate}% — {formatTZS(parMetrics.par1Principal, language)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-amber-400 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, parMetrics.par1Rate * 3)}%` }}
                />
              </div>
            </div>

            {/* PAR 7 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">
                  {language === 'sw' ? 'PAR 7 (Siku 7 - 29 - Uangalizi Maalum)' : 'PAR 7 (7 - 29 Days Past Due)'}
                </span>
                <span className="text-white font-mono">
                  {parMetrics.par7Rate}% — {formatTZS(parMetrics.par7Principal, language)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, parMetrics.par7Rate * 3)}%` }}
                />
              </div>
            </div>

            {/* PAR 30 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">
                  {language === 'sw'
                    ? 'PAR 30 (Siku 30 - 59 - Mikopo Duni / Substandard)'
                    : 'PAR 30 (30 - 59 Days Past Due - Substandard)'}
                </span>
                <span className="text-white font-mono">
                  {parMetrics.par30Rate}% — {formatTZS(parMetrics.par30Principal, language)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, parMetrics.par30Rate * 3)}%` }}
                />
              </div>
            </div>

            {/* PAR 90 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">
                  {language === 'sw'
                    ? 'PAR 90 (Siku 90+ - Hasara / Non-Performing)'
                    : 'PAR 90 (90+ Days Past Due - Non-Performing / Loss)'}
                </span>
                <span className="text-white font-mono">
                  {parMetrics.par90Rate}% — {formatTZS(parMetrics.par90Principal, language)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-rose-700 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, parMetrics.par90Rate * 3)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-400">
            <span>
              {language === 'sw' ? 'Mikopo yenye Malimbikizo: ' : 'Total Loans in Arrears: '}
              <strong className="text-white">{parMetrics.arrearsLoans}</strong>
            </span>
            <span>
              {language === 'sw' ? 'Jumla ya Salio Lililochelewa: ' : 'Total Delinquent Principal: '}
              <strong className="text-rose-400">{formatTZS(parMetrics.totalPrincipalInArrears, language)}</strong>
            </span>
          </div>
        </div>

        {/* Pending Origination Pipeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">
                {language === 'sw' ? 'Maombi Yanayosubiri' : 'Pending Approvals'}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {pendingApps.length} {language === 'sw' ? 'Yanasubiri' : 'Awaiting'}
              </span>
            </div>

            {pendingApps.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                {language === 'sw'
                  ? 'Hakuna maombi ya mkopo yanayosubiri idhini.'
                  : 'No pending loan applications awaiting committee approval.'}
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApps.slice(0, 4).map((app) => (
                  <div key={app.id} className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white">{app.customerName}</p>
                        <p className="text-slate-400 text-[11px]">{app.productName}</p>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">
                        {formatTZS(app.appliedPrincipal, language)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[11px]">
                      <span className="text-amber-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{app.status.replace(/_/g, ' ')}</span>
                      </span>
                      <button
                        onClick={() => setActiveTab('origination')}
                        className="text-emerald-400 hover:text-emerald-300 font-bold"
                      >
                        {language === 'sw' ? 'Kagua →' : 'Review →'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab('origination')}
            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            {language === 'sw' ? 'Fungua Dawati la Maombi' : 'Open Origination Desk'}
          </button>
        </div>
      </div>

      {/* Real-time Collections Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">{t.recentRepayments}</h3>
            <p className="text-xs text-slate-400">
              {language === 'sw'
                ? 'Marejesho ya moja kwa moja ya M-Pesa, Airtel Money, Tigo Pesa na Taslimu'
                : 'Direct feeds from M-Pesa, Airtel Money, Tigo Pesa and Branch Cashier'}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('payments')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            {language === 'sw' ? 'Tazama Yote' : 'View All'} &rarr;
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-500">{t.noRecordsFound}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-2">{t.date}</th>
                  <th className="pb-2">Receipt / Risiti</th>
                  <th className="pb-2">{language === 'sw' ? 'Mkopo' : 'Loan Acc'}</th>
                  <th className="pb-2">{t.amount}</th>
                  <th className="pb-2">{t.principal}</th>
                  <th className="pb-2">{t.interest}</th>
                  <th className="pb-2">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 text-slate-300">{p.paymentDate.split('T')[0]}</td>
                    <td className="py-2.5 font-mono text-emerald-400 font-semibold">{p.receiptNumber}</td>
                    <td className="py-2.5 font-mono text-slate-300">{p.loanAccountNumber}</td>
                    <td className="py-2.5 font-bold text-white">{formatTZS(p.amount, language)}</td>
                    <td className="py-2.5 text-slate-400">{formatTZS(p.principalAllocated, language)}</td>
                    <td className="py-2.5 text-slate-400">{formatTZS(p.interestAllocated, language)}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.isReversed ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {p.isReversed ? (language === 'sw' ? 'Imebatilishwa' : 'Reversed') : (language === 'sw' ? 'Imelipwa' : 'Settled')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
