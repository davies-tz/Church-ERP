import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileSpreadsheet,
  FileText,
  Search,
  User,
  X,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { Loan, LoanInstallment } from '../types';
import { formatTZS } from '../engines/interestEngine';

export const LoanServicingView: React.FC = () => {
  const { loans, branches, currentBranchId, processRepayment } = useMfi();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Quick Payment Modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'MOBILE_MONEY' | 'CASH' | 'BANK_TRANSFER'>('MOBILE_MONEY');
  const [payRef, setPayRef] = useState('');

  const filteredLoans = loans.filter(l => {
    const matchesBranch = currentBranchId === 'ALL' || l.branchId === currentBranchId;
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    const matchesSearch =
      l.loanAccountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBranch && matchesStatus && matchesSearch;
  });

  const handleOpenPay = (loan: Loan) => {
    setSelectedLoan(loan);
    const nextDue = loan.installments.find(i => i.status !== 'PAID');
    setPayAmount(nextDue ? nextDue.totalDue - nextDue.totalPaid : 100000);
    setPayRef(`MAN-${Date.now().toString().slice(-6)}`);
    setShowPayModal(true);
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || payAmount <= 0) return;

    try {
      const payment = processRepayment(selectedLoan.id, payAmount, payMethod, payRef);
      // Refresh selected loan from updated array
      const updated = loans.find(l => l.id === selectedLoan.id);
      if (updated) setSelectedLoan(updated);
      setShowPayModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Active Loan Portfolio &amp; Amortization Schedules</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full installment lifecycle management, arrears aging, and deterministic repayment breakdown.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by loan account number or borrower name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'IN_ARREARS', 'CLOSED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === status
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Loan Account #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-right">Disbursed Principal</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-center">Days in Arrears</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No loans match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLoans.map(loan => (
                  <tr key={loan.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {loan.loanAccountNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{loan.customerName}</div>
                      <span className="text-[10px] text-slate-400">
                        {branches.find(b => b.id === loan.branchId)?.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{loan.productName}</td>
                    <td className="py-3 px-4 text-right font-mono text-white">
                      {formatTZS(loan.disbursedPrincipal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatTZS(loan.totalOutstanding)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {loan.daysInArrears > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 text-[10px]">
                          {loan.daysInArrears} days
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">0 days</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          loan.status === 'IN_ARREARS'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : loan.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {loan.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedLoan(loan)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs font-semibold border border-slate-700"
                        title="View Schedule and Ledger"
                      >
                        Schedule
                      </button>
                      {loan.status !== 'CLOSED' && (
                        <button
                          onClick={() => handleOpenPay(loan)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-semibold shadow"
                        >
                          Repay
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loan Schedule & Detail Modal */}
      {selectedLoan && !showPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {selectedLoan.loanAccountNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedLoan.status === 'IN_ARREARS'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {selectedLoan.status.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  {selectedLoan.customerName} — {selectedLoan.productName}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Disbursed on {new Date(selectedLoan.disbursedAt).toLocaleDateString()} by {selectedLoan.disbursedBy}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {selectedLoan.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleOpenPay(selectedLoan)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow"
                  >
                    Intake Repayment
                  </button>
                )}
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Disbursed Principal</span>
                <p className="font-bold text-white font-mono mt-1">
                  {formatTZS(selectedLoan.disbursedPrincipal)}
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Outstanding Principal</span>
                <p className="font-bold text-emerald-400 font-mono mt-1">
                  {formatTZS(selectedLoan.outstandingPrincipal)}
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Outstanding Interest</span>
                <p className="font-bold text-amber-300 font-mono mt-1">
                  {formatTZS(selectedLoan.outstandingInterest)}
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Days Past Due (DPD)</span>
                <p
                  className={`font-bold font-mono mt-1 ${
                    selectedLoan.daysInArrears > 0 ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {selectedLoan.daysInArrears} Days
                </p>
              </div>
            </div>

            {/* Amortization Schedule Table */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Deterministic Amortization Schedule</span>
              </h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Principal Due</th>
                      <th className="py-2.5 px-3 text-right">Interest Due</th>
                      <th className="py-2.5 px-3 text-right">Total Installment</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {selectedLoan.installments.map(inst => (
                      <tr key={inst.installmentNumber} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-400">
                          {inst.installmentNumber}
                        </td>
                        <td className="py-2 px-3 font-mono">{inst.dueDate}</td>
                        <td className="py-2 px-3 text-right font-mono text-white">
                          {formatTZS(inst.principalDue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400">
                          {formatTZS(inst.interestDue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">
                          {formatTZS(inst.totalDue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-200">
                          {formatTZS(inst.totalPaid)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              inst.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : inst.status === 'OVERDUE'
                                ? 'bg-rose-500/20 text-rose-400'
                                : inst.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {inst.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Payment Intake Modal */}
      {showPayModal && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400">{selectedLoan.loanAccountNumber}</span>
                <h2 className="text-lg font-bold text-white">Intake Loan Repayment</h2>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400">
                  <span>Borrower:</span>
                  <span className="text-white font-semibold">{selectedLoan.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-400 mt-1">
                  <span>Total Outstanding:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatTZS(selectedLoan.totalOutstanding)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Repayment Amount (TZS) *</label>
                <input
                  required
                  type="number"
                  step="1000"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Channel / Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="MOBILE_MONEY">Vodacom M-Pesa / Tigo Pesa</option>
                  <option value="CASH">Branch Cash Till</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Transaction Reference / Receipt ID</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400">
                Cascade Priority: <strong>Penalties &rarr; Fees &rarr; Interest Due &rarr; Principal Due</strong>. Any excess will reduce future principal and schedule.
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded text-xs transition-colors shadow"
                >
                  Post Payment &amp; Update Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
