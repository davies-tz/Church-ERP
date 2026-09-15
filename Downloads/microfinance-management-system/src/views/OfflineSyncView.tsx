import React, { useState } from 'react';
import {
  ArrowDownCircle,
  CheckCircle,
  Clock,
  HardDrive,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { formatTZS, translations } from '../lib/i18n';

export const OfflineSyncView: React.FC = () => {
  const {
    isOnline,
    setIsOnline,
    offlineQueue,
    syncOfflineQueue,
    addOfflineRecord,
    loans,
    currentUser,
    language,
  } = useMfi();

  const { showToast } = useToast();
  const t = translations[language];

  const [selectedLoanId, setSelectedLoanId] = useState(loans[0]?.id || '');
  const [amount, setAmount] = useState<number>(50000);
  const [offlineMethod, setOfflineMethod] = useState<'CASH' | 'MOBILE_MONEY'>('CASH');
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingCount = offlineQueue.filter((q) => q.syncStatus === 'PENDING').length;
  const syncedCount = offlineQueue.filter((q) => q.syncStatus === 'SYNCED').length;

  const handleQueueCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId || amount <= 0) return;

    const loan = loans.find((l) => l.id === selectedLoanId);
    if (!loan) return;

    const offlineReceipt = `OFFLINE-REC-${Date.now().toString().slice(-6)}`;

    addOfflineRecord({
      operationType: 'COLLECTION_PAYMENT',
      payload: {
        loanId: loan.id,
        loanAccountNumber: loan.loanAccountNumber,
        customerName: loan.customerName,
        amount,
        paymentMethod: offlineMethod,
        channelRef: offlineReceipt,
        officer: `${currentUser.firstName} ${currentUser.lastName}`,
      },
      clientTimestamp: new Date().toISOString(),
      deviceId: 'TECNO-CAMON-FIELD-DEVICE-04',
    });

    showToast(
      'info',
      language === 'sw' ? 'Malipo Yamehifadhiwa Kwenye Kifaa' : 'Queued Locally on Device',
      language === 'sw'
        ? `Risiti ya shambani ${offlineReceipt} kwa mteja ${loan.customerName} imehifadhiwa offline.`
        : `Field receipt ${offlineReceipt} for ${loan.customerName} queued in local offline database.`
    );
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      showToast(
        'success',
        language === 'sw' ? 'Usawazishaji Umekamilika' : 'Sync Completed',
        language === 'sw'
          ? 'Miamala yote ya shambani imesawazishwa kwenye Cloud SQL na Leja Kuu ya BOT.'
          : 'All offline collections successfully replayed and synced to Central Cloud SQL database.'
      );
    } catch (err: any) {
      showToast('error', 'Sync Error', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t.fieldCollection}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'sw'
              ? 'Kusanya marejesho vijijini bila intaneti; data inahifadhiwa kwenye simu na kusawazishwa mtandao ukipatikana.'
              : 'Collect repayments in remote rural villages without internet connectivity and replay batch queue when back online.'}
          </p>
        </div>

        <button
          onClick={() => {
            const nextState = !isOnline;
            setIsOnline(nextState);
            showToast(
              nextState ? 'info' : 'warning',
              nextState ? (language === 'sw' ? 'Mtandao Umerudi' : 'Online Mode Active') : (language === 'sw' ? 'Hali ya Shambani (Offline)' : 'Offline Field Mode Active'),
              nextState ? 'Connected to central Cloud SQL instance.' : 'Working with local cache and queue.'
            );
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg self-start sm:self-auto ${
            isOnline
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/30'
          }`}
        >
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{isOnline ? (language === 'sw' ? 'Mtandao Uko Hewani' : 'Online (Connected)') : (language === 'sw' ? 'Hali ya Shambani (Offline)' : 'Offline (Field Mode)')}</span>
        </button>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">
              {language === 'sw' ? 'Miamala Inayosubiri Kusawazishwa' : 'Pending Offline Queue'}
            </span>
            <div className="text-xl font-bold text-amber-400 font-mono mt-1">{pendingCount} {language === 'sw' ? 'Rekodi' : 'Records'}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">
              {language === 'sw' ? 'Zilizosawazishwa Kwenye Leja' : 'Synced to Central GL'}
            </span>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{syncedCount} {language === 'sw' ? 'Zimekamilika' : 'Replayed'}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">
              {language === 'sw' ? 'Kumbukumbu ya Kifaa cha Afisa' : 'Local SQLite / Dexie Cache'}
            </span>
            <div className="text-xs font-bold text-slate-200 mt-1">
              {language === 'sw' ? 'Tayari kwa Kazi ya Shambani' : 'Ready for Field Operations'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Field Collection Intake Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              {language === 'sw' ? 'Rekodi Malipo ya Shambani (Hali ya Nje ya Mtandao)' : 'Record Field Collection (Offline Mode Supported)'}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Device: Tecno Camon #04</span>
        </div>

        <form onSubmit={handleQueueCollection} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Chagua Mkopaji & Mkopo *' : 'Select Borrower & Loan *'}
            </label>
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
            >
              {loans
                .filter((l) => l.status !== 'CLOSED')
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.loanAccountNumber} — {l.customerName}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Kiasi Kilichokusanywa (TZS) *' : 'Amount Collected (TZS) *'}
            </label>
            <input
              required
              type="number"
              step="5000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              {language === 'sw' ? 'Njia ya Ukusanyaji' : 'Collection Method'}
            </label>
            <select
              value={offlineMethod}
              onChange={(e) => setOfflineMethod(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="CASH">Cash in Hand (Taslimu Shambani)</option>
              <option value="MOBILE_MONEY">Manual M-Pesa SMS Callback Code</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs border border-slate-700 transition-all shadow flex items-center space-x-2"
            >
              <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
              <span>{language === 'sw' ? 'Weka Kwenye Kumbukumbu ya Kifaa' : 'Queue into Local Device Store'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Offline Replay Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {language === 'sw' ? 'Orodha ya Miamala ya Shambani Kwenye Kifaa' : 'Local Device Offline Sync Queue'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'sw'
                ? 'Huweka upya miamala kwa mpangilio sahihi wa sheria za BOT kwenye Leja Kuu ya Cloud SQL.'
                : 'Replays collections sequentially through the waterfall payment allocation engine to Cloud SQL.'}
            </p>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={pendingCount === 0 || !isOnline || isSyncing}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              pendingCount > 0 && isOnline
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{t.syncNow} ({pendingCount})</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">{language === 'sw' ? 'Aina ya Muamala' : 'Operation'}</th>
                <th className="py-2.5 px-4">{language === 'sw' ? 'Akaunti & Mteja' : 'Target Loan & Customer'}</th>
                <th className="py-2.5 px-4 text-right">{t.amount}</th>
                <th className="py-2.5 px-4">Method & Ref</th>
                <th className="py-2.5 px-4">{language === 'sw' ? 'Muda wa Kifaa' : 'Device Timestamp'}</th>
                <th className="py-2.5 px-4 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {offlineQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {language === 'sw'
                      ? 'Hakuna miamala inayosubiri kwenye kifaa hiki.'
                      : 'Offline queue is empty. Use field collection form to queue offline payments.'}
                  </td>
                </tr>
              ) : (
                offlineQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-semibold text-white">{item.operationType}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-white">{item.payload.customerName}</div>
                      <span className="text-[10px] font-mono text-slate-400">{item.payload.loanAccountNumber}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatTZS(item.payload.amount, language)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-white block">{item.payload.paymentMethod}</span>
                      <span className="text-[10px] font-mono text-slate-400">{item.payload.channelRef}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(item.clientTimestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          item.syncStatus === 'SYNCED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.syncStatus === 'CONFLICT'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {item.syncStatus}
                      </span>
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
