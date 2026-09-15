/**
 * Core MFI Application State & Action Dispatcher
 * Controls authentication context, Cloud SQL PostgreSQL persistence,
 * bilingual i18n, offline-first queue, and double-entry transaction dispatching.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AuditLog,
  Branch,
  ChartOfAccount,
  Customer,
  JournalEntry,
  LendingGroup,
  Loan,
  LoanApplication,
  LoanProduct,
  OfflineSyncRecord,
  Payment,
  ProviderWebhookTransaction,
  SavingsAccount,
  SavingsTransaction,
  User,
} from '../types';
import {
  INITIAL_APPLICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_BRANCHES,
  INITIAL_CHART_OF_ACCOUNTS,
  INITIAL_CUSTOMERS,
  INITIAL_GROUPS,
  INITIAL_JOURNALS,
  INITIAL_LOANS,
  INITIAL_PAYMENTS,
  INITIAL_PRODUCTS,
  INITIAL_SAVINGS,
  INITIAL_USERS,
} from '../services/mockDb';
import { Language } from '../lib/i18n';
import { allocatePaymentToLoan } from '../engines/paymentEngine';
import { createDisbursementJournal, createRepaymentJournal } from '../engines/accountingEngine';
import { generateRepaymentSchedule } from '../engines/scheduleEngine';
import { roundCurrency } from '../engines/interestEngine';

export interface SummaryMetrics {
  activeBorrowers: number;
  totalCustomers: number;
  grossPortfolio: number;
  totalDisbursed: number;
  totalSavings: number;
  par30Amount: number;
  par30Ratio: number;
  par90Amount: number;
  par90Ratio: number;
  liquidity: {
    cashInVault: number;
    mpesaFloat: number;
    airtelFloat: number;
    tigoFloat: number;
    crdbBank: number;
    totalLiquid: number;
  };
  recentRepayments: any[];
}

interface MfiContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  authToken: string | null;
  isAuthLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; redirectTab?: string }>;
  logout: () => Promise<void>;
  users: User[];
  currentBranchId: string;
  setCurrentBranchId: (branchId: string) => void;
  branches: Branch[];
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  offlineQueue: OfflineSyncRecord[];
  language: Language;
  setLanguage: (lang: Language) => void;
  summaryMetrics: SummaryMetrics | null;
  refreshSummary: () => Promise<void>;

  // Data Collections
  customers: Customer[];
  groups: LendingGroup[];
  loanProducts: LoanProduct[];
  applications: LoanApplication[];
  loans: Loan[];
  payments: Payment[];
  savingsAccounts: SavingsAccount[];
  savingsTransactions: SavingsTransaction[];
  chartOfAccounts: ChartOfAccount[];
  journals: JournalEntry[];
  auditLogs: AuditLog[];
  providerTransactions: ProviderWebhookTransaction[];

  // Core Actions
  createCustomer: (customerData: Partial<Customer>) => Promise<Customer>;
  verifyKycDocument: (customerId: string, docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => void;
  createLendingGroup: (groupData: Partial<LendingGroup>) => Promise<LendingGroup>;
  createLoanApplication: (appData: Partial<LoanApplication>) => Promise<LoanApplication>;
  assessLoanApplication: (appId: string, assessmentData: any) => Promise<void>;
  approveLoanApplication: (appId: string, level: 'BRANCH_MANAGER' | 'REGIONAL_MANAGER' | 'HEAD_OFFICE', decision: 'APPROVED' | 'REJECTED', comments: string) => Promise<void>;
  disburseLoan: (appId: string, paymentMethod: any) => Promise<Loan>;
  processRepayment: (loanId: string, amount: number, method: any, channelRef: string) => Promise<Payment>;
  reverseExistingPayment: (paymentId: string, reason: string) => Promise<void>;
  processSavingsDeposit: (accountId: string, amount: number, method: any, reference: string) => Promise<void>;
  processSavingsWithdrawal: (accountId: string, amount: number, method: any, reference: string) => Promise<void>;
  postManualJournalEntry: (narration: string, lines: Array<{ accountId: string; entryType: 'DEBIT' | 'CREDIT'; amount: number }>) => Promise<JournalEntry>;
  simulateMobileMoneyWebhook: (provider: 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA', loanNumber: string, amount: number, phone: string) => Promise<{ success: boolean; message: string; receipt?: string }>;
  syncOfflineQueue: () => Promise<void>;
  addOfflineRecord: (record: Omit<OfflineSyncRecord, 'id' | 'syncStatus'>) => void;
  resetToSeedData: () => Promise<void>;
}

const MfiContext = createContext<MfiContextType | undefined>(undefined);

export const MfiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [users] = useState<User[]>(INITIAL_USERS);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('imara_auth_token');
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('imara_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Safe operational fallback
  const activeUser: User = currentUser || INITIAL_USERS[0];

  const [currentBranchId, setCurrentBranchId] = useState<string>('ALL');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncRecord[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null);

  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('mfi_language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mfi_language', lang);
  };

  // Verify active JWT token on initial load
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('imara_auth_token');
      if (!storedToken) {
        setIsAuthLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          localStorage.setItem('imara_user', JSON.stringify(data.user));
          if (data.user.preferredLanguage) {
            setLanguage(data.user.preferredLanguage as Language);
          }
        } else {
          localStorage.removeItem('imara_auth_token');
          localStorage.removeItem('imara_user');
          setCurrentUser(null);
          setAuthToken(null);
        }
      } catch {
        // keep local state if network temporarily unreachable
      } finally {
        setIsAuthLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = async (identifier: string, password: string, rememberMe: boolean = false) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }
      setAuthToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('imara_auth_token', data.token);
      localStorage.setItem('imara_user', JSON.stringify(data.user));
      if (data.user.preferredLanguage) {
        setLanguage(data.user.preferredLanguage as Language);
      }
      return { success: true, redirectTab: data.redirectTab };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the authentication server. Please check your network connection.',
      };
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            userName: `${currentUser.firstName} ${currentUser.lastName}`,
            role: currentUser.role,
          }),
        });
      }
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      setAuthToken(null);
      setCurrentUser(null);
      localStorage.removeItem('imara_auth_token');
      localStorage.removeItem('imara_user');
    }
  };

  // Builds request headers with a Bearer token, reading it fresh from
  // localStorage each call (not the authToken state) so a long-lived closure
  // from an earlier render never sends a stale/missing token.
  const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const token = localStorage.getItem('imara_auth_token');
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
  };

  // Domain states with fallback
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('mfi_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [groups, setGroups] = useState<LendingGroup[]>(() => {
    const saved = localStorage.getItem('mfi_groups');
    return saved ? JSON.parse(saved) : INITIAL_GROUPS;
  });

  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>(INITIAL_PRODUCTS);

  const [applications, setApplications] = useState<LoanApplication[]>(() => {
    const saved = localStorage.getItem('mfi_applications');
    return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('mfi_loans');
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('mfi_payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>(() => {
    const saved = localStorage.getItem('mfi_savings');
    return saved ? JSON.parse(saved) : INITIAL_SAVINGS;
  });

  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);

  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(() => {
    const saved = localStorage.getItem('mfi_coa');
    return saved ? JSON.parse(saved) : INITIAL_CHART_OF_ACCOUNTS;
  });

  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('mfi_journals');
    return saved ? JSON.parse(saved) : INITIAL_JOURNALS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('mfi_audit');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [providerTransactions, setProviderTransactions] = useState<ProviderWebhookTransaction[]>([]);

  // Fetch Summary from Cloud SQL
  const refreshSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/summary', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSummaryMetrics(data);
      }
    } catch {
      // offline fallback
    }
  }, []);

  // Initial Load from Cloud SQL Backend
  const loadCloudSqlData = useCallback(async () => {
    try {
      const [
        summaryRes,
        branchesRes,
        customersRes,
        groupsRes,
        productsRes,
        appsRes,
        loansRes,
        repaymentsRes,
        savingsRes,
        coaRes,
        journalsRes,
        auditRes,
      ] = await Promise.all([
        fetch('/api/summary', { headers: authHeaders() }),
        fetch('/api/branches', { headers: authHeaders() }),
        fetch('/api/customers', { headers: authHeaders() }),
        fetch('/api/groups', { headers: authHeaders() }),
        fetch('/api/products', { headers: authHeaders() }),
        fetch('/api/applications', { headers: authHeaders() }),
        fetch('/api/loans', { headers: authHeaders() }),
        fetch('/api/repayments', { headers: authHeaders() }),
        fetch('/api/savings', { headers: authHeaders() }),
        fetch('/api/accounting/coa', { headers: authHeaders() }),
        fetch('/api/accounting/journal', { headers: authHeaders() }),
        fetch('/api/audit-logs', { headers: authHeaders() }),
      ]);

      if (summaryRes.ok) setSummaryMetrics(await summaryRes.json());
      if (branchesRes.ok) {
        const data = await branchesRes.json();
        if (data.length > 0) setBranches(data);
      }
      if (customersRes.ok) {
        const data = await customersRes.json();
        if (data.length > 0) {
          const mappedCustomers: Customer[] = data.map((c: any) => ({
            id: c.id,
            customerNumber: c.customerNumber,
            branchId: c.branchId,
            firstName: c.firstName,
            middleName: '',
            lastName: c.lastName,
            dateOfBirth: c.dateOfBirth,
            gender: c.gender,
            phonePrimary: c.phoneNumber,
            email: c.email,
            nationalIdNumber: c.nationalIdNida,
            status: 'ACTIVE',
            businessType: c.businessType,
            monthlyRevenue: c.monthlyIncome,
            monthlyExpenses: roundCurrency(c.monthlyIncome * 0.4),
            groupId: undefined,
            documents: c.documentUrl
              ? [
                  {
                    id: `doc-${c.id}`,
                    documentType: 'NIDA_ID_CARD',
                    fileUrl: c.documentUrl,
                    documentNumber: c.nationalIdNida,
                    verificationStatus: 'VERIFIED',
                    uploadedAt: c.createdAt,
                  },
                ]
              : [],
            createdAt: c.createdAt,
          }));
          setCustomers(mappedCustomers);
        }
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        if (data.length > 0) {
          const mappedGroups: LendingGroup[] = data.map((g: any) => ({
            id: g.id,
            groupNumber: g.groupNumber,
            branchId: g.branchId,
            name: g.name,
            leaderCustomerId: '',
            loanOfficerId: g.officerId || 'usr-co-1',
            meetingFrequency: g.meetingFrequency,
            meetingDayOfWeek: 2,
            meetingLocation: g.meetingLocation,
            status: g.isActive ? 'ACTIVE' : 'DISSOLVED',
            memberIds: [],
            createdAt: g.createdAt,
          }));
          setGroups(mappedGroups);
        }
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        if (data.length > 0) {
          const mappedProds: LoanProduct[] = data.map((p: any) => ({
            id: p.id,
            code: p.code,
            name: p.nameEn,
            interestMethod: p.interestMethod,
            annualNominalRate: p.annualInterestRate,
            minPrincipal: p.minAmount,
            maxPrincipal: p.maxAmount,
            minTermInstallments: p.minTenureMonths,
            maxTermInstallments: p.maxTenureMonths,
            repaymentFrequency: p.repaymentFrequency,
            gracePeriodType: 'NONE',
            gracePeriodInstallments: p.gracePeriodDays ? Math.ceil(p.gracePeriodDays / 30) : 0,
            processingFeePercent: p.originationFeeRate * 100,
            compulsorySavingsPercent: p.compulsorySavingsRate * 100,
            isActive: p.isActive,
          }));
          setLoanProducts(mappedProds);
        }
      }
      if (appsRes.ok) {
        const data = await appsRes.json();
        if (data.length > 0) {
          const mappedApps: LoanApplication[] = data.map((a: any) => ({
            id: a.id,
            applicationNumber: a.applicationNumber,
            branchId: a.branchId || 'br-kariakoo',
            customerId: a.customerId,
            customerName: 'Customer',
            groupId: a.groupId || undefined,
            productId: a.productId,
            productName: 'Loan Facility',
            appliedPrincipal: a.requestedAmount,
            approvedPrincipal: a.approvedAmount || undefined,
            termInstallments: a.tenureMonths,
            purpose: a.purpose,
            status: a.status === 'PENDING_REVIEW' ? 'SUBMITTED' : a.status,
            // The maker (submitter) - used to block self-approval in the UI.
            loanOfficerId: a.submittedBy || 'usr-co-1',
            approvals: [],
            createdAt: a.createdAt,
            updatedAt: a.createdAt,
          }));
          setApplications(mappedApps);
        }
      }
      if (loansRes.ok) {
        const data = await loansRes.json();
        if (data.length > 0) {
          const mappedLoans: Loan[] = data.map((l: any) => ({
            id: l.id,
            loanAccountNumber: l.loanAccountNumber,
            applicationId: l.applicationId,
            customerId: l.customerId,
            customerName: 'Borrower',
            customerPhone: '+255 700 000 000',
            branchId: l.branchId,
            productId: l.productId,
            productName: 'Loan Facility',
            groupId: l.groupId,
            disbursedPrincipal: l.principalAmount,
            outstandingPrincipal: l.outstandingPrincipal,
            outstandingInterest: l.accruedInterest || 0,
            outstandingFees: l.unpaidFees || 0,
            outstandingPenalties: l.unpaidPenalties || 0,
            totalOutstanding: l.outstandingPrincipal + (l.accruedInterest || 0) + (l.unpaidFees || 0) + (l.unpaidPenalties || 0),
            daysInArrears: l.daysInArrears || 0,
            status: l.status === 'DELINQUENT' ? 'IN_ARREARS' : l.status,
            disbursedAt: l.disbursementDate,
            disbursedBy: 'Branch Manager',
            maturityDate: l.maturityDate,
            installments: [],
          }));
          setLoans(mappedLoans);
        }
      }
      if (savingsRes.ok) {
        const data = await savingsRes.json();
        if (data.length > 0) {
          const mappedSavings: SavingsAccount[] = data.map((s: any) => ({
            id: s.id,
            accountNumber: s.accountNumber,
            customerId: s.customerId,
            customerName: 'Client Member',
            branchId: 'br-kariakoo',
            productType: s.productType,
            balance: s.balance,
            lockedAmount: s.lockedAmount,
            status: s.status,
            openedAt: s.createdAt,
          }));
          setSavingsAccounts(mappedSavings);
        }
      }
      if (coaRes.ok) {
        const data = await coaRes.json();
        if (data.length > 0) {
          const mappedCoa: ChartOfAccount[] = data.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            type: c.type,
            normalBalance: c.normalBalance,
            balance: c.balance,
            description: c.description || '',
          }));
          setChartOfAccounts(mappedCoa);
        }
      }
      if (journalsRes.ok) {
        const data = await journalsRes.json();
        if (data.length > 0) {
          const mappedJournals: JournalEntry[] = data.map((j: any) => ({
            id: j.id,
            entryNumber: j.entryNumber,
            branchId: 'br-kariakoo',
            transactionDate: j.transactionDate,
            narration: j.narration,
            referenceType: j.referenceType,
            referenceId: j.referenceId || '',
            postedBy: j.postedBy,
            lines: (j.lines || []).map((l: any) => ({
              id: l.id,
              accountId: l.accountCode,
              accountCode: l.accountCode,
              accountName: l.accountName,
              entryType: l.entryType,
              amount: l.amount,
            })),
            totalDebit: j.totalDebit,
            totalCredit: j.totalCredit,
            createdAt: j.createdAt,
          }));
          setJournals(mappedJournals);
        }
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        if (data.length > 0) {
          const mappedLogs: AuditLog[] = data.map((a: any) => ({
            id: a.id,
            userId: a.userId,
            userName: a.userName,
            userRole: a.userRole,
            action: a.action,
            entityName: a.entityName,
            entityId: a.entityId,
            beforeState: null,
            afterState: null,
            ipAddress: a.ipAddress,
            timestamp: a.timestamp,
          }));
          setAuditLogs(mappedLogs);
        }
      }
    } catch (err) {
      console.warn('Could not sync from Cloud SQL API (falling back to offline store):', err);
    }
  }, []);

  useEffect(() => {
    loadCloudSqlData();
  }, [loadCloudSqlData]);

  // Sync to local storage for offline resilience
  useEffect(() => {
    try {
      localStorage.setItem('mfi_customers', JSON.stringify(customers));
      localStorage.setItem('mfi_groups', JSON.stringify(groups));
      localStorage.setItem('mfi_applications', JSON.stringify(applications));
      localStorage.setItem('mfi_loans', JSON.stringify(loans));
      localStorage.setItem('mfi_payments', JSON.stringify(payments));
      localStorage.setItem('mfi_savings', JSON.stringify(savingsAccounts));
      localStorage.setItem('mfi_coa', JSON.stringify(chartOfAccounts));
      localStorage.setItem('mfi_journals', JSON.stringify(journals));
      localStorage.setItem('mfi_audit', JSON.stringify(auditLogs));
    } catch {
      // ignore
    }
  }, [customers, groups, applications, loans, payments, savingsAccounts, chartOfAccounts, journals, auditLogs]);

  // Actions
  const createCustomer = async (customerData: Partial<Customer>): Promise<Customer> => {
    const id = `cust-${Date.now()}`;
    const customerNumber = `CUST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCust: Customer = {
      id,
      customerNumber,
      branchId: customerData.branchId || activeUser.branchId,
      firstName: customerData.firstName || '',
      middleName: customerData.middleName || '',
      lastName: customerData.lastName || '',
      dateOfBirth: customerData.dateOfBirth || '1990-01-01',
      gender: customerData.gender || 'FEMALE',
      phonePrimary: customerData.phonePrimary || '+255 700 000 000',
      email: customerData.email,
      nationalIdNumber: customerData.nationalIdNumber,
      status: 'ACTIVE',
      businessType: customerData.businessType || 'General Merchandise',
      monthlyRevenue: customerData.monthlyRevenue || 1000000,
      monthlyExpenses: customerData.monthlyExpenses || 500000,
      groupId: customerData.groupId,
      documents: customerData.documents || [],
      createdAt: new Date().toISOString(),
    };

    // Update local state immediately
    setCustomers((prev) => [newCust, ...prev]);

    // Save to Cloud SQL PostgreSQL if online
    if (isOnline) {
      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            firstName: newCust.firstName,
            lastName: newCust.lastName,
            nationalIdNida: newCust.nationalIdNumber || `NIDA-${Date.now()}`,
            phoneNumber: newCust.phonePrimary,
            email: newCust.email,
            dateOfBirth: newCust.dateOfBirth,
            gender: newCust.gender,
            residentialAddress: 'Tanzania Residential Area',
            businessType: newCust.businessType,
            monthlyIncome: newCust.monthlyRevenue,
            branchId: newCust.branchId,
            userId: activeUser.id,
            userName: `${activeUser.firstName} ${activeUser.lastName}`,
          }),
        });
        refreshSummary();
      } catch {
        addOfflineRecord({
          operationType: 'CUSTOMER_REGISTRATION',
          payload: newCust,
          clientTimestamp: new Date().toISOString(),
        });
      }
    } else {
      addOfflineRecord({
        operationType: 'CUSTOMER_REGISTRATION',
        payload: newCust,
        clientTimestamp: new Date().toISOString(),
      });
    }

    return newCust;
  };

  const verifyKycDocument = (customerId: string, docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const updatedDocs = c.documents.map((d) => {
          if (d.id !== docId) return d;
          return {
            ...d,
            verificationStatus: status,
            verifiedBy: `${activeUser.firstName} ${activeUser.lastName}`,
            verifiedAt: new Date().toISOString(),
            rejectionReason: reason,
          };
        });
        return {
          ...c,
          documents: updatedDocs,
          status: updatedDocs.some((d) => d.verificationStatus === 'VERIFIED') ? 'ACTIVE' : c.status,
        };
      })
    );
  };

  const createLendingGroup = async (groupData: Partial<LendingGroup>): Promise<LendingGroup> => {
    const newGroup: LendingGroup = {
      id: `grp-${Date.now()}`,
      groupNumber: `GRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      branchId: groupData.branchId || activeUser.branchId,
      name: groupData.name || 'New Solidarity Group',
      leaderCustomerId: groupData.leaderCustomerId || '',
      loanOfficerId: groupData.loanOfficerId || activeUser.id,
      meetingFrequency: groupData.meetingFrequency || 'WEEKLY',
      meetingDayOfWeek: groupData.meetingDayOfWeek || 2,
      meetingLocation: groupData.meetingLocation || 'Branch Hall',
      status: 'ACTIVE',
      memberIds: groupData.memberIds || [],
      createdAt: new Date().toISOString(),
    };

    setGroups((prev) => [newGroup, ...prev]);

    if (isOnline) {
      try {
        await fetch('/api/groups', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            name: newGroup.name,
            meetingDay: 'Tuesday',
            meetingFrequency: newGroup.meetingFrequency,
            meetingLocation: newGroup.meetingLocation,
            branchId: newGroup.branchId,
            officerId: activeUser.id,
          }),
        });
      } catch {
        // queued
      }
    }
    return newGroup;
  };

  const createLoanApplication = async (appData: Partial<LoanApplication>): Promise<LoanApplication> => {
    const cust = customers.find((c) => c.id === appData.customerId);
    const prod = loanProducts.find((p) => p.id === appData.productId);

    const newApp: LoanApplication = {
      id: `app-${Date.now()}`,
      applicationNumber: `APP-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      branchId: appData.branchId || activeUser.branchId,
      customerId: appData.customerId || '',
      customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Customer',
      groupId: appData.groupId || cust?.groupId,
      productId: appData.productId || loanProducts[0]?.id,
      productName: prod ? prod.name : 'Standard Micro Loan',
      appliedPrincipal: appData.appliedPrincipal || 1000000,
      termInstallments: appData.termInstallments || 6,
      purpose: appData.purpose || 'Working capital investment',
      status: 'SUBMITTED',
      loanOfficerId: activeUser.id,
      approvals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) => [newApp, ...prev]);

    if (isOnline) {
      try {
        await fetch('/api/applications', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            customerId: newApp.customerId,
            productId: newApp.productId,
            groupId: newApp.groupId,
            requestedAmount: newApp.appliedPrincipal,
            tenureMonths: newApp.termInstallments,
            purpose: newApp.purpose,
            userId: activeUser.id,
            userName: `${activeUser.firstName} ${activeUser.lastName}`,
          }),
        });
      } catch {
        // offline
      }
    }

    return newApp;
  };

  const assessLoanApplication = async (appId: string, assessmentData: any) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        return {
          ...app,
          status: 'ASSESSED' as const,
          assessment: {
            id: `ass-${Date.now()}`,
            assessorId: activeUser.id,
            assessorName: `${activeUser.firstName} ${activeUser.lastName}`,
            assessedAt: new Date().toISOString(),
            ...assessmentData,
          },
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const approveLoanApplication = async (
    appId: string,
    level: 'BRANCH_MANAGER' | 'REGIONAL_MANAGER' | 'HEAD_OFFICE',
    decision: 'APPROVED' | 'REJECTED',
    comments: string
  ) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) throw new Error('Application not found');

    // The server enforces maker-checker (a submitter cannot review their own
    // application) and the branch approval tier limit - both can reject this
    // call, so we must wait for its response before updating local state.
    // Applying the change optimistically first would show "Approved" in the
    // UI even when the backend refused it.
    if (isOnline) {
      const res = await fetch(`/api/applications/${appId}/review`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
          approvedAmount: app.appliedPrincipal,
          rejectionReason: comments,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to review application');
      }
    }

    setApplications((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        const newApproval = {
          id: `appr-${Date.now()}`,
          approverId: activeUser.id,
          approverName: `${activeUser.firstName} ${activeUser.lastName}`,
          level,
          decision,
          approvedAmount: a.appliedPrincipal,
          comments,
          approvedAt: new Date().toISOString(),
        };
        const nextStatus = decision === 'APPROVED' ? 'READY_FOR_DISBURSEMENT' : 'REJECTED';
        return {
          ...a,
          status: nextStatus as LoanApplication['status'],
          approvedPrincipal: decision === 'APPROVED' ? a.appliedPrincipal : undefined,
          approvals: [...a.approvals, newApproval],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const disburseLoan = async (appId: string, paymentMethod: any): Promise<Loan> => {
    const app = applications.find((a) => a.id === appId);
    if (!app) throw new Error('Application not found');
    const prod = loanProducts.find((p) => p.id === app.productId) || loanProducts[0];
    const principal = app.approvedPrincipal || app.appliedPrincipal;
    const processingFee = roundCurrency(principal * (prod.processingFeePercent / 100));

    const installments = generateRepaymentSchedule({
      loanId: `ln-${Date.now()}`,
      disbursedPrincipal: principal,
      annualNominalRate: prod.annualNominalRate,
      interestMethod: prod.interestMethod,
      repaymentFrequency: prod.repaymentFrequency,
      termInstallments: app.termInstallments,
      startDate: new Date().toISOString().split('T')[0],
      gracePeriodType: prod.gracePeriodType,
      gracePeriodInstallments: prod.gracePeriodInstallments,
      processingFee,
    });

    const totalInterest = installments.reduce((acc, i) => acc + i.interestDue, 0);
    const loanAccountNumber = `LN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newLoan: Loan = {
      id: `ln-${Date.now()}`,
      loanAccountNumber,
      applicationId: app.id,
      customerId: app.customerId,
      customerName: app.customerName,
      customerPhone: '+255 712 000 111',
      branchId: app.branchId,
      productId: prod.id,
      productName: prod.name,
      groupId: app.groupId,
      disbursedPrincipal: principal,
      outstandingPrincipal: principal,
      outstandingInterest: totalInterest,
      outstandingFees: 0,
      outstandingPenalties: 0,
      totalOutstanding: principal + totalInterest,
      daysInArrears: 0,
      status: 'ACTIVE',
      disbursedAt: new Date().toISOString(),
      disbursedBy: `${activeUser.firstName} ${activeUser.lastName}`,
      maturityDate: installments[installments.length - 1]?.dueDate || new Date().toISOString().split('T')[0],
      installments,
    };

    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: 'DISBURSED' as const } : a))
    );

    const journal = createDisbursementJournal(
      app.branchId,
      loanAccountNumber,
      principal,
      processingFee,
      paymentMethod,
      `${activeUser.firstName} ${activeUser.lastName}`,
      chartOfAccounts
    );

    setLoans((prev) => [newLoan, ...prev]);
    setJournals((prev) => [journal, ...prev]);

    // Save to Cloud SQL PostgreSQL
    if (isOnline) {
      try {
        await fetch('/api/loans/disburse', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            applicationId: app.id,
            disbursementDate: new Date().toISOString().split('T')[0],
            channel: paymentMethod === 'CASH' ? 'CASH' : 'MPESA',
            officerId: activeUser.id,
          }),
        });
        refreshSummary();
      } catch {
        // offline
      }
    }

    return newLoan;
  };

  const processRepayment = async (loanId: string, amount: number, method: any, channelRef: string): Promise<Payment> => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) throw new Error('Loan not found');

    const result = allocatePaymentToLoan(
      loan,
      amount,
      method,
      channelRef,
      `${activeUser.firstName} ${activeUser.lastName}`,
      `idemp-${Date.now()}`
    );

    setLoans((prev) => prev.map((l) => (l.id === loanId ? result.updatedLoan : l)));
    setPayments((prev) => [result.payment, ...prev]);

    const journal = createRepaymentJournal(
      loan.branchId,
      loan.loanAccountNumber,
      result.payment.receiptNumber,
      amount,
      method,
      result.payment.allocations,
      `${activeUser.firstName} ${activeUser.lastName}`,
      chartOfAccounts
    );
    setJournals((prev) => [journal, ...prev]);

    // Save to Cloud SQL PostgreSQL
    if (isOnline) {
      try {
        await fetch('/api/repayments', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            loanId: loan.id,
            amount,
            paymentMethod: method === 'CASH' ? 'CASH' : (method === 'AIRTEL_MONEY' ? 'AIRTEL_MONEY' : (method === 'TIGO_PESA' ? 'TIGO_PESA' : 'MPESA')),
            referenceNumber: channelRef,
            receivedBy: `${activeUser.firstName} ${activeUser.lastName}`,
          }),
        });
        refreshSummary();
      } catch {
        addOfflineRecord({
          operationType: 'COLLECTION_PAYMENT',
          payload: { loanId, amount, paymentMethod: method, channelRef },
          clientTimestamp: new Date().toISOString(),
        });
      }
    } else {
      addOfflineRecord({
        operationType: 'COLLECTION_PAYMENT',
        payload: { loanId, amount, paymentMethod: method, channelRef },
        clientTimestamp: new Date().toISOString(),
      });
    }

    return result.payment;
  };

  const reverseExistingPayment = async (paymentId: string, reason: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment not found');
    const loan = loans.find((l) => l.id === payment.loanId);
    if (!loan) throw new Error('Associated loan not found');

    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? { ...p, isReversed: true, reversedAt: new Date().toISOString(), reversedBy: `${activeUser.firstName} ${activeUser.lastName}`, reversalReason: reason }
          : p
      )
    );

    // Reversal journal
    const reversalJournal: JournalEntry = {
      id: `jv-rev-${Date.now()}`,
      entryNumber: `JV-REV-${Math.floor(100000 + Math.random() * 900000)}`,
      branchId: loan.branchId,
      transactionDate: new Date().toISOString().split('T')[0],
      narration: `REVERSAL of Receipt ${payment.receiptNumber} - Reason: ${reason}`,
      referenceType: 'REVERSAL',
      referenceId: payment.receiptNumber,
      postedBy: `${activeUser.firstName} ${activeUser.lastName}`,
      lines: [
        {
          id: `jl-rev-1`,
          accountId: 'coa-1200',
          accountCode: '1200',
          accountName: 'Gross Loan Portfolio',
          entryType: 'DEBIT',
          amount: payment.principalAllocated,
        },
        {
          id: `jl-rev-2`,
          accountId: 'coa-1020',
          accountCode: '1020',
          accountName: 'Vodacom M-Pesa Float',
          entryType: 'CREDIT',
          amount: payment.amount,
        },
      ],
      totalDebit: payment.amount,
      totalCredit: payment.amount,
      createdAt: new Date().toISOString(),
    };
    setJournals((prev) => [reversalJournal, ...prev]);
  };

  const processSavingsDeposit = async (accountId: string, amount: number, method: any, reference: string) => {
    const acc = savingsAccounts.find((a) => a.id === accountId);
    if (!acc) throw new Error('Savings account not found');

    const balBefore = acc.balance;
    const balAfter = roundCurrency(balBefore + amount);

    const tx: SavingsTransaction = {
      id: `stx-${Date.now()}`,
      savingsAccountId: acc.id,
      accountNumber: acc.accountNumber,
      customerName: acc.customerName,
      transactionType: 'DEPOSIT',
      amount,
      balanceBefore: balBefore,
      balanceAfter: balAfter,
      paymentMethod: method,
      reference,
      postedBy: `${activeUser.firstName} ${activeUser.lastName}`,
      createdAt: new Date().toISOString(),
    };

    setSavingsAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, balance: balAfter } : a))
    );
    setSavingsTransactions((prev) => [tx, ...prev]);

    if (isOnline) {
      try {
        await fetch('/api/savings/transaction', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            accountId: acc.id,
            transactionType: 'DEPOSIT',
            amount,
            channel: method,
            narration: `Deposit to ${acc.accountNumber}`,
          }),
        });
        refreshSummary();
      } catch {
        // offline
      }
    }
  };

  const processSavingsWithdrawal = async (accountId: string, amount: number, method: any, reference: string) => {
    const acc = savingsAccounts.find((a) => a.id === accountId);
    if (!acc) throw new Error('Savings account not found');

    const available = acc.balance - acc.lockedAmount;
    if (amount > available) {
      throw new Error(`Insufficient free balance. Locked collateral is ${acc.lockedAmount.toLocaleString()} TZS.`);
    }

    const balBefore = acc.balance;
    const balAfter = roundCurrency(balBefore - amount);

    const tx: SavingsTransaction = {
      id: `stx-${Date.now()}`,
      savingsAccountId: acc.id,
      accountNumber: acc.accountNumber,
      customerName: acc.customerName,
      transactionType: 'WITHDRAWAL',
      amount,
      balanceBefore: balBefore,
      balanceAfter: balAfter,
      paymentMethod: method,
      reference,
      postedBy: `${activeUser.firstName} ${activeUser.lastName}`,
      createdAt: new Date().toISOString(),
    };

    setSavingsAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, balance: balAfter } : a))
    );
    setSavingsTransactions((prev) => [tx, ...prev]);

    if (isOnline) {
      try {
        await fetch('/api/savings/transaction', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            accountId: acc.id,
            transactionType: 'WITHDRAWAL',
            amount,
            channel: method,
            narration: `Withdrawal from ${acc.accountNumber}`,
          }),
        });
        refreshSummary();
      } catch {
        // offline
      }
    }
  };

  const simulateMobileMoneyWebhook = async (
    provider: 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA',
    loanNumber: string,
    amount: number,
    phone: string
  ): Promise<{ success: boolean; message: string; receipt?: string }> => {
    if (isOnline) {
      try {
        // /api/mobile-money/webhook is reserved for real provider callbacks
        // (verified by HMAC signature, not a user session). This "Simulate"
        // action is a staff-triggered test performed from an authenticated
        // session, so it goes through the separate /simulate endpoint.
        const res = await fetch('/api/mobile-money/simulate', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            provider,
            accountReference: loanNumber,
            phoneNumber: phone,
            amount,
          }),
        });
        const data = await res.json();
        refreshSummary();
        return {
          success: true,
          message: data.message || 'Payment processed successfully',
          receipt: data.receiptNumber,
        };
      } catch {
        // fallback
      }
    }

    const loan = loans.find((l) => l.loanAccountNumber === loanNumber);
    if (!loan) {
      return { success: false, message: `Loan account ${loanNumber} not found.` };
    }
    const payment = await processRepayment(loan.id, amount, 'MOBILE_MONEY', `TX-${Date.now()}`);
    return {
      success: true,
      message: `Webhook simulated and recorded locally.`,
      receipt: payment.receiptNumber,
    };
  };

  const postManualJournalEntry = async (
    narration: string,
    lines: Array<{ accountId: string; entryType: 'DEBIT' | 'CREDIT'; amount: number }>
  ): Promise<JournalEntry> => {
    const totalDr = roundCurrency(lines.filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + l.amount, 0));
    const totalCr = roundCurrency(lines.filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + l.amount, 0));

    if (Math.abs(totalDr - totalCr) > 0.01) {
      throw new Error(
        `Double-entry invariant violated: Total Debits (TZS ${totalDr.toLocaleString()}) must exactly equal Total Credits (TZS ${totalCr.toLocaleString()}).`
      );
    }

    const entryNumber = `JV-MAN-${Math.floor(100000 + Math.random() * 900000)}`;
    const journalLines = lines.map((l, idx) => {
      const coa = chartOfAccounts.find((c) => c.id === l.accountId || c.accountCode === l.accountId);
      return {
        id: `jl-man-${Date.now()}-${idx}`,
        accountId: coa?.id || l.accountId,
        accountCode: coa?.accountCode || l.accountId,
        accountName: coa?.accountName || 'Account',
        entryType: l.entryType,
        amount: roundCurrency(l.amount),
      };
    });

    const newJournal: JournalEntry = {
      id: `jv-${Date.now()}`,
      entryNumber,
      branchId: currentBranchId === 'ALL' ? branches[0]?.id || 'br-kariakoo' : currentBranchId,
      transactionDate: new Date().toISOString().split('T')[0],
      narration,
      referenceType: 'MANUAL',
      referenceId: entryNumber,
      postedBy: `${activeUser.firstName} ${activeUser.lastName}`,
      lines: journalLines,
      totalDebit: totalDr,
      totalCredit: totalCr,
      createdAt: new Date().toISOString(),
    };

    setJournals((prev) => [newJournal, ...prev]);

    // Update COA balances
    setChartOfAccounts((prev) =>
      prev.map((acc) => {
        const matchingLines = journalLines.filter((jl) => jl.accountId === acc.id || jl.accountCode === acc.accountCode);
        if (matchingLines.length === 0) return acc;
        let delta = 0;
        for (const ml of matchingLines) {
          if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
            delta += ml.entryType === 'DEBIT' ? ml.amount : -ml.amount;
          } else {
            delta += ml.entryType === 'CREDIT' ? ml.amount : -ml.amount;
          }
        }
        return { ...acc, currentBalance: roundCurrency(acc.currentBalance + delta) };
      })
    );

    if (isOnline) {
      try {
        await fetch('/api/accounting/journal', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            entryNumber,
            narration,
            lines: journalLines,
          }),
        });
      } catch {
        // saved locally
      }
    }

    return newJournal;
  };

  const addOfflineRecord = (
    record: Partial<OfflineSyncRecord> & {
      operationType: OfflineSyncRecord['operationType'];
      payload: any;
    }
  ) => {
    const newRecord: OfflineSyncRecord = {
      id: record.id || `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      deviceId: record.deviceId || 'field-tablet-kariakoo',
      userId: record.userId || activeUser.id,
      userName: record.userName || `${activeUser.firstName} ${activeUser.lastName}`,
      operationType: record.operationType,
      idempotencyKey: record.idempotencyKey || `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      payload: record.payload,
      clientTimestamp: record.clientTimestamp || new Date().toISOString(),
      syncStatus: 'PENDING',
    };
    setOfflineQueue((prev) => [...prev, newRecord]);
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    if (isOnline) {
      try {
        const res = await fetch('/api/offline-sync', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            deviceId: 'field-tablet-kariakoo',
            queue: offlineQueue,
          }),
        });
        if (res.ok) {
          setOfflineQueue([]);
          refreshSummary();
          return;
        }
      } catch {
        // failed network sync
      }
    }

    // Local queue replay
    const updatedQueue: OfflineSyncRecord[] = [];
    for (const item of offlineQueue) {
      if (item.operationType === 'COLLECTION_PAYMENT') {
        const { loanId, amount, paymentMethod, channelRef } = item.payload;
        try {
          await processRepayment(loanId, amount, paymentMethod, channelRef);
          updatedQueue.push({ ...item, syncStatus: 'SYNCED', syncedAt: new Date().toISOString() });
        } catch (err: any) {
          updatedQueue.push({ ...item, syncStatus: 'CONFLICT', conflictReason: err.message });
        }
      } else {
        updatedQueue.push({ ...item, syncStatus: 'SYNCED', syncedAt: new Date().toISOString() });
      }
    }
    setOfflineQueue(updatedQueue);
  };

  const resetToSeedData = async () => {
    localStorage.clear();
    setCustomers(INITIAL_CUSTOMERS);
    setGroups(INITIAL_GROUPS);
    setApplications(INITIAL_APPLICATIONS);
    setLoans(INITIAL_LOANS);
    setPayments(INITIAL_PAYMENTS);
    setSavingsAccounts(INITIAL_SAVINGS);
    setSavingsTransactions([]);
    setChartOfAccounts(INITIAL_CHART_OF_ACCOUNTS);
    setJournals(INITIAL_JOURNALS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setOfflineQueue([]);
    await loadCloudSqlData();
  };

  return (
    <MfiContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        authToken,
        isAuthLoading,
        login,
        logout,
        users,
        currentBranchId,
        setCurrentBranchId,
        branches,
        isOnline,
        setIsOnline,
        offlineQueue,
        language,
        setLanguage,
        summaryMetrics,
        refreshSummary,
        customers,
        groups,
        loanProducts,
        applications,
        loans,
        payments,
        savingsAccounts,
        savingsTransactions,
        chartOfAccounts,
        journals,
        auditLogs,
        providerTransactions,
        createCustomer,
        verifyKycDocument,
        createLendingGroup,
        createLoanApplication,
        assessLoanApplication,
        approveLoanApplication,
        disburseLoan,
        processRepayment,
        reverseExistingPayment,
        processSavingsDeposit,
        processSavingsWithdrawal,
        postManualJournalEntry,
        simulateMobileMoneyWebhook,
        syncOfflineQueue,
        addOfflineRecord,
        resetToSeedData,
      }}
    >
      {children}
    </MfiContext.Provider>
  );
};

export const useMfi = () => {
  const context = useContext(MfiContext);
  if (!context) {
    throw new Error('useMfi must be used within an MfiProvider');
  }
  return context;
};
