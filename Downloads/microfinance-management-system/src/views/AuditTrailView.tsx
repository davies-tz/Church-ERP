import React, { useState } from 'react';
import {
  Clock,
  Eye,
  FileCode,
  Filter,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { AuditLog } from '../types';
import { translations } from '../lib/i18n';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, language } = useMfi();
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">{t.auditTrail}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {language === 'sw'
            ? 'Kumbukumbu zisizobadilika za kiusalama zinazorekodi mtumiaji, anwani ya IP, na mabadiliko ya data (Kabla na Baada).'
            : 'Immutable event logs recording actor, IP address, action, and before/after mutation states.'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              language === 'sw'
                ? 'Tafuta kumbukumbu kwa mtumiaji, kitendo, au namba ya rekodi...'
                : 'Search audit trail by actor, action type, or entity ID...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold whitespace-nowrap">
          {filteredLogs.length} {language === 'sw' ? 'Matukio' : 'Audit Events'}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{language === 'sw' ? 'Muda' : 'Timestamp'}</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Mtumiaji & Wadhifa' : 'User & Role'}</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Kitendo Kilichofanyika' : 'Action Event'}</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Rekodi Iliyoathirika' : 'Entity & Record ID'}</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">{language === 'sw' ? 'Ukaguzi' : 'Inspection'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {language === 'sw' ? 'Hakuna kumbukumbu zinazofanana na utafutaji.' : 'No audit records matching search criteria.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{log.userName}</div>
                      <span className="text-[10px] text-amber-400">{log.userRole}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white font-medium block">{log.entityName}</span>
                      <span className="font-mono text-slate-500 text-[10px]">{log.entityId}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{log.ipAddress}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 inline-flex items-center space-x-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'sw' ? 'Kagua Hali' : 'Inspect State'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{selectedLog.action}</span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Audit Snapshot #{selectedLog.id}
                </h2>
                <p className="text-xs text-slate-400">
                  By {selectedLog.userName} ({selectedLog.userRole}) at {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] font-sans block mb-1 font-semibold">
                  {language === 'sw' ? 'Hali Kabla ya Mabadiliko:' : 'State Before Mutation:'}
                </span>
                <pre className="text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.beforeState ? JSON.stringify(selectedLog.beforeState, null, 2) : '(Null / Record Creation)'}
                </pre>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-emerald-400 text-[11px] font-sans block mb-1 font-semibold">
                  {language === 'sw' ? 'Hali Baada ya Mabadiliko:' : 'State After Mutation:'}
                </span>
                <pre className="text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedLog.afterState, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
