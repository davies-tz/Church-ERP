/**
 * Double-Entry Accounting Engine
 * Enforces: Sum(Debits) === Sum(Credits) on every journal entry.
 */
import { ChartOfAccount, JournalEntry, JournalLine, PaymentAllocation, PaymentMethod } from '../types';
import { roundCurrency } from './interestEngine';

export function validateJournalBalance(lines: JournalLine[]): boolean {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    if (line.entryType === 'DEBIT') {
      totalDebit += line.amount;
    } else {
      totalCredit += line.amount;
    }
  }

  totalDebit = roundCurrency(totalDebit);
  totalCredit = roundCurrency(totalCredit);

  return Math.abs(totalDebit - totalCredit) < 0.001;
}

export function getAccountForPaymentMethod(method: PaymentMethod, accounts: ChartOfAccount[]): ChartOfAccount {
  let code = '1010'; // Default Cash at Till
  if (method === 'MOBILE_MONEY') code = '1020'; // M-Pesa Float
  if (method === 'BANK_TRANSFER') code = '1030'; // Bank Account
  if (method === 'SAVINGS_OFFSET') code = '2020'; // Customer Savings

  const account = accounts.find(a => a.code === code);
  if (!account) {
    throw new Error(`GL Account code ${code} not found in Chart of Accounts.`);
  }
  return account;
}

export function createDisbursementJournal(
  branchId: string,
  loanAccountNumber: string,
  principal: number,
  processingFee: number,
  method: PaymentMethod,
  postedBy: string,
  accounts: ChartOfAccount[]
): JournalEntry {
  const assetCashAccount = getAccountForPaymentMethod(method, accounts);
  const loanPrincipalAccount = accounts.find(a => a.code === '1210') || accounts[3]; // Loan Portfolio Principal
  const feeIncomeAccount = accounts.find(a => a.code === '4020') || accounts[7]; // Processing Fee Income

  const netCashOut = roundCurrency(principal - processingFee);
  const lines: JournalLine[] = [];

  // 1. DR Loan Portfolio (Asset)
  lines.push({
    id: `jl-${Date.now()}-1`,
    accountId: loanPrincipalAccount.id,
    accountCode: loanPrincipalAccount.code,
    accountName: loanPrincipalAccount.name,
    entryType: 'DEBIT',
    amount: roundCurrency(principal),
  });

  // 2. CR Cash / Bank / M-Pesa (Asset reduction)
  lines.push({
    id: `jl-${Date.now()}-2`,
    accountId: assetCashAccount.id,
    accountCode: assetCashAccount.code,
    accountName: assetCashAccount.name,
    entryType: 'CREDIT',
    amount: netCashOut,
  });

  // 3. CR Fee Income (if deducted at disbursement)
  if (processingFee > 0) {
    lines.push({
      id: `jl-${Date.now()}-3`,
      accountId: feeIncomeAccount.id,
      accountCode: feeIncomeAccount.code,
      accountName: feeIncomeAccount.name,
      entryType: 'CREDIT',
      amount: roundCurrency(processingFee),
    });
  }

  if (!validateJournalBalance(lines)) {
    throw new Error('FATAL: Disbursement journal entry is unbalanced. Debit must equal Credit.');
  }

  const totalAmount = roundCurrency(principal);
  return {
    id: `je-${Date.now()}`,
    entryNumber: `JV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    branchId,
    transactionDate: new Date().toISOString().split('T')[0],
    narration: `Disbursement of Loan ${loanAccountNumber} via ${method}`,
    referenceType: 'LOAN_DISBURSEMENT',
    referenceId: loanAccountNumber,
    postedBy,
    lines,
    totalDebit: totalAmount,
    totalCredit: totalAmount,
    createdAt: new Date().toISOString(),
  };
}

export function createRepaymentJournal(
  branchId: string,
  loanAccountNumber: string,
  receiptNumber: string,
  amount: number,
  method: PaymentMethod,
  allocations: PaymentAllocation[],
  postedBy: string,
  accounts: ChartOfAccount[]
): JournalEntry {
  const cashAccount = getAccountForPaymentMethod(method, accounts);
  const loanPrincipalAccount = accounts.find(a => a.code === '1210') || accounts[3];
  const interestIncomeAccount = accounts.find(a => a.code === '4010') || accounts[6];
  const feeIncomeAccount = accounts.find(a => a.code === '4020') || accounts[7];
  const penaltyIncomeAccount = accounts.find(a => a.code === '4030') || accounts[8];

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalFee = 0;
  let totalPenalty = 0;

  for (const a of allocations) {
    totalPrincipal += a.allocatedPrincipal;
    totalInterest += a.allocatedInterest;
    totalFee += a.allocatedFee;
    totalPenalty += a.allocatedPenalty;
  }

  const lines: JournalLine[] = [];

  // 1. DR Cash / M-Pesa / Bank
  lines.push({
    id: `jl-${Date.now()}-dr`,
    accountId: cashAccount.id,
    accountCode: cashAccount.code,
    accountName: cashAccount.name,
    entryType: 'DEBIT',
    amount: roundCurrency(amount),
  });

  // 2. CR Principal Receivable
  if (totalPrincipal > 0) {
    lines.push({
      id: `jl-${Date.now()}-cr-prin`,
      accountId: loanPrincipalAccount.id,
      accountCode: loanPrincipalAccount.code,
      accountName: loanPrincipalAccount.name,
      entryType: 'CREDIT',
      amount: roundCurrency(totalPrincipal),
    });
  }

  // 3. CR Interest Income
  if (totalInterest > 0) {
    lines.push({
      id: `jl-${Date.now()}-cr-int`,
      accountId: interestIncomeAccount.id,
      accountCode: interestIncomeAccount.code,
      accountName: interestIncomeAccount.name,
      entryType: 'CREDIT',
      amount: roundCurrency(totalInterest),
    });
  }

  // 4. CR Fee Income
  if (totalFee > 0) {
    lines.push({
      id: `jl-${Date.now()}-cr-fee`,
      accountId: feeIncomeAccount.id,
      accountCode: feeIncomeAccount.code,
      accountName: feeIncomeAccount.name,
      entryType: 'CREDIT',
      amount: roundCurrency(totalFee),
    });
  }

  // 5. CR Penalty Income
  if (totalPenalty > 0) {
    lines.push({
      id: `jl-${Date.now()}-cr-pen`,
      accountId: penaltyIncomeAccount.id,
      accountCode: penaltyIncomeAccount.code,
      accountName: penaltyIncomeAccount.name,
      entryType: 'CREDIT',
      amount: roundCurrency(totalPenalty),
    });
  }

  if (!validateJournalBalance(lines)) {
    throw new Error('FATAL: Repayment journal entry is unbalanced. Debit must equal Credit.');
  }

  return {
    id: `je-${Date.now()}`,
    entryNumber: `JV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    branchId,
    transactionDate: new Date().toISOString().split('T')[0],
    narration: `Repayment for Loan ${loanAccountNumber} (Receipt ${receiptNumber})`,
    referenceType: 'LOAN_REPAYMENT',
    referenceId: receiptNumber,
    postedBy,
    lines,
    totalDebit: roundCurrency(amount),
    totalCredit: roundCurrency(amount),
    createdAt: new Date().toISOString(),
  };
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitAmount: number;
  creditAmount: number;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  variance: number;
}

export function generateTrialBalance(accounts: ChartOfAccount[]): TrialBalanceReport {
  const rows: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const acc of accounts) {
    let dr = 0;
    let cr = 0;

    if (acc.normalBalance === 'DEBIT') {
      if (acc.balance >= 0) {
        dr = acc.balance;
      } else {
        cr = Math.abs(acc.balance);
      }
    } else {
      if (acc.balance >= 0) {
        cr = acc.balance;
      } else {
        dr = Math.abs(acc.balance);
      }
    }

    dr = roundCurrency(dr);
    cr = roundCurrency(cr);
    totalDebit += dr;
    totalCredit += cr;

    rows.push({
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      accountType: acc.type,
      debitAmount: dr,
      creditAmount: cr,
    });
  }

  totalDebit = roundCurrency(totalDebit);
  totalCredit = roundCurrency(totalCredit);
  const variance = roundCurrency(Math.abs(totalDebit - totalCredit));

  return {
    rows,
    totalDebit,
    totalCredit,
    isBalanced: variance < 0.01,
    variance,
  };
}
