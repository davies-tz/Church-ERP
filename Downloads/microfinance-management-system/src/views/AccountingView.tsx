import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Plus,
  Scale,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { ChartOfAccount, JournalEntry } from '../types';
import { formatTZS, roundCurrency, translations } from '../lib/i18n';
import { generateTrialBalance } from '../engines/accountingEngine';

export const AccountingView: React.FC = () => {
  const { chartOfAccounts, journals, language, postManualJournalEntry } = useMfi();
  const { showToast } = useToast();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'COA' | 'JOURNALS' | 'TRIAL_BALANCE'>('COA');
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);

  // Manual Journal Modal State
  const [showManualVoucherModal, setShowManualVoucherModal] = useState(false);
  const [voucherNarration, setVoucherNarration] = useState('');
  const [voucherLines, setVoucherLines] = useState<
    Array<{ accountId: string; entryType: 'DEBIT' | 'CREDIT'; amount: number }>
  >([
    { accountId: chartOfAccounts[0]?.id || 'coa-1110', entryType: 'DEBIT', amount: 500000 },
    { accountId: chartOfAccounts[1]?.id || 'coa-1200', entryType: 'CREDIT', amount: 500000 },
  ]);
  const [isPostingVoucher, setIsPostingVoucher] = useState(false);

  const trialBalance = generateTrialBalance(chartOfAccounts);

  // Group accounts by classification
  const assetAccounts = chartOfAccounts.filter((a) => a.type === 'ASSET');
  const liabilityAccounts = chartOfAccounts.filter((a) => a.type === 'LIABILITY');
  const equityAccounts = chartOfAccounts.filter((a) => a.type === 'EQUITY');
  const revenueAccounts = chartOfAccounts.filter((a) => a.type === 'INCOME');
  const expenseAccounts = chartOfAccounts.filter((a) => a.type === 'EXPENSE');

  const totalModalDebit = voucherLines
    .filter((l) => l.entryType === 'DEBIT')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalModalCredit = voucherLines
    .filter((l) => l.entryType === 'CREDIT')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const isVoucherBalanced = Math.abs(totalModalDebit - totalModalCredit) < 0.01 && totalModalDebit > 0;

  const handleAddVoucherLine = () => {
    setVoucherLines((prev) => [
      ...prev,
      { accountId: chartOfAccounts[0]?.id || 'coa-1110', entryType: 'DEBIT', amount: 0 },
    ]);
  };

  const handleRemoveVoucherLine = (index: number) => {
    if (voucherLines.length <= 2) {
      showToast('warning', 'Minimum Splits', 'A double-entry voucher must contain at least 2 split lines.');
      return;
    }
    setVoucherLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostManualVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherNarration.trim()) {
      showToast('warning', 'Missing Narration', 'Please provide an audit description / narration for this voucher.');
      return;
    }
    if (!isVoucherBalanced) {
      showToast(
        'error',
        'Double-Entry Invariant Violated',
        `Total Debits (${formatTZS(totalModalDebit, language)}) must equal Total Credits (${formatTZS(totalModalCredit, language)}).`
      );
      return;
    }

    setIsPostingVoucher(true);
    try {
      const entry = await postManualJournalEntry(voucherNarration, voucherLines);
      showToast(
        'success',
        language === 'sw' ? 'Vocha ya Leja Imepostiwa' : 'Journal Voucher Posted',
        language === 'sw'
          ? `Vocha ${entry.entryNumber} imerekodiwa na kubalansiwa kikamilifu.`
          : `Voucher ${entry.entryNumber} posted to General Ledger and Chart of Accounts.`
      );
      setShowManualVoucherModal(false);
      setVoucherNarration('');
    } catch (err: any) {
      showToast('error', 'Posting Failed', err.message);
    } finally {
      setIsPostingVoucher(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t.accounting}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'sw'
              ? 'Leja Kuu ya Double-Entry (BOT), chati ya akaunti (COA), na urari wa majaribio (Trial Balance).'
              : 'Strict double-entry bookkeeping engine enforcing debit-equals-credit accounting invariant.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Invariant indicator badge */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm ${
              trialBalance.isBalanced
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>
              {trialBalance.isBalanced
                ? language === 'sw'
                  ? 'Urari Umebalansi: DR == CR'
                  : 'GL Balanced: Total DR == Total CR'
                : `Out of Balance: Variance ${formatTZS(trialBalance.variance, language)}`}
            </span>
          </div>

          <button
            onClick={() => setShowManualVoucherModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-lg shadow-emerald-950/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'sw' ? 'Posti Vocha ya Leja' : 'Post Journal Voucher'}</span>
          </button>
        </div>
      </div>

      {/* Navigation sub-tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('COA')}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'COA' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-white'
          }`}
        >
          {language === 'sw' ? 'Chati ya Akaunti (COA)' : 'Chart of Accounts (COA)'}
        </button>
        <button
          onClick={() => setActiveTab('JOURNALS')}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'JOURNALS' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-white'
          }`}
        >
          {language === 'sw' ? 'Miamala ya Leja' : 'Journal Entries Ledger'} ({journals.length})
        </button>
        <button
          onClick={() => setActiveTab('TRIAL_BALANCE')}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'TRIAL_BALANCE' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t.trialBalance}
        </button>
      </div>

      {/* Tab 1: Chart of Accounts */}
      {activeTab === 'COA' && (
        <div className="space-y-4">
          {[
            { title: '1000 - Assets / Mali za Asasi (Cash, Portfolios & Receivables)', accounts: assetAccounts, color: 'text-emerald-400' },
            { title: '2000 - Liabilities / Madeni ya Asasi (Customer Savings & Borrowings)', accounts: liabilityAccounts, color: 'text-amber-400' },
            { title: '3000 - Equity / Mtaji wa Wenye Hisa (Retained Earnings & Capital)', accounts: equityAccounts, color: 'text-purple-400' },
            { title: '4000 - Revenue / Mapato (Interest Income & Origination Fees)', accounts: revenueAccounts, color: 'text-sky-400' },
            { title: '5000 - Expenses / Matumizi (Provision for Bad Debts & Ops)', accounts: expenseAccounts, color: 'text-rose-400' },
          ].map((section) => (
            <div key={section.title} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center text-xs">
                <span className={`font-bold ${section.color}`}>{section.title}</span>
                <span className="text-slate-500 font-mono">{section.accounts.length} Accounts</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 w-28">GL Code</th>
                      <th className="py-2.5 px-4">{language === 'sw' ? 'Jina la Akaunti' : 'Account Name'}</th>
                      <th className="py-2.5 px-4">Classification</th>
                      <th className="py-2.5 px-4">Normal Balance</th>
                      <th className="py-2.5 px-4 text-right">{language === 'sw' ? 'Salio la Sasa' : 'Current Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {section.accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-mono font-bold text-white">{acc.code}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-200">{acc.name}</td>
                        <td className="py-2.5 px-4 text-slate-400">{acc.type}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">{acc.normalBalance}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                          {formatTZS(acc.balance, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Journal Entries Ledger */}
      {activeTab === 'JOURNALS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">{language === 'sw' ? 'Tarehe' : 'Date'}</th>
                  <th className="py-3 px-4">{language === 'sw' ? 'Maelezo ya Muamala' : 'Narration / Description'}</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Debit (DR)</th>
                  <th className="py-3 px-4 text-right">Credit (CR)</th>
                  <th className="py-3 px-4 text-right">Lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {journals.map((j) => {
                  const totDr = j.totalDebit || j.lines?.filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + l.amount, 0) || 0;
                  const totCr = j.totalCredit || j.lines?.filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + l.amount, 0) || 0;
                  return (
                    <tr
                      key={j.id}
                      onClick={() => setSelectedJournal(j)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{j.entryNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{j.transactionDate}</td>
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate">{j.narration}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{j.referenceId || j.referenceType}</td>
                      <td className="py-3 px-4 text-right font-mono text-white font-bold">{formatTZS(totDr, language)}</td>
                      <td className="py-3 px-4 text-right font-mono text-white font-bold">{formatTZS(totCr, language)}</td>
                      <td className="py-3 px-4 text-right text-slate-400">{j.lines?.length || 0} splits</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Trial Balance */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">{t.trialBalance}</h2>
              <p className="text-xs text-slate-400">
                {language === 'sw'
                  ? 'Urari wa majaribio wa hesabu za Leja Kuu ya Asasi kwa mujibu wa sheria za BOT'
                  : 'Statement of cumulative debits and credits verifying fundamental double-entry balance'}
              </p>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-slate-400">Status: </span>
              <strong className={trialBalance.isBalanced ? 'text-emerald-400' : 'text-rose-400'}>
                {trialBalance.isBalanced
                  ? language === 'sw'
                    ? 'UMEBALANSI KIKAMILIFU'
                    : 'PERFECTLY BALANCED'
                  : 'IMBALANCE DETECTED'}
              </strong>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 w-28">GL Code</th>
                  <th className="py-2.5 px-4">{language === 'sw' ? 'Jina la Akaunti' : 'Account Title'}</th>
                  <th className="py-2.5 px-4 text-right">Debit (DR)</th>
                  <th className="py-2.5 px-4 text-right">Credit (CR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {trialBalance.rows.map((row) => (
                  <tr key={row.accountCode} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-300">{row.accountCode}</td>
                    <td className="py-2.5 px-4 font-medium text-white">{row.accountName}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                      {row.debitAmount > 0 ? formatTZS(row.debitAmount, language) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-sky-400">
                      {row.creditAmount > 0 ? formatTZS(row.creditAmount, language) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-bold text-white text-xs">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider">
                    {language === 'sw' ? 'Jumla Kuu ya Urari wa Majaribio:' : 'Grand Trial Balance Totals:'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    {formatTZS(trialBalance.totalDebit, language)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sky-400">
                    {formatTZS(trialBalance.totalCredit, language)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Post Manual Journal Voucher Modal */}
      {showManualVoucherModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <BookOpen className="w-5 h-5" />
                <h2 className="text-lg text-white">
                  {language === 'sw' ? 'Posti Vocha ya Leja (General Journal Voucher)' : 'Post General Journal Voucher'}
                </h2>
              </div>
              <button
                onClick={() => setShowManualVoucherModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostManualVoucher} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {language === 'sw' ? 'Maelezo ya Vocha / Narration *' : 'Voucher Narration / Audit Purpose *'}
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Bank charges reconciliation, salary payout, interest accrual"
                  value={voucherNarration}
                  onChange={(e) => setVoucherNarration(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Split Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">
                    {language === 'sw' ? 'Mistari ya Double-Entry (DR & CR)' : 'Double-Entry Split Lines'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVoucherLine}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'sw' ? 'Ongeza Mstari' : 'Add Split Line'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {voucherLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 items-center"
                    >
                      <div className="col-span-5">
                        <select
                          value={line.accountId}
                          onChange={(e) => {
                            const newLines = [...voucherLines];
                            newLines[idx].accountId = e.target.value;
                            setVoucherLines(newLines);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        >
                          {chartOfAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <select
                          value={line.entryType}
                          onChange={(e) => {
                            const newLines = [...voucherLines];
                            newLines[idx].entryType = e.target.value as any;
                            setVoucherLines(newLines);
                          }}
                          className={`w-full font-bold border border-slate-700 rounded-lg p-2 ${
                            line.entryType === 'DEBIT' ? 'bg-emerald-950/60 text-emerald-300' : 'bg-sky-950/60 text-sky-300'
                          }`}
                        >
                          <option value="DEBIT">DEBIT (DR)</option>
                          <option value="CREDIT">CREDIT (CR)</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="Amount"
                          value={line.amount || ''}
                          onChange={(e) => {
                            const newLines = [...voucherLines];
                            newLines[idx].amount = Number(e.target.value) || 0;
                            setVoucherLines(newLines);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveVoucherLine(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Balance Check Panel */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
                  isVoucherBalanced
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                }`}
              >
                <div>
                  <span>Total DR: </span>
                  <strong>{formatTZS(totalModalDebit, language)}</strong>
                </div>
                <div>
                  <span>Total CR: </span>
                  <strong>{formatTZS(totalModalCredit, language)}</strong>
                </div>
                <div>
                  <span>Variance: </span>
                  <strong>{formatTZS(Math.abs(totalModalDebit - totalModalCredit), language)}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowManualVoucherModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!isVoucherBalanced || isPostingVoucher}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-lg flex items-center space-x-2"
                >
                  {isPostingVoucher && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{language === 'sw' ? 'Posti Vocha Hii' : 'Post Balanced Voucher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Journal Entry Detail Modal */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{selectedJournal.entryNumber}</span>
                <h2 className="text-base font-bold text-white mt-0.5">{selectedJournal.narration}</h2>
                <p className="text-xs text-slate-400">
                  Posted on {selectedJournal.transactionDate} by {selectedJournal.postedBy}
                </p>
              </div>
              <button
                onClick={() => setSelectedJournal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">GL Code</th>
                    <th className="py-2 px-3">{language === 'sw' ? 'Akaunti' : 'Account'}</th>
                    <th className="py-2 px-3 text-right">Debit (DR)</th>
                    <th className="py-2 px-3 text-right">Credit (CR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedJournal.lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="py-2 px-3 font-mono text-slate-400">{line.accountCode}</td>
                      <td className="py-2 px-3 font-semibold text-white">{line.accountName}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400">
                        {line.entryType === 'DEBIT' ? formatTZS(line.amount, language) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-sky-400">
                        {line.entryType === 'CREDIT' ? formatTZS(line.amount, language) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 border-t border-slate-800 font-bold text-white text-xs">
                  <tr>
                    <td colSpan={2} className="py-2 px-3 text-right">
                      {language === 'sw' ? 'Jumla:' : 'Total:'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400">
                      {formatTZS(
                        selectedJournal.totalDebit ||
                          selectedJournal.lines?.filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + l.amount, 0) ||
                          0,
                        language
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-sky-400">
                      {formatTZS(
                        selectedJournal.totalCredit ||
                          selectedJournal.lines?.filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + l.amount, 0) ||
                          0,
                        language
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
