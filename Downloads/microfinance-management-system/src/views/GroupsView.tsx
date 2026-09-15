import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  ShieldCheck,
  Users2,
  X,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { LendingGroup } from '../types';
import { formatTZS, translations } from '../lib/i18n';

export const GroupsView: React.FC = () => {
  const {
    groups,
    customers,
    loans,
    branches,
    currentBranchId,
    createLendingGroup,
    language,
  } = useMfi();

  const { showToast } = useToast();
  const t = translations[language];

  const [selectedGroup, setSelectedGroup] = useState<LendingGroup | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Group Form
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [dayOfWeek, setDayOfWeek] = useState(2); // Tuesday
  const [location, setLocation] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || 'br-kariakoo');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredGroups = groups.filter(
    (g) => currentBranchId === 'ALL' || g.branchId === currentBranchId
  );

  const getDayName = (day: number) => {
    const daysEn = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daysSw = ['', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili'];
    return language === 'sw' ? daysSw[day] || 'Jumanne' : daysEn[day] || 'Tuesday';
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('warning', 'Missing Name', 'Please enter the group name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const group = await createLendingGroup({
        name,
        meetingFrequency: frequency,
        meetingDayOfWeek: dayOfWeek,
        meetingLocation: location || 'Branch Hall',
        branchId,
        memberIds: selectedMemberIds,
      });

      showToast(
        'success',
        language === 'sw' ? 'Kikundi Kimeundwa' : 'Group Formed',
        language === 'sw'
          ? `Kikundi ${group.name} (${group.groupNumber}) kimesajiliwa kikamilifu.`
          : `Group ${group.name} (${group.groupNumber}) successfully registered in Cloud SQL.`
      );

      setName('');
      setLocation('');
      setSelectedMemberIds([]);
      setShowCreateModal(false);
    } catch (err: any) {
      showToast('error', 'Group Registration Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t.groups}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'sw'
              ? 'Vikundi vya mshikamano wa kijamii (Solidarity Peer Lending), ratiba ya mikutano ya vituo, na dhamana za pamoja.'
              : 'Peer-guaranteed microfinance groups, center meetings, and group collection sheets.'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-emerald-950/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'sw' ? 'Unda Kikundi Kipya' : 'Form New Lending Group'}</span>
        </button>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => {
          const members = customers.filter((c) => group.memberIds?.includes(c.id));
          const groupLoans = loans.filter((l) => l.groupId === group.id && l.status === 'ACTIVE');
          const totalOutstanding = groupLoans.reduce((sum, l) => sum + l.totalOutstanding, 0);
          const hasArrears = groupLoans.some((l) => l.daysInArrears > 0);

          return (
            <div
              key={group.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    {group.groupNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      hasArrears
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {hasArrears
                      ? language === 'sw'
                        ? 'Kina Malimbikizo'
                        : 'Delinquency Flag'
                      : language === 'sw'
                      ? 'Kiko Vizuri'
                      : 'Solidarity Good'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-3">{group.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {group.meetingFrequency} on {getDayName(group.meetingDayOfWeek)}s
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{group.meetingLocation}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{members.length} {language === 'sw' ? 'Wanachama Waliosajiliwa' : 'Registered Members'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">{language === 'sw' ? 'Salio la Mkopo' : 'Active Portfolio'}</span>
                    <p className="font-bold text-white font-mono mt-0.5">
                      {formatTZS(totalOutstanding, language)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">{language === 'sw' ? 'Mikopo Hai' : 'Active Loans'}</span>
                    <p className="font-bold text-emerald-400 mt-0.5">
                      {groupLoans.length} {language === 'sw' ? 'Mikopo' : 'Loans'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedGroup(group)}
                className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                {language === 'sw' ? 'Tazama Orodha ya Wanachama' : 'View Group Roster & Attendance'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Group Detail & Member Roster Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{selectedGroup.groupNumber}</span>
                <h2 className="text-xl font-bold text-white">{selectedGroup.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Meetings: Every {selectedGroup.meetingFrequency.toLowerCase()} at {selectedGroup.meetingLocation}
                </p>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Members List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Users2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {language === 'sw' ? 'Wanachama wa Kikundi & Dhamana ya Pamoja' : 'Solidarity Members & Peer Guarantees'}
                </span>
              </h3>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                {customers
                  .filter((c) => selectedGroup.memberIds?.includes(c.id))
                  .map((m) => {
                    const mLoans = loans.filter((l) => l.customerId === m.id && l.status === 'ACTIVE');
                    return (
                      <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-white">
                            {m.firstName} {m.middleName} {m.lastName}
                          </span>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {m.phonePrimary} • {m.customerNumber}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-mono font-bold">
                            {mLoans.length > 0 ? `${formatTZS(mLoans[0].totalOutstanding, language)} outstanding` : 'No active loan'}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {language === 'sw' ? 'Dhamana ya wote inafanya kazi' : 'Cross-guarantee active'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Peer Solidarity Warning Invariant */}
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 text-xs text-amber-300/90 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                <span>{language === 'sw' ? 'Kanuni ya Dhamana ya Pamoja (Solidarity Lending)' : 'ASA / BRAC Cross-Guarantorship Principle'}</span>
              </div>
              <p>
                {language === 'sw'
                  ? 'Mwanachama yeyote akishindwa kurejesha, wanachama wengine huwajibika kwa pamoja. Hakuna mikopo mipya inayotolewa kituo kizima hadi malimbikizo yawe yamelipwa.'
                  : 'In the event of a member delinquency, the solidarity group is jointly liable. Group loan renewals are halted until all overdue installments in the center are cleared or restructured.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                {language === 'sw' ? 'Unda Kikundi Kipya cha Mshikamano' : 'Form New Solidarity Group'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  {language === 'sw' ? 'Jina la Kikundi *' : 'Group Name *'}
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Upendo Women Solidarity Center"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {language === 'sw' ? 'Mzunguko wa Mikutano' : 'Meeting Frequency'}
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="WEEKLY">Weekly / Kila Wiki</option>
                    <option value="BIWEEKLY">Biweekly / Wiki Mbili</option>
                    <option value="MONTHLY">Monthly / Kila Mwezi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    {language === 'sw' ? 'Siku ya Mkutano' : 'Meeting Day'}
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value={1}>{language === 'sw' ? 'Jumatatu' : 'Monday'}</option>
                    <option value={2}>{language === 'sw' ? 'Jumanne' : 'Tuesday'}</option>
                    <option value={3}>{language === 'sw' ? 'Jumatano' : 'Wednesday'}</option>
                    <option value={4}>{language === 'sw' ? 'Alhamisi' : 'Thursday'}</option>
                    <option value={5}>{language === 'sw' ? 'Ijumaa' : 'Friday'}</option>
                    <option value={6}>{language === 'sw' ? 'Jumamosi' : 'Saturday'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {language === 'sw' ? 'Mahali pa Mkutano' : 'Meeting Location'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Community Center, Msimbazi St"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.branch}</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Members selection */}
              <div>
                <label className="block text-slate-400 mb-1">
                  {language === 'sw' ? 'Chagua Wanachama wa Awali' : 'Select Initial Members'}
                </label>
                <div className="max-h-32 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl p-2 space-y-1">
                  {customers.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer py-1 px-1.5 rounded hover:bg-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMemberIds((prev) => [...prev, c.id]);
                          } else {
                            setSelectedMemberIds((prev) => prev.filter((id) => id !== c.id));
                          }
                        }}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span className="truncate">
                        {c.firstName} {c.lastName} ({c.customerNumber})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow flex items-center space-x-2"
                >
                  {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{language === 'sw' ? 'Sajili Kikundi' : 'Register Group'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
