import React, { useState } from 'react';
import {
  ArrowDownLeft,
  CheckCircle2,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
  CreditCard,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { Payment } from '../types';
import { formatTZS, translations } from '../lib/i18n';

export const PaymentEngineView: React.FC = () => {
  const {
    payments,
    loans,
    processRepayment,
    reverseExistingPayment,
    currentUser,
    currentBranchId,
    language,
  } = useMfi();

  const { showToast } = useToast();
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [reversalReason, setReversalReason] = useState('');

  // New Repayment Modal state
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA' | 'BANK_TRANSFER'>('MPESA');
  const [channelRef, setChannelRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'IN_ARREARS');

  const filteredPayments = payments.filter((p) => {
    const loan = loans.find((l) => l.id === p.loanId);
    const matchesBranch = currentBranchId === 'ALL' || loan?.branchId === currentBranchId;
    const matchesSearch =
      p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.channelReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loan && loan.loanAccountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (loan && loan.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesBranch && matchesSearch;
  });

  const handleOpenReversal = (payment: Payment) => {
    setSelectedPayment(payment);
    setReversalReason('');
    setShowReversalModal(true);
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !reversalReason) return;

    try {
      await reverseExistingPayment(selectedPayment.id, reversalReason);
      showToast(
        'success',
        language === 'sw' ? 'Malipo Yamebatilishwa' : 'Payment Reversed',
        language === 'sw'
          ? `Risiti ${selectedPayment.receiptNumber} imebatilishwa na leja kurekebishwa.`
          : `Receipt ${selectedPayment.receiptNumber} was reversed and GL entries offset.`
      );
      setShowReversalModal(false);
      setSelectedPayment(null);
    } catch (err: any) {
      showToast('error', 'Reversal Failed', err.message);
    }
  };

  const handleRecordNewRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId || !paymentAmount || Number(paymentAmount) <= 0) {
      showToast('warning', 'Invalid Input', 'Please select an active loan and enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedRef = channelRef || `TX-${Date.now().toString().slice(-6)}`;
      const payment = await processRepayment(selectedLoanId, Number(paymentAmount), paymentMethod, generatedRef);
      showToast(
        'success',
        language === 'sw' ? 'Rejesho Limerekodiwa' : 'Repayment Processed',
        language === 'sw'
          ? `Kiasi cha TZS ${Number(paymentAmount).toLocaleString()} kimegawiwa. Risiti: ${payment.receiptNumber}`
          : `Allocated TZS ${Number(paymentAmount).toLocaleString()}. Receipt: ${payment.receiptNumber}`
      );
      setShowNewPaymentModal(false);
      setSelectedLoanId('');
      setPaymentAmount('');
      setChannelRef('');
    } catch (err: any) {
      showToast('error', 'Payment Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {language === 'sw'
              ? 'Injini ya Ugawaji wa Marejesho & Daftari la Mabadiliko'
              : 'Payment Allocation Engine & Reversal Ledger'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'sw'
              ? 'Ugawaji wa marejesho kwa utaratibu wa BOT (Adhabu -> Ada -> Riba -> Salio la Msingi) na kumbukumbu salama za kubatilisha.'
              : 'BOT-compliant waterfall payment allocation hierarchy and immutable compensating double-entry reversals.'}
          </p>
        </div>

        <button
          onClick={() => setShowNewPaymentModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/30 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.recordPayment}</span>
        </button>
      </div>

      {/* Waterfall Allocation Policy Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-2.5">
          <ArrowDownLeft className="w-4 h-4" />
          <span>
            {language === 'sw'
              ? 'Mfumo Rasmi wa Ugawaji wa Malipo (Statutory Waterfall Allocation):'
              : 'Statutory Waterfall Allocation Hierarchy:'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center text-[10px]">1</span>
            <span className="text-slate-300 truncate">{language === 'sw' ? 'Faini na Adhabu' : 'Penalties & Late Charges'}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px]">2</span>
            <span className="text-slate-300 truncate">{language === 'sw' ? 'Ada za Uendeshaji' : 'Admin & Service Fees'}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center text-[10px]">3</span>
            <span className="text-slate-300 truncate">{language === 'sw' ? 'Riba Iliyochelewa & Ya Sasa' : 'Overdue & Current Interest'}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px]">4</span>
            <span className="text-slate-300 truncate">{language === 'sw' ? 'Salio Kuu la Msingi' : 'Overdue & Current Principal'}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'sw' ? 'Tafuta kwa risiti, namba ya simu, mkopo, au jina...' : 'Search by receipt number, M-Pesa ref, or borrower name...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium hidden sm:block">
          {filteredPayments.length} {language === 'sw' ? 'Miamala ya Marejesho' : 'Payment Transactions'}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Receipt / Risiti</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Akaunti ya Mkopo' : 'Loan Account'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Kiasi Kilicholipwa' : 'Amount Paid'}</th>
                <th className="py-3 px-4 text-right">{t.principal}</th>
                <th className="py-3 px-4 text-right">{t.interest}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Adhabu/Ada' : 'Penalties/Fees'}</th>
                <th className="py-3 px-4">Channel & Ref</th>
                <th className="py-3 px-4">{t.status}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    {t.noRecordsFound}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const loan = loans.find((l) => l.id === p.loanId);
                  const prinPaid = p.principalAllocated || p.allocations?.reduce((sum, a) => sum + a.principalPaid, 0) || 0;
                  const intPaid = p.interestAllocated || p.allocations?.reduce((sum, a) => sum + a.interestPaid, 0) || 0;
                  const feePaid = (p.feesAllocated || 0) + (p.penaltiesAllocated || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{p.receiptNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{loan?.customerName || 'Borrower'}</div>
                        <span className="text-[10px] font-mono text-slate-400">{loan?.loanAccountNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {formatTZS(p.amount, language)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        {formatTZS(prinPaid, language)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-300">
                        {formatTZS(intPaid, language)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatTZS(feePaid, language)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-white block">
                          {p.paymentMethod?.replace('_', ' ') || 'MPESA'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{p.channelReference}</span>
                      </td>
                      <td className="py-3 px-4">
                        {p.isReversed ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            <RotateCcw className="w-3 h-3" />
                            <span>{language === 'sw' ? 'IMEBATILISHWA' : 'REVERSED'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{language === 'sw' ? 'IMEGAWIWA' : 'ALLOCATED'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!p.isReversed ? (
                          <button
                            onClick={() => handleOpenReversal(p)}
                            className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1"
                            title="Reverse Payment with Compensating Double Entry"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{t.reverse}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">{language === 'sw' ? 'Imefidiwa' : 'Compensated'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record New Repayment Modal */}
      {showNewPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CreditCard className="w-5 h-5" />
                <h2 className="text-lg text-white font-bold">{t.recordPayment}</h2>
              </div>
              <button
                onClick={() => setShowNewPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordNewRepayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {language === 'sw' ? 'Chagua Mkopo Unaolipwa *' : 'Select Active Loan *'}
                </label>
                <select
                  required
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">{language === 'sw' ? '-- Chagua Mkopo --' : '-- Choose Loan --'}</option>
                  {activeLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.customerName} - {l.loanAccountNumber} (Bal: {formatTZS(l.totalOutstanding, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.amount} *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  placeholder="e.g. 50000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {language === 'sw' ? 'Njia ya Malipo *' : 'Payment Method *'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="MPESA">Vodacom M-Pesa</option>
                  <option value="AIRTEL_MONEY">Airtel Money</option>
                  <option value="TIGO_PESA">Tigo Pesa</option>
                  <option value="CASH">Branch Cashier (Taslimu)</option>
                  <option value="BANK_TRANSFER">CRDB Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {language === 'sw' ? 'Kumbukumbu ya Malipo / M-Pesa Code' : 'Channel Reference / M-Pesa Code'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. QKJ89H72KA"
                  value={channelRef}
                  onChange={(e) => setChannelRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewPaymentModal(false)}
                  disabled={isSubmitting}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-lg flex items-center space-x-2"
                >
                  {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{language === 'sw' ? 'Tuma Malipo' : 'Submit Repayment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Non-Destructive Payment Reversal Modal */}
      {showReversalModal && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-400 font-bold">
                <ShieldAlert className="w-5 h-5" />
                <h2 className="text-lg text-white font-bold">
                  {language === 'sw' ? 'Batilisha Risiti ya Malipo' : 'Reverse Payment Receipt'}
                </h2>
              </div>
              <button
                onClick={() => setShowReversalModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReversal} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Receipt Number:</span>
                  <span className="text-emerald-400 font-mono font-bold">{selectedPayment.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Original Amount:</span>
                  <span className="text-white font-mono font-bold">{formatTZS(selectedPayment.amount, language)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Authorized Operator:</span>
                  <span className="text-amber-300 font-medium">
                    {currentUser.firstName} {currentUser.lastName} ({currentUser.role})
                  </span>
                </div>
              </div>

              <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-xl text-rose-300 text-[11px] leading-relaxed">
                <strong>Financial Invariant Enforced:</strong> This action will NOT delete the original payment record. It will flag the payment as reversed, restore outstanding balances on affected installments, and automatically post an offsetting compensating journal voucher in the General Ledger.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {language === 'sw' ? 'Sababu ya Lazima ya Kubatilisha *' : 'Mandatory Audit Reason for Reversal *'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={language === 'sw' ? 'mfano: Malipo yaliingizwa mara mbili au namba ya mkopo isiyo sahihi' : 'e.g. Teller keyed wrong loan account number; duplicate M-Pesa push callback.'}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReversalModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow"
                >
                  {language === 'sw' ? 'Thibitisha Ubatilishaji' : 'Confirm Reversal & Post JV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
