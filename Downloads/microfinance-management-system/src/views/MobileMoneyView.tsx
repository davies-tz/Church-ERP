import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { formatTZS, translations } from '../lib/i18n';

export const MobileMoneyView: React.FC = () => {
  const {
    loans,
    chartOfAccounts,
    providerTransactions,
    simulateMobileMoneyWebhook,
    language,
  } = useMfi();

  const { showToast } = useToast();
  const t = translations[language];

  const [provider, setProvider] = useState<'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA'>('MPESA');
  const [selectedLoanNumber, setSelectedLoanNumber] = useState(loans[0]?.loanAccountNumber || '');
  const [amount, setAmount] = useState<number>(100000);
  const [phoneNumber, setPhoneNumber] = useState('+255 754 123 456');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [simResult, setSimResult] = useState<{ success: boolean; message: string; receipt?: string } | null>(null);

  const mpesaFloat = chartOfAccounts.find((a) => a.code === '1020')?.balance || 0;

  const handleSimulatePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanNumber || amount <= 0) return;

    setIsSubmitting(true);
    try {
      const result = await simulateMobileMoneyWebhook(provider, selectedLoanNumber, amount, phoneNumber);
      setSimResult(result);
      if (result.success) {
        showToast(
          'success',
          language === 'sw' ? 'Malipo Yamepokelewa' : 'Mobile Payment Processed',
          language === 'sw'
            ? `Malipo ya ${formatTZS(amount, language)} kupitia ${provider} yamekamilika. Risiti: ${result.receipt}`
            : `Payment of ${formatTZS(amount, language)} via ${provider} ingested into Cloud SQL. Receipt: ${result.receipt}`
        );
      } else {
        showToast('error', 'Payment Ingestion Failed', result.message);
      }
    } catch (err: any) {
      showToast('error', 'Webhook Simulation Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">{t.mobileMoney}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {language === 'sw'
            ? 'Muunganiko wa moja kwa moja na M-Pesa, Airtel Money & Tigo Pesa na uhakiki wa sahihi ya HMAC-SHA256.'
            : 'Tanzania M-Pesa, Airtel Money & Tigo Pesa integration with cryptographic signature verification.'}
        </p>
      </div>

      {/* Float Balances & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-semibold">Vodacom M-Pesa Float (GL 1020)</span>
            <div className="text-xl font-bold text-white font-mono mt-1.5">{formatTZS(mpesaFloat, language)}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xs">
            VODA
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-semibold">
              {language === 'sw' ? 'Ulinzi wa Miunganisho (Security)' : 'Webhook Endpoint Security'}
            </span>
            <div className="text-xs font-bold text-emerald-400 mt-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>HMAC-SHA256 Active</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-semibold">
              {language === 'sw' ? 'Miamala ya C2B Iliyopokelewa' : 'Inbound C2B Webhooks Processed'}
            </span>
            <div className="text-xl font-bold text-white font-mono mt-1.5">
              {providerTransactions.length} {language === 'sw' ? 'Malipo' : 'Pay-ins'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Webhook Callback Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              {language === 'sw' ? 'Jaribu Malipo ya C2B Webhook' : 'Simulate Inbound C2B Payment Webhook'}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">POST /api/mobile-money/webhook</span>
        </div>

        <form onSubmit={handleSimulatePush} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Mtandao wa Simu' : 'Telecom Provider'}
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:border-emerald-500 focus:outline-none"
            >
              <option value="MPESA">Vodacom M-Pesa</option>
              <option value="AIRTEL_MONEY">Airtel Money</option>
              <option value="TIGO_PESA">Tigo Pesa</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Akaunti ya Mkopo / Mteja *' : 'Borrower / Loan Account *'}
            </label>
            <select
              value={selectedLoanNumber}
              onChange={(e) => setSelectedLoanNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
            >
              {loans
                .filter((l) => l.status !== 'CLOSED')
                .map((l) => (
                  <option key={l.id} value={l.loanAccountNumber}>
                    {l.loanAccountNumber} — {l.customerName}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Namba ya Simu ya Mteja (MSISDN)' : 'Customer MSISDN (Phone)'}
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Kiasi cha Malipo (TZS) *' : 'Payment Amount (TZS) *'}
            </label>
            <input
              required
              type="number"
              step="10000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg flex items-center space-x-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {language === 'sw'
                  ? 'Fanya Jaribio la Malipo ya Webhook'
                  : 'Simulate Webhook Callback & Settle Loan'}
              </span>
            </button>
          </div>
        </form>

        {/* Result alert */}
        {simResult && (
          <div
            className={`p-4 rounded-xl border text-xs animate-in fade-in ${
              simResult.success
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold">
              {simResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{simResult.success ? 'Payment Successfully Ingested' : 'Ingestion Error'}</span>
            </div>
            <p className="mt-1">{simResult.message}</p>
            {simResult.receipt && (
              <p className="font-mono text-white mt-1">
                Generated Receipt: <strong>{simResult.receipt}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Webhook Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 text-xs font-bold text-white flex justify-between">
          <span>{language === 'sw' ? 'Mtiririko wa Kumbukumbu za Webhook' : 'Inbound Provider Webhook Audit Stream'}</span>
          <span className="text-slate-400 font-mono">Immutable Log</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Provider</th>
                <th className="py-2.5 px-4">Provider Tx ID</th>
                <th className="py-2.5 px-4">Account Reference</th>
                <th className="py-2.5 px-4">Phone</th>
                <th className="py-2.5 px-4 text-right">{language === 'sw' ? 'Kiasi' : 'Amount'}</th>
                <th className="py-2.5 px-4 text-center">HMAC Signature</th>
                <th className="py-2.5 px-4">{t.status}</th>
                <th className="py-2.5 px-4">{language === 'sw' ? 'Muda' : 'Received At'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {providerTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    {language === 'sw'
                      ? 'Hakuna taarifa za webhook zilizopokelewa bado. Tumia fomu hapo juu kujaribu.'
                      : 'No webhook payloads received yet. Use simulator above to test.'}
                  </td>
                </tr>
              ) : (
                providerTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-white">{tx.provider}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{tx.providerTxId}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">{tx.accountReference}</td>
                    <td className="py-2.5 px-4 font-mono">{tx.phoneNumber}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                      {formatTZS(tx.amount, language)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        VALID
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-semibold">
                        {tx.processingStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {new Date(tx.receivedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
