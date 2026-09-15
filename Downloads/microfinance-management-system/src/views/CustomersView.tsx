import React, { useState } from 'react';
import {
  Check,
  CheckCircle,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { useToast } from '../context/ToastContext';
import { Customer, KycDocument } from '../types';
import { formatTZS, translations } from '../lib/i18n';

export const CustomersView: React.FC = () => {
  const {
    customers,
    branches,
    currentBranchId,
    createCustomer,
    verifyKycDocument,
    loans,
    savingsAccounts,
    language,
  } = useMfi();

  const { showToast } = useToast();
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Customer Form State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+255 7');
  const [nida, setNida] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('FEMALE');
  const [dob, setDob] = useState('1990-01-01');
  const [businessType, setBusinessType] = useState('');
  const [monthlyRevenue, setMonthlyRevenue] = useState(2500000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(1200000);
  const [branchId, setBranchId] = useState(branches[0]?.id || 'br-kariakoo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const matchesBranch = currentBranchId === 'ALL' || c.branchId === currentBranchId;
    const matchesSearch =
      c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phonePrimary.includes(searchTerm) ||
      (c.nationalIdNumber && c.nationalIdNumber.includes(searchTerm));
    return matchesBranch && matchesSearch;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) {
      showToast('warning', 'Validation', 'First name, last name, and phone number are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const initialDocs: KycDocument[] = [];
      if (nida) {
        initialDocs.push({
          id: `doc-${Date.now()}-1`,
          documentType: 'NIDA',
          documentNumber: nida,
          storageRef: `https://storage.googleapis.com/tusonge-kyc/${nida}.pdf`,
          verificationStatus: 'VERIFIED',
        });
      }

      const cust = await createCustomer({
        firstName,
        middleName,
        lastName,
        phonePrimary: phone,
        nationalIdNumber: nida,
        gender,
        dateOfBirth: dob,
        businessType: businessType || 'Biashara Ndogondogo',
        monthlyRevenue,
        monthlyExpenses,
        branchId,
        documents: initialDocs,
      });

      showToast(
        'success',
        language === 'sw' ? 'Mteja Amesajiliwa' : 'Customer Registered',
        language === 'sw'
          ? `${cust.firstName} ${cust.lastName} (${cust.customerNumber}) amehifadhiwa kwenye Cloud SQL.`
          : `${cust.firstName} ${cust.lastName} (${cust.customerNumber}) saved to Cloud SQL database.`
      );

      // Reset and close
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setNida('');
      setBusinessType('');
      setShowCreateModal(false);
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyKyc = (customerId: string, docId: string, status: 'VERIFIED' | 'REJECTED') => {
    verifyKycDocument(customerId, docId, status);
    showToast(
      status === 'VERIFIED' ? 'success' : 'warning',
      language === 'sw'
        ? status === 'VERIFIED'
          ? 'Hati ya KYC Imethibitishwa'
          : 'Hati ya KYC Imekataliwa'
        : status === 'VERIFIED'
        ? 'KYC Verified'
        : 'KYC Rejected',
      language === 'sw' ? 'Mabadiliko yamehifadhiwa kwenye kumbukumbu.' : 'Document verification updated.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t.customers}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'sw'
              ? 'Daftari la wateja, uthibitisho wa NIDA, na wasifu kamili wa mkopaji na akiba zake.'
              : 'Normalized customer directory, NIDA identity verification, and 360 financial profiles.'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-emerald-950/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newCustomer}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium px-2 hidden sm:block">
          {filteredCustomers.length} {language === 'sw' ? 'Wateja' : 'Records'}
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">{language === 'sw' ? 'Jina Kamili' : 'Full Name'}</th>
                <th className="py-3 px-4">{t.phoneNumber}</th>
                <th className="py-3 px-4">{t.nidaNumber}</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">{t.businessType}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {t.noRecordsFound}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const verifiedDoc = cust.documents?.find((d) => d.verificationStatus === 'VERIFIED');
                  const pendingDoc = cust.documents?.find(
                    (d) => d.verificationStatus === 'PENDING' || d.verificationStatus === 'SUBMITTED'
                  );

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCustomer(cust)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{cust.customerNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {cust.firstName} {cust.middleName} {cust.lastName}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {branches.find((b) => b.id === cust.branchId)?.name || 'Branch'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{cust.phonePrimary}</td>
                      <td className="py-3 px-4 font-mono">
                        {cust.nationalIdNumber || <span className="text-slate-500 italic">Not Provided</span>}
                      </td>
                      <td className="py-3 px-4">
                        {verifiedDoc ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />
                            <span>VERIFIED</span>
                          </span>
                        ) : pendingDoc ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>PENDING KYC</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                            <span>INCOMPLETE</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{cust.businessType || 'General Merchandise'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(cust);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 border border-slate-700"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>360 Profile</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Degree View Drawer */}
      {selectedCustomer && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-base">
                {selectedCustomer.firstName[0]}
                {selectedCustomer.lastName[0]}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {selectedCustomer.firstName} {selectedCustomer.middleName} {selectedCustomer.lastName}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span className="font-mono text-emerald-400 font-semibold">{selectedCustomer.customerNumber}</span>
                  <span>•</span>
                  <span>{selectedCustomer.phonePrimary}</span>
                  <span>•</span>
                  <span>{selectedCustomer.businessType}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KYC & Identification */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">KYC Compliance & NIDA</h3>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>NIDA National ID:</span>
                  <span className="text-white font-mono">{selectedCustomer.nationalIdNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gender / Jinsia:</span>
                  <span className="text-white">{selectedCustomer.gender}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Date of Birth:</span>
                  <span className="text-white">{selectedCustomer.dateOfBirth}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Revenue:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatTZS(selectedCustomer.monthlyRevenue, language)}
                  </span>
                </div>
              </div>

              {/* KYC Document Verification Controls */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 block">Uploaded Documents:</span>
                {selectedCustomer.documents?.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No KYC documents attached.</p>
                ) : (
                  selectedCustomer.documents?.map((doc) => (
                    <div key={doc.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-white block">{doc.documentType}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{doc.documentNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {doc.verificationStatus === 'VERIFIED' ? (
                          <span className="text-emerald-400 text-[10px] font-bold">Verified</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleVerifyKyc(selectedCustomer.id, doc.id, 'VERIFIED')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleVerifyKyc(selectedCustomer.id, doc.id, 'REJECTED')}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Loans */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Active Loans & Exposure</h3>
              {loans.filter((l) => l.customerId === selectedCustomer.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No loans issued to this borrower.</p>
              ) : (
                loans
                  .filter((l) => l.customerId === selectedCustomer.id)
                  .map((loan) => (
                    <div key={loan.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-emerald-400 font-bold">{loan.loanAccountNumber}</span>
                        <span className="text-white font-bold">{formatTZS(loan.totalOutstanding, language)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Status: {loan.status}</span>
                        <span>Arrears: {loan.daysInArrears} days</span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Savings & Compulsory Collateral */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Client Savings Accounts</h3>
              {savingsAccounts.filter((s) => s.customerId === selectedCustomer.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No savings ledger for this client.</p>
              ) : (
                savingsAccounts
                  .filter((s) => s.customerId === selectedCustomer.id)
                  .map((acc) => (
                    <div key={acc.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-purple-400 font-bold">{acc.accountNumber}</span>
                        <span className="text-white font-bold">{formatTZS(acc.balance, language)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Product: {acc.productType}</span>
                        <span>Locked: {formatTZS(acc.lockedAmount, language)}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">{t.newCustomer}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">First Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rehema"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Middle Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Juma"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Last Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Mushi"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">{t.phoneNumber} *</label>
                  <input
                    required
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">{t.nidaNumber}</label>
                  <input
                    type="text"
                    placeholder="19900101-12345-00001-22"
                    value={nida}
                    onChange={(e) => setNida(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Gender / Jinsia</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="FEMALE">Female / Mwanamke</option>
                    <option value="MALE">Male / Mwanaume</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.businessType}</label>
                <input
                  type="text"
                  placeholder="e.g. Duka la Vyakula Kariakoo, Ufugaji Kuku"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">{t.monthlyIncome}</label>
                  <input
                    type="number"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Living Expenses (TZS)</label>
                  <input
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
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
                  <span>{language === 'sw' ? 'Sajili Mteja' : 'Register Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
