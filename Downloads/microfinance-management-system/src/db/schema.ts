import { pgTable, text, timestamp, integer, doublePrecision, boolean, uuid } from 'drizzle-orm/pg-core';

export const branches = pgTable('branches', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  region: text('region').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid'), // Firebase Auth UID if signed in
  username: text('username'),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role').notNull(), // 'ADMIN' | 'HEAD_OFFICE_MANAGER' | 'BRANCH_MANAGER' | 'CREDIT_OFFICER' | 'LOAN_OFFICER' | 'COLLECTION_OFFICER' | 'CASHIER' | 'ACCOUNTANT' | 'AUDITOR'
  branchId: text('branch_id').references(() => branches.id),
  preferredLanguage: text('preferred_language').default('en').notNull(), // 'en' | 'sw'
  isActive: boolean('is_active').default(true).notNull(),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  customerNumber: text('customer_number').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  nationalIdNida: text('national_id_nida').notNull().unique(),
  phoneNumber: text('phone_number').notNull(),
  email: text('email'),
  dateOfBirth: text('date_of_birth').notNull(),
  gender: text('gender').notNull(),
  residentialAddress: text('residential_address').notNull(),
  businessType: text('business_type').notNull(),
  monthlyIncome: doublePrecision('monthly_income').notNull(),
  branchId: text('branch_id').references(() => branches.id).notNull(),
  kycTier: integer('kyc_tier').default(2).notNull(),
  crbStatus: text('crb_status').default('GOOD').notNull(),
  crbScore: integer('crb_score').default(710).notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  documentUrl: text('document_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  groupNumber: text('group_number').notNull().unique(),
  name: text('name').notNull(),
  meetingDay: text('meeting_day').notNull(),
  meetingFrequency: text('meeting_frequency').notNull(), // 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY'
  meetingLocation: text('meeting_location').notNull(),
  branchId: text('branch_id').references(() => branches.id).notNull(),
  officerId: text('officer_id').references(() => users.id),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groupMembers = pgTable('group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id').references(() => groups.id).notNull(),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  roleInGroup: text('role_in_group').default('MEMBER').notNull(), // 'CHAIRPERSON' | 'SECRETARY' | 'TREASURER' | 'MEMBER'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const loanProducts = pgTable('loan_products', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameSw: text('name_sw').notNull(),
  interestMethod: text('interest_method').notNull(), // 'FLAT' | 'REDUCING_EQUAL_INSTALLMENT' | 'REDUCING_EQUAL_PRINCIPAL'
  annualInterestRate: doublePrecision('annual_interest_rate').notNull(),
  minAmount: doublePrecision('min_amount').notNull(),
  maxAmount: doublePrecision('max_amount').notNull(),
  minTenureMonths: integer('min_tenure_months').notNull(),
  maxTenureMonths: integer('max_tenure_months').notNull(),
  repaymentFrequency: text('repayment_frequency').notNull(), // 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY'
  originationFeeRate: doublePrecision('origination_fee_rate').default(0.02).notNull(),
  compulsorySavingsRate: doublePrecision('compulsory_savings_rate').default(0.10).notNull(),
  penaltyRatePerDay: doublePrecision('penalty_rate_per_day').default(0.001).notNull(),
  gracePeriodDays: integer('grace_period_days').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const loanApplications = pgTable('loan_applications', {
  id: text('id').primaryKey(),
  applicationNumber: text('application_number').notNull().unique(),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  productId: text('product_id').references(() => loanProducts.id).notNull(),
  groupId: text('group_id').references(() => groups.id),
  requestedAmount: doublePrecision('requested_amount').notNull(),
  approvedAmount: doublePrecision('approved_amount'),
  tenureMonths: integer('tenure_months').notNull(),
  purpose: text('purpose').notNull(),
  status: text('status').default('PENDING_REVIEW').notNull(), // 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED'
  assessedDsti: doublePrecision('assessed_dsti'),
  creditScore: integer('credit_score'),
  officerRecommendation: text('officer_recommendation'),
  submittedBy: text('submitted_by').references(() => users.id),
  reviewedBy: text('reviewed_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const loans = pgTable('loans', {
  id: text('id').primaryKey(),
  loanAccountNumber: text('loan_account_number').notNull().unique(),
  applicationId: text('application_id').references(() => loanApplications.id).notNull(),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  productId: text('product_id').references(() => loanProducts.id).notNull(),
  branchId: text('branch_id').references(() => branches.id).notNull(),
  groupId: text('group_id').references(() => groups.id),
  principalAmount: doublePrecision('principal_amount').notNull(),
  outstandingPrincipal: doublePrecision('outstanding_principal').notNull(),
  interestRate: doublePrecision('interest_rate').notNull(),
  tenureMonths: integer('tenure_months').notNull(),
  disbursementDate: text('disbursement_date').notNull(),
  maturityDate: text('maturity_date').notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'DELINQUENT' | 'CLOSED' | 'WRITTEN_OFF'
  interestMethod: text('interest_method').notNull(),
  repaymentFrequency: text('repayment_frequency').notNull(),
  daysInArrears: integer('days_in_arrears').default(0).notNull(),
  accruedInterest: doublePrecision('accrued_interest').default(0).notNull(),
  unpaidFees: doublePrecision('unpaid_fees').default(0).notNull(),
  unpaidPenalties: doublePrecision('unpaid_penalties').default(0).notNull(),
  totalPaid: doublePrecision('total_paid').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const loanInstallments = pgTable('loan_installments', {
  id: text('id').primaryKey(),
  loanId: text('loan_id').references(() => loans.id).notNull(),
  installmentNumber: integer('installment_number').notNull(),
  dueDate: text('due_date').notNull(),
  principalDue: doublePrecision('principal_due').notNull(),
  interestDue: doublePrecision('interest_due').notNull(),
  feesDue: doublePrecision('fees_due').default(0).notNull(),
  totalDue: doublePrecision('total_due').notNull(),
  principalPaid: doublePrecision('principal_paid').default(0).notNull(),
  interestPaid: doublePrecision('interest_paid').default(0).notNull(),
  feesPaid: doublePrecision('fees_paid').default(0).notNull(),
  penaltiesPaid: doublePrecision('penalties_paid').default(0).notNull(),
  status: text('status').default('PENDING').notNull(), // 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE'
  paidAt: text('paid_at'),
});

export const repayments = pgTable('repayments', {
  id: text('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  loanId: text('loan_id').references(() => loans.id).notNull(),
  amount: doublePrecision('amount').notNull(),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA' | 'CASH' | 'BANK_TRANSFER'
  referenceNumber: text('reference_number').notNull(),
  principalAllocated: doublePrecision('principal_allocated').notNull(),
  interestAllocated: doublePrecision('interest_allocated').notNull(),
  feesAllocated: doublePrecision('fees_allocated').notNull(),
  penaltiesAllocated: doublePrecision('penalties_allocated').notNull(),
  receivedBy: text('received_by').notNull(),
  isReversed: boolean('is_reversed').default(false).notNull(),
  reversalReason: text('reversal_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savingsAccounts = pgTable('savings_accounts', {
  id: text('id').primaryKey(),
  accountNumber: text('account_number').notNull().unique(),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  productType: text('product_type').notNull(), // 'VOLUNTARY' | 'COMPULSORY_COLLATERAL'
  balance: doublePrecision('balance').default(0).notNull(),
  lockedAmount: doublePrecision('locked_amount').default(0).notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'DORMANT' | 'FROZEN'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savingsTransactions = pgTable('savings_transactions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').references(() => savingsAccounts.id).notNull(),
  transactionType: text('transaction_type').notNull(), // 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST_CREDIT'
  amount: doublePrecision('amount').notNull(),
  balanceAfter: doublePrecision('balance_after').notNull(),
  narration: text('narration').notNull(),
  channel: text('channel').notNull(),
  reference: text('reference').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  normalBalance: text('normal_balance').notNull(), // 'DEBIT' | 'CREDIT'
  balance: doublePrecision('balance').default(0).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const journalEntries = pgTable('journal_entries', {
  id: text('id').primaryKey(),
  entryNumber: text('entry_number').notNull().unique(),
  transactionDate: text('transaction_date').notNull(),
  narration: text('narration').notNull(),
  referenceType: text('reference_type').notNull(), // 'DISBURSEMENT' | 'REPAYMENT' | 'SAVINGS_DEPOSIT' | 'PROVISION'
  referenceId: text('reference_id'),
  totalDebit: doublePrecision('total_debit').notNull(),
  totalCredit: doublePrecision('total_credit').notNull(),
  postedBy: text('posted_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const journalLines = pgTable('journal_lines', {
  id: text('id').primaryKey(),
  journalId: text('journal_id').references(() => journalEntries.id).notNull(),
  accountCode: text('account_code').notNull(),
  accountName: text('account_name').notNull(),
  entryType: text('entry_type').notNull(), // 'DEBIT' | 'CREDIT'
  amount: doublePrecision('amount').notNull(),
});

export const mobileMoneyTransactions = pgTable('mobile_money_transactions', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(), // 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA'
  providerTxId: text('provider_tx_id').notNull().unique(),
  accountReference: text('account_reference').notNull(),
  phoneNumber: text('phone_number').notNull(),
  amount: doublePrecision('amount').notNull(),
  hmacSignature: text('hmac_signature').notNull(),
  processingStatus: text('processing_status').notNull(), // 'COMPLETED' | 'FAILED' | 'DUPLICATE'
  receiptNumber: text('receipt_number'),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  action: text('action').notNull(),
  entityName: text('entity_name').notNull(),
  entityId: text('entity_id').notNull(),
  ipAddress: text('ip_address').notNull(),
  details: text('details').notNull(),
});

export const offlineSyncRecords = pgTable('offline_sync_records', {
  id: text('id').primaryKey(),
  localId: text('local_id').notNull().unique(),
  deviceId: text('device_id').notNull(),
  operationType: text('operation_type').notNull(),
  payloadJson: text('payload_json').notNull(),
  clientTimestamp: text('client_timestamp').notNull(),
  syncStatus: text('sync_status').default('PENDING').notNull(), // 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT'
  syncedAt: timestamp('synced_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),
});
