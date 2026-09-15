import React from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  PieChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { calculatePortfolioAtRisk, generateAgingSummary } from '../engines/arrearsEngine';
import { formatTZS, translations } from '../lib/i18n';

export const ReportsView: React.FC = () => {
  const { loans, branches, currentBranchId, customers, language } = useMfi();
  const { showToast } = useToast();
  const t = translations[language];

  const filteredLoans =
    currentBranchId === 'ALL' ? loans : loans.filter((l) => l.branchId === currentBranchId);

  const par = calculatePortfolioAtRisk(filteredLoans);

  // Regulatory loan classification provisioning standards (BOT Tier 2)
  const classificationRows = [
    {
      grade: 'CURRENT (YA KAWAIDA)',
      dpd: '0 Days',
      provisionRate: '1%',
      loanCount: filteredLoans.filter((l) => l.daysInArrears === 0).length,
      principal: filteredLoans
        .filter((l) => l.daysInArrears === 0)
        .reduce((s, l) => s + l.outstandingPrincipal, 0),
      provisionAmount:
        filteredLoans
          .filter((l) => l.daysInArrears === 0)
          .reduce((s, l) => s + l.outstandingPrincipal, 0) * 0.01,
      badge: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      grade: 'ESPECIALLY MENTIONED (CHINI YA UANGALIZI)',
      dpd: '1 - 30 Days',
      provisionRate: '3%',
      loanCount: filteredLoans.filter((l) => l.daysInArrears >= 1 && l.daysInArrears <= 30).length,
      principal: filteredLoans
        .filter((l) => l.daysInArrears >= 1 && l.daysInArrears <= 30)
        .reduce((s, l) => s + l.outstandingPrincipal, 0),
      provisionAmount:
        filteredLoans
          .filter((l) => l.daysInArrears >= 1 && l.daysInArrears <= 30)
          .reduce((s, l) => s + l.outstandingPrincipal, 0) * 0.03,
      badge: 'bg-amber-500/20 text-amber-400',
    },
    {
      grade: 'SUBSTANDARD (DUNI)',
      dpd: '31 - 60 Days',
      provisionRate: '20%',
      loanCount: filteredLoans.filter((l) => l.daysInArrears >= 31 && l.daysInArrears <= 60).length,
      principal: filteredLoans
        .filter((l) => l.daysInArrears >= 31 && l.daysInArrears <= 60)
        .reduce((s, l) => s + l.outstandingPrincipal, 0),
      provisionAmount:
        filteredLoans
          .filter((l) => l.daysInArrears >= 31 && l.daysInArrears <= 60)
          .reduce((s, l) => s + l.outstandingPrincipal, 0) * 0.2,
      badge: 'bg-orange-500/20 text-orange-400',
    },
    {
      grade: 'DOUBTFUL (YENYE MASHAKA)',
      dpd: '61 - 90 Days',
      provisionRate: '50%',
      loanCount: filteredLoans.filter((l) => l.daysInArrears >= 61 && l.daysInArrears <= 90).length,
      principal: filteredLoans
        .filter((l) => l.daysInArrears >= 61 && l.daysInArrears <= 90)
        .reduce((s, l) => s + l.outstandingPrincipal, 0),
      provisionAmount:
        filteredLoans
          .filter((l) => l.daysInArrears >= 61 && l.daysInArrears <= 90)
          .reduce((s, l) => s + l.outstandingPrincipal, 0) * 0.5,
      badge: 'bg-rose-500/20 text-rose-400',
    },
    {
      grade: 'LOSS (HASARA)',
      dpd: '90+ Days',
      provisionRate: '100%',
      loanCount: filteredLoans.filter((l) => l.daysInArrears > 90).length,
      principal: filteredLoans
        .filter((l) => l.daysInArrears > 90)
        .reduce((s, l) => s + l.outstandingPrincipal, 0),
      provisionAmount:
        filteredLoans
          .filter((l) => l.daysInArrears > 90)
          .reduce((s, l) => s + l.outstandingPrincipal, 0) * 1.0,
      badge: 'bg-rose-700/30 text-rose-300',
    },
  ];

  const totalRequiredProvision = classificationRows.reduce((sum, r) => sum + r.provisionAmount, 0);

  const handleExportBotReport = () => {
    const csvRows = [
      ['BANK OF TANZANIA - PRUDENTIAL RETURN SCHEDULE 4'],
      ['Microfinance Portfolio Quality & Statutory Impairment Return'],
      ['Generated On', new Date().toISOString()],
      ['Branch Scope', currentBranchId],
      [],
      ['Classification Grade', 'Aging Range', 'Provision %', 'Loan Count', 'Outstanding Principal (TZS)', 'Required Reserve (TZS)'],
      ...classificationRows.map((r) => [
        r.grade,
        r.dpd,
        r.provisionRate,
        r.loanCount,
        r.principal,
        r.provisionAmount,
      ]),
      [],
      ['Total Gross Portfolio', '', '', par.activeLoans, par.grossLoanPortfolio, totalRequiredProvision],
      ['PAR > 30 Days Rate', `${par.par30Rate}%`],
      ['PAR > 90 Days Rate (NPL)', `${par.par90Rate}%`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BOT_Schedule_4_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      'success',
      language === 'sw' ? 'Ripoti Imepakuliwa' : 'Report Exported',
      language === 'sw'
        ? 'Ripoti ya BOT Schedule 4 imezalishwa kama faili la CSV.'
        : 'BOT Schedule 4 prudential returns report successfully exported as CSV.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t.reports}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'sw'
              ? 'Ripoti za kisheria za Benki Kuu ya Tanzania (BOT), mgawanyo wa mikopo kulingana na umri, na hesabu za akiba ya hasara.'
              : 'Bank of Tanzania (BOT) prudential returns, aging buckets, and loan loss reserve calculation.'}
          </p>
        </div>

        <button
          onClick={handleExportBotReport}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 border border-slate-700 transition-all shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>{language === 'sw' ? 'Pakua BOT Schedule 4 (CSV)' : 'Export BOT Schedule 4 (CSV)'}</span>
        </button>
      </div>

      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">
            {language === 'sw' ? 'Jumla ya Mikopo Hai' : 'Gross Loan Portfolio'}
          </span>
          <div className="text-xl font-bold text-white font-mono mt-2">
            {formatTZS(par.grossLoanPortfolio, language)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {par.activeLoans} {language === 'sw' ? 'Mikopo Inayoendelea' : 'Active Loans'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">PAR &gt; 30 Days Rate</span>
          <div className="text-xl font-bold text-rose-400 font-mono mt-2">
            {par.par30Rate}%
          </div>
          <p className="text-xs text-slate-500 mt-1">{formatTZS(par.par30Principal, language)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">PAR &gt; 90 Days (NPL)</span>
          <div className="text-xl font-bold text-rose-500 font-mono mt-2">
            {par.par90Rate}%
          </div>
          <p className="text-xs text-slate-500 mt-1">{formatTZS(par.par90Principal, language)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">
            {language === 'sw' ? 'Akiba ya Hasara ya Mikopo' : 'Total Required Provision'}
          </span>
          <div className="text-xl font-bold text-amber-400 font-mono mt-2">
            {formatTZS(totalRequiredProvision, language)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'sw' ? 'Hifadhi ya Kisheria ya Madeni Mabaya' : 'Statutory Bad Debt Reserve'}
          </p>
        </div>
      </div>

      {/* BOT Asset Quality Classification Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-white">
              {language === 'sw'
                ? 'Jedwali la Uainishaji wa Ubora wa Mali za Mikopo (BOT Tier 2)'
                : 'Bank of Tanzania Asset Quality & Provisioning Matrix'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pursuant to Section 28 of Bank of Tanzania Microfinance Regulations
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{language === 'sw' ? 'Daraja la Mkopo' : 'Classification Grade'}</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Siku za Ucheleweshaji' : 'Aging Range'}</th>
                <th className="py-3 px-4 text-center">{language === 'sw' ? '% Ya Akiba' : 'Req. Provision %'}</th>
                <th className="py-3 px-4 text-center">{language === 'sw' ? 'Idadi ya Mikopo' : 'Loan Count'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Salio Lililobaki' : 'Outstanding Principal'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Akiba Inayohitajika' : 'Required Loss Reserve'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {classificationRows.map((row) => (
                <tr key={row.grade} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${row.badge}`}>
                      {row.grade}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{row.dpd}</td>
                  <td className="py-3 px-4 text-center font-bold text-white">{row.provisionRate}</td>
                  <td className="py-3 px-4 text-center font-mono">{row.loanCount}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    {formatTZS(row.principal, language)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                    {formatTZS(row.provisionAmount, language)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 border-t border-slate-800 font-bold text-white text-xs">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-right uppercase text-[10px]">
                  {language === 'sw'
                    ? 'Jumla ya Mikopo na Akiba Inayohitajika:'
                    : 'Total Portfolio & Required Impairment:'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-white">
                  {formatTZS(par.grossLoanPortfolio, language)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-amber-400">
                  {formatTZS(totalRequiredProvision, language)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Branch Performance Comparative Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">
            {language === 'sw'
              ? 'Ulinganisho wa Utendaji wa Matawi (Kariakoo, Arusha, Mwanza)'
              : 'Branch Comparative Performance (Kariakoo, Arusha, Mwanza)'}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{t.branch}</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Mkoa' : 'Region'}</th>
                <th className="py-3 px-4 text-center">{language === 'sw' ? 'Wakopaji Hai' : 'Active Borrowers'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Jumla ya Mikopo' : 'Gross Portfolio'}</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Malimbikizo' : 'Arrears Balance'}</th>
                <th className="py-3 px-4 text-center">Branch PAR30</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {branches.map((b) => {
                const bLoans = loans.filter((l) => l.branchId === b.id && l.status !== 'CLOSED');
                const bMetrics = calculatePortfolioAtRisk(bLoans);

                return (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{b.name}</td>
                    <td className="py-3 px-4 text-slate-400">{b.region}</td>
                    <td className="py-3 px-4 text-center font-mono">{bLoans.length}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatTZS(bMetrics.grossLoanPortfolio, language)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400">
                      {formatTZS(bMetrics.totalPrincipalInArrears, language)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          bMetrics.par30Rate <= 5
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {bMetrics.par30Rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
