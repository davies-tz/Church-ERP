/**
 * Core Microfinance System Types & Enums
 * Tailored for Tanzanian Core Banking & MFI Operations
 */

export type RoleName =
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'HEAD_OFFICE_MANAGER'
  | 'REGIONAL_MANAGER'
  | 'BRANCH_MANAGER'
  | 'FIELD_OFFICER'
  | 'LOAN_OFFICER'
  | 'CREDIT_OFFICER'
  | 'COLLECTION_OFFICER'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'AUDITOR'
  | 'CUSTOMER';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: RoleName;
  branchId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  avatarUrl?: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  region: string;
  district: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
}

export type KycDocumentType = 'NIDA' | 'PASSPORT' | 'DRIVING_LICENSE' | 'VOTER_ID' | 'LOCAL_GOV_LETTER';
export type KycStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface KycDocument {
  id: string;
  documentType: KycDocumentType;
  documentNumber: string;
  issueDate?: string;
  expiryDate?: string;
  storageRef: string;
  verificationStatus: KycStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface Customer {
  id: string;
  customerNumber: string;
  branchId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  phonePrimary: string;
  phoneSecondary?: string;
  email?: string;
  nationalIdNumber?: string; // NIDA
  status: 'ACTIVE' | 'PENDING_KYC' | 'DORMANT' | 'BLACKLISTED';
  groupId?: string;
  documents: KycDocument[];
  businessType?: string;
  monthlyRevenue?: number;
  monthlyExpenses?: number;
  createdAt: string;
}

export interface LendingGroup {
  id: string;
  groupNumber: string;
  branchId: string;
  name: string;
  leaderCustomerId: string;
  loanOfficerId: string;
  meetingFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  meetingDayOfWeek: number; // 1 = Monday, 7 = Sunday
  meetingLocation: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  memberIds: string[];
  createdAt: string;
}

export type InterestMethod = 'FLAT' | 'DECLINING_BALANCE' | 'EQUAL_INSTALLMENT';
export type DayCountConvention = 'ACTUAL_365' | 'ACTUAL_360' | '30_360';
export type RepaymentFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type GracePeriodType = 'NONE' | 'PRINCIPAL_ONLY' | 'PRINCIPAL_AND_INTEREST';
export type OverpaymentPolicy = 'NEXT_INSTALLMENT' | 'PRINCIPAL_PREPAYMENT' | 'CUSTOMER_CREDIT';

export interface LoanProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  minPrincipal: number;
  maxPrincipal: number;
  annualNominalRate: number; // e.g. 18%
  interestMethod: InterestMethod;
  dayCountConvention: DayCountConvention;
  repaymentFrequency: RepaymentFrequency;
  minTerm: number; // in installments
  maxTerm: number;
  gracePeriodType: GracePeriodType;
  gracePeriodInstallments: number;
  processingFeePercent: number; // e.g. 2%
  latePenaltyDailyPercent: number; // e.g. 0.1% daily
  paymentAllocationStrategy: 'PENALTY_FEE_INTEREST_PRINCIPAL' | 'PRINCIPAL_INTEREST_FEE_PENALTY';
  overpaymentPolicy: OverpaymentPolicy;
  status: 'ACTIVE' | 'INACTIVE';
}

export type LoanApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSESSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'READY_FOR_DISBURSEMENT'
  | 'DISBURSED';

export interface LoanAssessment {
  id: string;
  assessorId: string;
  assessorName: string;
  assessedAt: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  disposableIncome: number;
  debtToIncomeRatio: number; // percentage
  creditScore: number; // 0-1000
  riskGrade: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  recommendation: 'RECOMMEND_APPROVE' | 'RECOMMEND_REJECT' | 'CONDITIONALLY_APPROVE';
  notes: string;
}

export interface LoanApproval {
  id: string;
  approverId: string;
  approverName: string;
  level: 'BRANCH_MANAGER' | 'REGIONAL_MANAGER' | 'HEAD_OFFICE';
  decision: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REWORK';
  approvedAmount: number;
  comments: string;
  approvedAt: string;
}

export interface LoanApplication {
  id: string;
  applicationNumber: string;
  branchId: string;
  customerId: string;
  customerName: string;
  groupId?: string;
  groupName?: string;
  productId: string;
  productName: string;
  appliedPrincipal: number;
  approvedPrincipal?: number;
  termInstallments: number;
  purpose: string;
  status: LoanApplicationStatus;
  loanOfficerId: string;
  assessment?: LoanAssessment;
  approvals: LoanApproval[];
  createdAt: string;
  updatedAt: string;
}

export type InstallmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WAIVED';

export interface LoanInstallment {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  feeDue: number;
  penaltyDue: number;
  totalDue: number;
  principalPaid: number;
  interestPaid: number;
  feePaid: number;
  penaltyPaid: number;
  totalPaid: number;
  status: InstallmentStatus;
}

export type LoanStatus =
  | 'ACTIVE'
  | 'IN_ARREARS'
  | 'PAID_OFF'
  | 'CLOSED'
  | 'RESCHEDULED'
  | 'RESTRUCTURED'
  | 'WRITTEN_OFF';

export interface Loan {
  id: string;
  loanAccountNumber: string;
  applicationId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  productId: string;
  productName: string;
  groupId?: string;
  groupName?: string;
  disbursedPrincipal: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  outstandingFees: number;
  outstandingPenalties: number;
  totalOutstanding: number;
  daysInArrears: number;
  status: LoanStatus;
  disbursedAt: string;
  disbursedBy: string;
  maturityDate: string;
  installments: LoanInstallment[];
}

export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'SAVINGS_OFFSET';

export interface PaymentAllocation {
  id: string;
  installmentId: string;
  installmentNumber: number;
  allocatedPenalty: number;
  allocatedFee: number;
  allocatedInterest: number;
  allocatedPrincipal: number;
  totalAllocated: number;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  loanId: string;
  loanAccountNumber: string;
  customerName: string;
  branchId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  channelReference?: string; // e.g., M-Pesa Trans ID: QKH87162JS
  paymentDate: string;
  receivedBy: string;
  idempotencyKey: string;
  isReversed: boolean;
  allocations: PaymentAllocation[];
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
}

export interface SavingsProduct {
  id: string;
  code: string;
  name: string;
  type: 'VOLUNTARY' | 'COMPULSORY_COLLATERAL';
  interestRateAnnual: number;
  minBalance: number;
}

export interface SavingsAccount {
  id: string;
  accountNumber: string;
  customerId: string;
  customerName: string;
  branchId: string;
  productType: 'VOLUNTARY' | 'COMPULSORY_COLLATERAL';
  interestRate: number;
  balance: number;
  lockedAmount: number; // for loan collateral lock
  status: 'ACTIVE' | 'DORMANT' | 'FROZEN';
  createdAt: string;
}

export interface SavingsTransaction {
  id: string;
  savingsAccountId: string;
  accountNumber: string;
  customerName: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST_CREDIT' | 'FEE_DEDUCTION' | 'LOAN_OFFSET';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod: PaymentMethod;
  reference: string;
  postedBy: string;
  createdAt: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
  balance: number;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  branchId: string;
  transactionDate: string;
  narration: string;
  referenceType: 'LOAN_DISBURSEMENT' | 'LOAN_REPAYMENT' | 'REVERSAL' | 'SAVINGS_DEPOSIT' | 'SAVINGS_WITHDRAWAL' | 'MANUAL';
  referenceId: string;
  postedBy: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
}

export interface ProviderWebhookTransaction {
  id: string;
  provider: 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA';
  providerTxId: string;
  phoneNumber: string;
  accountReference: string; // e.g., Loan Account Number
  amount: number;
  signatureVerified: boolean;
  processingStatus: 'PENDING' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';
  receivedAt: string;
  errorMessage?: string;
}

export interface OfflineSyncRecord {
  id: string;
  deviceId: string;
  userId: string;
  userName: string;
  operationType: 'COLLECTION_PAYMENT' | 'CUSTOMER_REGISTRATION' | 'GROUP_ATTENDANCE';
  idempotencyKey: string;
  payload: any;
  clientTimestamp: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  conflictReason?: string;
  syncedAt?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityName: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  ipAddress: string;
  timestamp: string;
}
