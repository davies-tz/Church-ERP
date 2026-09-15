import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  History,
  Lock,
  PiggyBank,
  Search,
  Unlock,
  X,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { SavingsAccount } from '../types';
import { formatTZS, translations } from '../lib/i18n';

export const SavingsView: React.FC = () => {
  const {
    savingsAccounts,
    savingsTransactions,
    currentBranchId,
    processSavingsDeposit,
    processSavingsWithdrawal,
    language,
  } = useMfi();

  const { showToast } = useToast();
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(null);
  const [modalType, setModalType] = useState<'DEPOSIT' | 'WITHDRAW' | 'HISTORY' | null>(null);

  const [txAmount, setTxAmount] = useState<number>(50000);
  const [txMethod, setTxMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER'>('MOBILE_MONEY');
  const [txRef, setTxRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredAccounts = savingsAccounts.filter((acc) => {
    const matchesBranch = currentBranchId === 'ALL' || acc.branchId === currentBranchId;
    const matchesSearch =
      acc.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const totalVoluntary = savingsAccounts.reduce(
    (sum, a) => sum + (a.productType === 'VOLUNTARY' ? a.balance : 0),
    0
  );
  const totalCompulsory = savingsAccounts.reduce(
    (sum, a) => sum + (a.productType === 'COMPULSORY_COLLATERAL' ? a.balance : 0),
    0
  );

  const handleOpenAction = (account: SavingsAccount, type: 'DEPOSIT' | 'WITHDRAW' | 'HISTORY') => {
    setSelectedAccount(account);
    setModalType(type);
    if (type === 'WITHDRAW') {
      const free = Math.max(0, account.balance - account.lockedAmount);
      setTxAmount(Math.min(50000, free));
    } else {
      setTxAmount(50000);
    }
    setTxRef(`SAV-${Date.now().toString().slice(-6)}`);
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || txAmount <= 0) return;

    setIsSubmitting(true);
    try {
      if (modalType === 'DEPOSIT') {
        await processSavingsDeposit(selectedAccount.id, txAmount, txMethod, txRef);
        showToast(
          'success',
          language === 'sw' ? 'Amana Imewekwa' : 'Deposit Successful',
          language === 'sw'
            ? `Kiasi cha ${formatTZS(txAmount, language)} kimewekwa kwenye akaunti ${selectedAccount.accountNumber}.`
            : `Deposit of ${formatTZS(txAmount, language)} credited to account ${selectedAccount.accountNumber}.`
        );
      } else if (modalType === 'WITHDRAW') {
        await processSavingsWithdrawal(selectedAccount.id, txAmount, txMethod, txRef);
        showToast(
          'success',
          language === 'sw' ? 'Pesa Zimetolewa' : 'Withdrawal Successful',
          language === 'sw'
            ? `Kiasi cha ${formatTZS(txAmount, language)} kimetolewa kwenye akaunti ${selectedAccount.accountNumber}.`
            : `Withdrawal of ${formatTZS(txAmount, language)} processed from account ${selectedAccount.accountNumber}.`
        );
      }
      setModalType(null);
      setSelectedAccount(null);
    } catch (err: any) {
      showToast('error', 'Transaction Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const accountHistory = selectedAccount
    ? savingsTransactions.filter((tx) => tx.savingsAccountId === selectedAccount.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t.savings}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'sw'
              ? 'Leja ya Akiba, amana za hiari, na akiba ya lazima (Dhamana ya fedha taslimu).'
              : 'Voluntary savings deposits and mandatory group lending cash collateral lock reserves.'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {language === 'sw' ? 'Jumla ya Amana za Akiba' : 'Total Savings Deposit Base'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-white font-mono">
              {formatTZS(totalVoluntary + totalCompulsory, language)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {savingsAccounts.length} {language === 'sw' ? 'Akaunti za Wateja' : 'Active Accounts'}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {language === 'sw' ? 'Akiba ya Lazima (Dhamana)' : 'Compulsory Loan Collateral'}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-amber-300 font-mono">
              {formatTZS(totalCompulsory, language)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'sw' ? 'Imefungwa kama dhamana ya mikopo' : 'Locked against active borrower portfolios'}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {language === 'sw' ? 'Akiba ya Hiari (Inayotoleka)' : 'Liquid Voluntary Savings'}
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Unlock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-sky-400 font-mono">
              {formatTZS(totalVoluntary, language)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'sw' ? 'Inapatikana kutolewa mara moja' : 'Available for immediate client withdrawal'}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Accounts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/50 flex items-center space-x-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              language === 'sw'
                ? 'Tafuta kwa namba ya akaunti au jina la mteja...'
                : 'Search by savings account number or customer...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{language === 'sw' ? 'Namba ya Akaunti' : 'Account Number'}</th>
                <th className="py-3 px-4">{t.customer}</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Aina ya Akiba' : 'Product Type'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Jumla ya Salio' : 'Total Balance'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Dhamana Iliyofungwa' : 'Locked Collateral'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Salio Huria' : 'Free Available'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Hatua' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredAccounts.map((acc) => {
                const freeAvailable = acc.balance - acc.lockedAmount;
                return (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {acc.accountNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{acc.customerName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          acc.productType === 'COMPULSORY_COLLATERAL'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {acc.productType === 'COMPULSORY_COLLATERAL'
                          ? language === 'sw'
                            ? 'LAZIMA / DHAMANA'
                            : 'COMPULSORY'
                          : language === 'sw'
                          ? 'HIARI'
                          : 'VOLUNTARY'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatTZS(acc.balance, language)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-300">
                      {formatTZS(acc.lockedAmount, language)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
                      {formatTZS(freeAvailable, language)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenAction(acc, 'DEPOSIT')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow inline-flex items-center space-x-1 transition-all"
                      >
                        <ArrowDownRight className="w-3 h-3" />
                        <span>{language === 'sw' ? 'Weka' : 'Deposit'}</span>
                      </button>
                      <button
                        onClick={() => handleOpenAction(acc, 'WITHDRAW')}
                        disabled={freeAvailable <= 0}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-all ${
                          freeAvailable > 0
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{language === 'sw' ? 'Toa' : 'Withdraw'}</span>
                      </button>
                      <button
                        onClick={() => handleOpenAction(acc, 'HISTORY')}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title={language === 'sw' ? 'Historia ya Miamala' : 'Passbook History'}
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit / Withdrawal Modal */}
      {(modalType === 'DEPOSIT' || modalType === 'WITHDRAW') && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{selectedAccount.accountNumber}</span>
                <h2 className="text-lg font-bold text-white">
                  {modalType === 'DEPOSIT'
                    ? language === 'sw'
                      ? 'Weka Amana ya Akiba'
                      : 'Process Savings Deposit'
                    : language === 'sw'
                    ? 'Kutoa Pesa ya Akiba'
                    : 'Process Savings Withdrawal'}
                </h2>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>{t.customer}:</span>
                  <span className="text-white font-semibold">{selectedAccount.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{language === 'sw' ? 'Salio la Sasa:' : 'Current Balance:'}</span>
                  <span className="text-white font-mono font-bold">{formatTZS(selectedAccount.balance, language)}</span>
                </div>
                {modalType === 'WITHDRAW' && (
                  <div className="flex justify-between text-amber-400">
                    <span>{language === 'sw' ? 'Dhamana Iliyofungwa:' : 'Locked Collateral (Untouchable):'}</span>
                    <span className="font-mono font-bold">{formatTZS(selectedAccount.lockedAmount, language)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {language === 'sw' ? 'Kiasi (TZS) *' : 'Transaction Amount (TZS) *'}
                </label>
                <input
                  required
                  type="number"
                  step="1000"
                  min="1000"
                  max={modalType === 'WITHDRAW' ? selectedAccount.balance - selectedAccount.lockedAmount : undefined}
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {language === 'sw' ? 'Njia ya Malipo' : 'Payment Method'}
                </label>
                <select
                  value={txMethod}
                  onChange={(e) => setTxMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="MOBILE_MONEY">Mobile Money (M-Pesa / Tigo Pesa / Airtel Money)</option>
                  <option value="CASH">{language === 'sw' ? 'Dirisha la Tawi (Cash Till)' : 'Branch Cash Till'}</option>
                  <option value="BANK_TRANSFER">{language === 'sw' ? 'Uhamisho wa Benki' : 'Bank Transfer'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {language === 'sw' ? 'Kumbukumbu ya Muamala / Reference' : 'External Channel Reference'}
                </label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  disabled={isSubmitting}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow flex items-center space-x-2 ${
                    modalType === 'DEPOSIT'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-black'
                  }`}
                >
                  {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>
                    {modalType === 'DEPOSIT'
                      ? language === 'sw'
                        ? 'Thibitisha Amana'
                        : 'Confirm Deposit'
                      : language === 'sw'
                      ? 'Thibitisha Kutoa'
                      : 'Confirm Withdrawal'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Passbook History Modal */}
      {modalType === 'HISTORY' && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{selectedAccount.accountNumber}</span>
                <h2 className="text-lg font-bold text-white">{selectedAccount.customerName}</h2>
                <p className="text-xs text-slate-400">
                  {language === 'sw' ? 'Daftari la Akiba / Passbook Ledger' : 'Passbook Ledger History'}
                </p>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {accountHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {language === 'sw' ? 'Hakuna miamala iliyorekodiwa bado.' : 'No passbook transactions recorded yet.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950 text-xs">
                {accountHistory.map((tx) => (
                  <div key={tx.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span
                        className={`font-bold ${
                          tx.transactionType === 'DEPOSIT' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {tx.transactionType}
                      </span>
                      <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                        {tx.reference || tx.paymentMethod} • {tx.postedBy}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white">
                        {tx.transactionType === 'DEPOSIT' ? '+' : '-'}
                        {formatTZS(tx.amount, language)}
                      </span>
                      <p className="text-slate-500 text-[10px] font-mono mt-0.5">
                        {language === 'sw' ? 'Salio:' : 'Bal:'} {formatTZS(tx.balanceAfter, language)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
