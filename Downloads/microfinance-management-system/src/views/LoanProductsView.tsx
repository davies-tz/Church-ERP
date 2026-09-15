import React, { useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  Percent,
  ShieldAlert,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import {
  GracePeriodType,
  InterestMethod,
  RepaymentFrequency,
} from '../types';
import { generateRepaymentSchedule } from '../engines/scheduleEngine';
import { formatTZS, translations } from '../lib/i18n';

export const LoanProductsView: React.FC = () => {
  const { loanProducts, language } = useMfi();
  const t = translations[language];

  // Calculator State
  const [selectedProduct, setSelectedProduct] = useState(loanProducts[0]);
  const [calcPrincipal, setCalcPrincipal] = useState<number>(2000000);
  const [calcRate, setCalcRate] = useState<number>(selectedProduct.annualNominalRate);
  const [calcTerm, setCalcTerm] = useState<number>(6);
  const [calcMethod, setCalcMethod] = useState<InterestMethod>(selectedProduct.interestMethod);
  const [calcFrequency, setCalcFrequency] = useState<RepaymentFrequency>(selectedProduct.repaymentFrequency);
  const [calcGraceType, setCalcGraceType] = useState<GracePeriodType>(selectedProduct.gracePeriodType);
  const [calcGraceInstallments, setCalcGraceInstallments] = useState<number>(selectedProduct.gracePeriodInstallments);

  // When product changes, sync settings
  const handleProductSelect = (prod: typeof loanProducts[0]) => {
    setSelectedProduct(prod);
    setCalcPrincipal(Math.min(prod.maxPrincipal, Math.max(prod.minPrincipal, calcPrincipal)));
    setCalcRate(prod.annualNominalRate);
    setCalcMethod(prod.interestMethod);
    setCalcFrequency(prod.repaymentFrequency);
    setCalcGraceType(prod.gracePeriodType);
    setCalcGraceInstallments(prod.gracePeriodInstallments);
  };

  // Generate preview schedule
  const previewSchedule = generateRepaymentSchedule({
    loanId: 'preview-sim',
    disbursedPrincipal: calcPrincipal,
    annualNominalRate: calcRate,
    interestMethod: calcMethod,
    repaymentFrequency: calcFrequency,
    termInstallments: calcTerm,
    startDate: new Date().toISOString().split('T')[0],
    gracePeriodType: calcGraceType,
    gracePeriodInstallments: calcGraceInstallments,
  });

  const totalPrincipalDue = previewSchedule.reduce((s, i) => s + i.principalDue, 0);
  const totalInterestDue = previewSchedule.reduce((s, i) => s + i.interestDue, 0);
  const totalRepayment = totalPrincipalDue + totalInterestDue;

  // Invariant verification check
  const isInvariantBalanced = Math.abs(totalPrincipalDue - calcPrincipal) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">{t.products}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {language === 'sw'
            ? 'Injini ya fomula za kifedha (Flat, Declining Balance, na PMT Annuity) kwa mujibu wa taratibu za BOT.'
            : 'Configurable financial rulebook supporting Flat, Declining Balance, and Equal Installment (Annuity) methods.'}
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loanProducts.map((prod) => {
          const isSelected = prod.id === selectedProduct.id;
          return (
            <div
              key={prod.id}
              onClick={() => handleProductSelect(prod)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {prod.code}
                </span>
                <span className="text-xs font-bold text-white font-mono">{prod.annualNominalRate}% p.a.</span>
              </div>

              <h3 className="text-base font-bold text-white mt-3">{prod.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{prod.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'sw' ? 'Mbinu ya Riba:' : 'Interest Method:'}</span>
                  <strong className="text-emerald-400">{prod.interestMethod.replace('_', ' ')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'sw' ? 'Mzunguko:' : 'Repayment Frequency:'}</span>
                  <span>{prod.repaymentFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'sw' ? 'Kiwango cha Mkopo:' : 'Principal Range:'}</span>
                  <span className="font-mono">
                    {formatTZS(prod.minPrincipal, language)} - {formatTZS(prod.maxPrincipal, language)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'sw' ? 'Kipindi cha Neema:' : 'Grace Policy:'}</span>
                  <span>
                    {prod.gracePeriodType !== 'NONE'
                      ? `${prod.gracePeriodInstallments} inst. grace`
                      : language === 'sw'
                      ? 'Hakuna'
                      : 'None'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Repayment Schedule Engine Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              {language === 'sw'
                ? `Kikokotoo cha Ratiba ya Marejesho: ${selectedProduct.name}`
                : `Repayment Schedule Simulator: ${selectedProduct.name}`}
            </h2>
          </div>
          {isInvariantBalanced ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {language === 'sw'
                  ? 'Fomula Imelingana: Jumla(Principal) == Mkopo'
                  : 'Deterministic Invariant: Sum(Principal) == Disbursed'}
              </span>
            </span>
          ) : (
            <span className="text-xs text-rose-400 font-semibold flex items-center space-x-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Rounding Imbalance Warning</span>
            </span>
          )}
        </div>

        {/* Input Parameters Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Kiasi cha Mkopo (TZS)' : 'Loan Principal (TZS)'}
            </label>
            <input
              type="number"
              step="100000"
              value={calcPrincipal}
              onChange={(e) => setCalcPrincipal(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Riba (% kwa Mwaka)' : 'Nominal Rate (% p.a.)'}
            </label>
            <input
              type="number"
              step="0.5"
              value={calcRate}
              onChange={(e) => setCalcRate(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Awamu (Muda)' : 'Installments (Term)'}
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={calcTerm}
              onChange={(e) => setCalcTerm(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Mbinu ya Fomula' : 'Amortization Method'}
            </label>
            <select
              value={calcMethod}
              onChange={(e) => setCalcMethod(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="FLAT">Flat Interest</option>
              <option value="DECLINING_BALANCE">Declining Balance</option>
              <option value="EQUAL_INSTALLMENT">Equal Installment (PMT)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Mzunguko wa Kulipa' : 'Repayment Frequency'}
            </label>
            <select
              value={calcFrequency}
              onChange={(e) => setCalcFrequency(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="WEEKLY">Weekly / Kila Wiki</option>
              <option value="BIWEEKLY">Biweekly / Wiki Mbili</option>
              <option value="MONTHLY">Monthly / Kila Mwezi</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Kipindi cha Neema' : 'Principal Grace'}
            </label>
            <select
              value={calcGraceInstallments}
              onChange={(e) => setCalcGraceInstallments(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value={0}>0 Installments</option>
              <option value={1}>1 Installment</option>
              <option value={2}>2 Installments</option>
              <option value={3}>3 Installments</option>
            </select>
          </div>
        </div>

        {/* Calculated Financial Totals Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400">{language === 'sw' ? 'Jumla ya Mkopo:' : 'Total Principal Disbursed:'}</span>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {formatTZS(calcPrincipal, language)}
            </div>
          </div>
          <div>
            <span className="text-slate-400">{language === 'sw' ? 'Jumla ya Riba:' : 'Total Interest Generated:'}</span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {formatTZS(totalInterestDue, language)}
            </div>
          </div>
          <div>
            <span className="text-slate-400">{language === 'sw' ? 'Jumla ya Marejesho:' : 'Total Expected Repayment:'}</span>
            <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
              {formatTZS(totalRepayment, language)}
            </div>
          </div>
        </div>

        {/* Generated Amortization Schedule Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">{language === 'sw' ? 'Tarehe ya Kulipa' : 'Due Date'}</th>
                <th className="py-2.5 px-3 text-right">{language === 'sw' ? 'Mtaji (Principal)' : 'Principal Due'}</th>
                <th className="py-2.5 px-3 text-right">{language === 'sw' ? 'Riba (Interest)' : 'Interest Due'}</th>
                <th className="py-2.5 px-3 text-right">{language === 'sw' ? 'Jumla ya Awamu' : 'Total Due'}</th>
                <th className="py-2.5 px-3 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {previewSchedule.map((inst) => (
                <tr key={inst.installmentNumber} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-mono font-bold text-slate-400">{inst.installmentNumber}</td>
                  <td className="py-2 px-3 font-mono">{inst.dueDate}</td>
                  <td className="py-2 px-3 text-right font-mono text-white">
                    {formatTZS(inst.principalDue, language)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-400">
                    {formatTZS(inst.interestDue, language)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">
                    {formatTZS(inst.totalDue, language)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                      PENDING
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 border-t border-slate-800 font-bold text-white">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px]">
                  {language === 'sw' ? 'Jumla Kuu:' : 'Grand Totals:'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-white">
                  {formatTZS(totalPrincipalDue, language)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                  {formatTZS(totalInterestDue, language)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                  {formatTZS(totalRepayment, language)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
