import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  DollarSign,
  FileCheck,
  FileText,
  Plus,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoanApplication, PaymentMethod } from '../types';
import { evaluateCreditRisk } from '../engines/riskEngine';
import { formatTZS, translations } from '../lib/i18n';

export const LoanOriginationView: React.FC = () => {
  const {
    applications,
    customers,
    loanProducts,
    currentBranchId,
    currentUser,
    createLoanApplication,
    assessLoanApplication,
    approveLoanApplication,
    disburseLoan,
    language,
  } = useMfi();

  const { showToast } = useToast();
  const t = translations[language];

  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<string>('ALL');

  // Confirmation modal states
  const [confirmDisburseModal, setConfirmDisburseModal] = useState(false);
  const [confirmRejectModal, setConfirmRejectModal] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Application Form State
  const [applicantCustomerId, setApplicantCustomerId] = useState(customers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(loanProducts[0]?.id || '');
  const [principalAmount, setPrincipalAmount] = useState<number>(1500000);
  const [termInstallments, setTermInstallments] = useState<number>(6);
  const [purpose, setPurpose] = useState('Expansion of retail stock and inventory');

  // Credit Assessment Form State
  const [monthlyIncome, setMonthlyIncome] = useState<number>(3000000);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(1600000);
  const [existingDebts, setExistingDebts] = useState<number>(0);
  const [historyRating, setHistoryRating] = useState<'PERFECT' | 'MINOR_DELAY' | 'PRIOR_DEFAULT' | 'NEW_BORROWER'>('PERFECT');
  const [yearsInBusiness, setYearsInBusiness] = useState<number>(2);

  // Approval comments
  const [approvalComments, setApprovalComments] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState<PaymentMethod>('MOBILE_MONEY');

  const filteredApps = applications.filter((app) => {
    const matchesBranch = currentBranchId === 'ALL' || app.branchId === currentBranchId;
    const matchesStatus =
      activeTabFilter === 'ALL' ||
      (activeTabFilter === 'PENDING' &&
        (app.status === 'SUBMITTED' || app.status === 'ASSESSED' || app.status === 'PENDING_APPROVAL')) ||
      (activeTabFilter === 'APPROVED' &&
        (app.status === 'APPROVED' || app.status === 'READY_FOR_DISBURSEMENT')) ||
      (activeTabFilter === 'DISBURSED' && app.status === 'DISBURSED');
    return matchesBranch && matchesStatus;
  });

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantCustomerId || !selectedProductId) {
      showToast('warning', 'Missing Fields', 'Please select both customer and loan product.');
      return;
    }

    try {
      const app = await createLoanApplication({
        customerId: applicantCustomerId,
        productId: selectedProductId,
        appliedPrincipal: principalAmount,
        termInstallments,
        purpose,
      });
      showToast(
        'success',
        language === 'sw' ? 'Maombi Yamewasilishwa' : 'Application Submitted',
        language === 'sw'
          ? `Maombi namba ${app.applicationNumber} yamepokelewa kikamilifu.`
          : `Application ${app.applicationNumber} submitted for credit assessment.`
      );
      setShowApplyModal(false);
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message);
    }
  };

  const handleRunAssessment = async (app: LoanApplication) => {
    const evaluation = evaluateCreditRisk({
      monthlyIncome,
      monthlyExpenses,
      existingMonthlyLoanObligations: existingDebts,
      requestedInstallmentAmount: principalAmount / termInstallments,
      repaymentHistoryRating: historyRating,
      yearsInBusiness,
      collateralCoverageRatio: 1.2,
    });

    await assessLoanApplication(app.id, evaluation);
    showToast(
      'info',
      language === 'sw' ? 'Tathmini Imekamilika' : 'Assessment Completed',
      language === 'sw'
        ? `Alama ya Uwezo wa Kulipa (DSR): ${(evaluation.debtToIncomeRatio * 100).toFixed(1)}%`
        : `Debt Service Ratio (DSR) calculated at ${(evaluation.debtToIncomeRatio * 100).toFixed(1)}%`
    );
    setSelectedApp((prev) => (prev ? { ...prev, status: 'ASSESSED' } : null));
  };

  const handleApprove = async (app: LoanApplication) => {
    let level: 'BRANCH_MANAGER' | 'REGIONAL_MANAGER' | 'HEAD_OFFICE' = 'BRANCH_MANAGER';
    if (app.appliedPrincipal > 10000000) {
      level = 'HEAD_OFFICE';
    } else if (app.appliedPrincipal > 1000000) {
      level = 'REGIONAL_MANAGER';
    }

    setIsProcessingAction(true);
    try {
      await approveLoanApplication(
        app.id,
        level,
        'APPROVED',
        approvalComments || 'Approved in accordance with credit assessment metrics.'
      );
      showToast(
        'success',
        language === 'sw' ? 'Mkopo Umeidhinishwa' : 'Loan Approved',
        language === 'sw'
          ? `Mkopo umeidhinishwa na uko tayari kutolewa (Disbursement).`
          : `Loan application approved at ${level.replace(/_/g, ' ')} tier.`
      );
      setSelectedApp(null);
      setApprovalComments('');
    } catch (err: any) {
      showToast('error', 'Approval Blocked', err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedApp) return;
    setIsProcessingAction(true);
    try {
      await approveLoanApplication(
        selectedApp.id,
        'BRANCH_MANAGER',
        'REJECTED',
        approvalComments || 'Did not meet institutional credit scoring thresholds.'
      );
      showToast(
        'warning',
        language === 'sw' ? 'Maombi Yamekataliwa' : 'Application Rejected',
        language === 'sw' ? 'Maombi ya mkopo yamekataliwa rasmi.' : 'Loan application rejected.'
      );
      setConfirmRejectModal(false);
      setSelectedApp(null);
      setApprovalComments('');
    } catch (err: any) {
      showToast('error', 'Rejection Error', err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmDisburse = async () => {
    if (!selectedApp) return;
    setIsProcessingAction(true);
    try {
      const loan = await disburseLoan(selectedApp.id, disbursementMethod);
      showToast(
        'success',
        language === 'sw' ? 'Fedha Zimetolewa (Disbursed)' : 'Loan Disbursed Successfully',
        language === 'sw'
          ? `Akaunti ya Mkopo: ${loan.loanAccountNumber}. Salio la Msingi: ${formatTZS(loan.disbursedPrincipal, language)}`
          : `Loan Account ${loan.loanAccountNumber} generated. General Ledger journal posted.`
      );
      setConfirmDisburseModal(false);
      setSelectedApp(null);
    } catch (err: any) {
      showToast('error', 'Disbursement Failed', err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {language === 'sw'
              ? 'Mchakato wa Maombi na Uidhinishaji wa Mikopo (Maker-Checker)'
              : 'Loan Origination & Maker-Checker Workflow'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'sw'
              ? 'Tathmini ya uwezo wa kulipa (DSR/DTI), viwango vya idhini kulingana na kiasi, na utoaji wa fedha.'
              : 'Credit assessment, DTI scoring, delegated approval tiers, and disbursement validation.'}
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-emerald-950/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.applyLoan}</span>
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs overflow-x-auto">
        {[
          { id: 'ALL', label: language === 'sw' ? 'Yote' : 'All' },
          { id: 'PENDING', label: language === 'sw' ? 'Yanayosubiri' : 'Pending' },
          { id: 'APPROVED', label: language === 'sw' ? 'Yaliyoidhinishwa' : 'Approved' },
          { id: 'DISBURSED', label: language === 'sw' ? 'Yaliyotolewa' : 'Disbursed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors whitespace-nowrap ${
              activeTabFilter === tab.id
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{language === 'sw' ? 'Nambari ya Maombi' : 'Application #'}</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Mkopaji' : 'Borrower'}</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Aina ya Mkopo' : 'Loan Product'}</th>
                <th className="py-3 px-4 text-right">{t.principal}</th>
                <th className="py-3 px-4">{t.tenure}</th>
                <th className="py-3 px-4">{t.status}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {t.noRecordsFound}
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      selectedApp?.id === app.id ? 'bg-slate-800/60' : ''
                    }`}
                    onClick={() => setSelectedApp(app)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{app.applicationNumber}</td>
                    <td className="py-3 px-4 font-semibold text-white">{app.customerName}</td>
                    <td className="py-3 px-4 text-slate-300">{app.productName}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatTZS(app.appliedPrincipal, language)}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {app.termInstallments} {language === 'sw' ? 'Miezi' : 'Mths'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          app.status === 'DISBURSED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : app.status === 'READY_FOR_DISBURSEMENT' || app.status === 'APPROVED'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : app.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        <span>{app.status.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApp(app);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center space-x-1"
                      >
                        <span>{language === 'sw' ? 'Fungua' : 'Inspect'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Application Inspection Drawer */}
      {selectedApp && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-emerald-400 font-bold">{selectedApp.applicationNumber}</span>
                <span className="text-slate-500">•</span>
                <span className="font-semibold text-white">{selectedApp.customerName}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedApp.productName} — {formatTZS(selectedApp.appliedPrincipal, language)} ({selectedApp.termInstallments} {language === 'sw' ? 'Miezi' : 'Mths'})
              </p>
            </div>
            <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Credit Assessment Card */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs">
                <UserCheck className="w-4 h-4" />
                <span>{language === 'sw' ? 'Hatua 1: Tathmini ya Uwezo' : 'Step 1: Credit Assessment'}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{t.monthlyIncome}</label>
                  <input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">{language === 'sw' ? 'Gharama za Kila Mwezi' : 'Monthly Business Expenses'}</label>
                  <input
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">{language === 'sw' ? 'Madeni Mengine ya Mikopo' : 'Existing Debt Obligations'}</label>
                  <input
                    type="number"
                    value={existingDebts}
                    onChange={(e) => setExistingDebts(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <button
                  onClick={() => handleRunAssessment(selectedApp)}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-lg transition-colors mt-2"
                >
                  {language === 'sw' ? 'Fanya Tathmini ya Hatari' : 'Run Scoring Engine'}
                </button>
              </div>
            </div>

            {/* Step 2: Maker-Checker Decision */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>{language === 'sw' ? 'Hatua 2: Uidhinishaji wa Kamati' : 'Step 2: Committee Approval'}</span>
              </div>

              <div className="space-y-3 text-xs">
                {selectedApp.loanOfficerId === currentUser?.id && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {language === 'sw'
                        ? 'Wewe ndiye uliyewasilisha maombi haya - huwezi kuyaidhinisha au kuyakataa mwenyewe (sera ya maker-checker).'
                        : 'You submitted this application, so you cannot approve or reject it yourself (maker-checker policy). Ask another authorized reviewer.'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 mb-1">{language === 'sw' ? 'Maoni ya Ukaguzi' : 'Committee Comments'}</label>
                  <textarea
                    rows={3}
                    placeholder={language === 'sw' ? 'Maoni ya idhini au sababu ya kukataa...' : 'Enter review comments or conditions...'}
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(selectedApp)}
                    disabled={
                      selectedApp.status === 'DISBURSED' ||
                      selectedApp.status === 'REJECTED' ||
                      selectedApp.loanOfficerId === currentUser?.id ||
                      isProcessingAction
                    }
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{t.approve}</span>
                  </button>
                  <button
                    onClick={() => setConfirmRejectModal(true)}
                    disabled={
                      selectedApp.status === 'DISBURSED' ||
                      selectedApp.status === 'REJECTED' ||
                      selectedApp.loanOfficerId === currentUser?.id ||
                      isProcessingAction
                    }
                    className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{t.reject}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Disbursement */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <DollarSign className="w-4 h-4" />
                <span>{language === 'sw' ? 'Hatua 3: Utoaji wa Fedha' : 'Step 3: Payout Disbursement'}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{language === 'sw' ? 'Njia ya Malipo' : 'Payout Channel'}</label>
                  <select
                    value={disbursementMethod}
                    onChange={(e) => setDisbursementMethod(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="MOBILE_MONEY">Vodacom M-Pesa B2C</option>
                    <option value="CASH">Branch Vault Cash Till</option>
                    <option value="BANK_TRANSFER">CRDB Bank Transfer</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  {language === 'sw'
                    ? 'Kutoa mkopo kunazalisha mkataba, ratiba ya malipo, na kuposti vocha ya Double-Entry kwenye General Ledger (DR Mikopo / CR Fedha).'
                    : 'Disbursement generates the loan contract, computes the schedule, and posts balanced double-entry vouchers to the General Ledger.'}
                </div>

                <button
                  onClick={() => setConfirmDisburseModal(true)}
                  disabled={selectedApp.status !== 'READY_FOR_DISBURSEMENT' && selectedApp.status !== 'APPROVED'}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg flex items-center justify-center space-x-1"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{t.disburse} ({formatTZS(selectedApp.appliedPrincipal, language)})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Loan Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">{t.applyLoan}</h2>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{language === 'sw' ? 'Mteja / Mkopaji *' : 'Borrower / Customer *'}</label>
                <select
                  value={applicantCustomerId}
                  onChange={(e) => setApplicantCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.customerNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{language === 'sw' ? 'Bidhaa ya Mkopo *' : 'Loan Product *'}</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {loanProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.annualNominalRate}% p.a. - {p.interestMethod})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">{t.principal} (TZS) *</label>
                  <input
                    type="number"
                    step="100000"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">{t.tenure} *</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={termInstallments}
                    onChange={(e) => setTermInstallments(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.purpose}</label>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow"
                >
                  {t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensitive Operation Confirmation Modals */}
      {selectedApp && (
        <>
          <ConfirmModal
            isOpen={confirmDisburseModal}
            title={language === 'sw' ? 'Thibitisha Utoaji wa Mkopo' : 'Confirm Loan Disbursement'}
            message={
              language === 'sw'
                ? `Je, una uhakika unataka kutoa mkopo wa ${formatTZS(selectedApp.appliedPrincipal, language)} kwa mteja ${selectedApp.customerName}? Hii itaposti vocha ya malipo kwenye leja kuu mara moja.`
                : `Are you sure you want to disburse ${formatTZS(selectedApp.appliedPrincipal, language)} to ${selectedApp.customerName}? This will immediately post double-entry vouchers to the General Ledger and release funds.`
            }
            confirmLabel={language === 'sw' ? 'Ndio, Toa Fedha' : 'Yes, Disburse Funds'}
            cancelLabel={t.cancel}
            variant="primary"
            isLoading={isProcessingAction}
            onConfirm={handleConfirmDisburse}
            onCancel={() => setConfirmDisburseModal(false)}
          />

          <ConfirmModal
            isOpen={confirmRejectModal}
            title={language === 'sw' ? 'Thibitisha Kukataa Mkopo' : 'Confirm Loan Rejection'}
            message={
              language === 'sw'
                ? `Je, unathibitisha kukataa maombi haya ya mkopo ya ${selectedApp.customerName}?`
                : `Are you sure you want to reject this loan application for ${selectedApp.customerName}?`
            }
            confirmLabel={language === 'sw' ? 'Ndio, Kataa' : 'Yes, Reject Application'}
            cancelLabel={t.cancel}
            variant="danger"
            isLoading={isProcessingAction}
            onConfirm={handleConfirmReject}
            onCancel={() => setConfirmRejectModal(false)}
          />
        </>
      )}
    </div>
  );
};
