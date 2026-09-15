/**
 * Arrears & Portfolio at Risk (PAR) Engine
 * Reference: CGAP & Bank of Tanzania Microfinance Regulatory Guidelines
 */
import { Loan } from '../types';
import { roundCurrency } from './interestEngine';

export interface ParMetrics {
  grossLoanPortfolio: number;
  totalLoans: number;
  activeLoans: number;
  arrearsLoans: number;
  totalPrincipalInArrears: number;
  par1Principal: number;
  par1Rate: number; // percentage
  par7Principal: number;
  par7Rate: number;
  par30Principal: number;
  par30Rate: number;
  par60Principal: number;
  par60Rate: number;
  par90Principal: number;
  par90Rate: number;
}

/**
 * Calculates days in arrears for a single loan based on earliest overdue installment
 */
export function calculateDaysInArrears(loan: Loan, asOfDate: Date = new Date()): number {
  if (loan.status === 'PAID_OFF' || loan.status === 'CLOSED' || loan.status === 'WRITTEN_OFF') {
    return 0;
  }

  let earliestOverdueDate: Date | null = null;

  for (const inst of loan.installments) {
    const isUnpaid = (inst.totalDue - inst.totalPaid) > 0.01;
    const dueDate = new Date(inst.dueDate);

    if (isUnpaid && dueDate < asOfDate) {
      if (!earliestOverdueDate || dueDate < earliestOverdueDate) {
        earliestOverdueDate = dueDate;
      }
    }
  }

  if (!earliestOverdueDate) {
    return 0;
  }

  const diffTime = Math.abs(asOfDate.getTime() - earliestOverdueDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Computes portfolio-wide PAR metrics
 */
export function calculatePortfolioAtRisk(loans: Loan[], asOfDate: Date = new Date()): ParMetrics {
  let grossLoanPortfolio = 0;
  let activeLoans = 0;
  let arrearsLoans = 0;
  let totalPrincipalInArrears = 0;

  let par1Principal = 0;
  let par7Principal = 0;
  let par30Principal = 0;
  let par60Principal = 0;
  let par90Principal = 0;

  for (const loan of loans) {
    if (loan.status === 'CLOSED' || loan.status === 'PAID_OFF' || loan.status === 'WRITTEN_OFF') {
      continue;
    }

    grossLoanPortfolio += loan.outstandingPrincipal;
    activeLoans++;

    const dpd = calculateDaysInArrears(loan, asOfDate);
    if (dpd > 0) {
      arrearsLoans++;
      totalPrincipalInArrears += loan.outstandingPrincipal;

      if (dpd >= 1) par1Principal += loan.outstandingPrincipal;
      if (dpd >= 7) par7Principal += loan.outstandingPrincipal;
      if (dpd >= 30) par30Principal += loan.outstandingPrincipal;
      if (dpd >= 60) par60Principal += loan.outstandingPrincipal;
      if (dpd >= 90) par90Principal += loan.outstandingPrincipal;
    }
  }

  grossLoanPortfolio = roundCurrency(grossLoanPortfolio);
  const glpSafe = grossLoanPortfolio > 0 ? grossLoanPortfolio : 1;

  return {
    grossLoanPortfolio,
    totalLoans: loans.length,
    activeLoans,
    arrearsLoans,
    totalPrincipalInArrears: roundCurrency(totalPrincipalInArrears),
    par1Principal: roundCurrency(par1Principal),
    par1Rate: roundCurrency((par1Principal / glpSafe) * 100),
    par7Principal: roundCurrency(par7Principal),
    par7Rate: roundCurrency((par7Principal / glpSafe) * 100),
    par30Principal: roundCurrency(par30Principal),
    par30Rate: roundCurrency((par30Principal / glpSafe) * 100),
    par60Principal: roundCurrency(par60Principal),
    par60Rate: roundCurrency((par60Principal / glpSafe) * 100),
    par90Principal: roundCurrency(par90Principal),
    par90Rate: roundCurrency((par90Principal / glpSafe) * 100),
  };
}

export interface AgingBucket {
  bucketName: string;
  minDays: number;
  maxDays: number;
  loanCount: number;
  principalAmount: number;
}

export function generateAgingSummary(loans: Loan[], asOfDate: Date = new Date()): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { bucketName: 'Current (0 DPD)', minDays: 0, maxDays: 0, loanCount: 0, principalAmount: 0 },
    { bucketName: '1 - 30 Days Past Due', minDays: 1, maxDays: 30, loanCount: 0, principalAmount: 0 },
    { bucketName: '31 - 60 Days Past Due', minDays: 31, maxDays: 60, loanCount: 0, principalAmount: 0 },
    { bucketName: '61 - 90 Days Past Due', minDays: 61, maxDays: 90, loanCount: 0, principalAmount: 0 },
    { bucketName: '90+ Days Past Due (Loss)', minDays: 91, maxDays: 99999, loanCount: 0, principalAmount: 0 },
  ];

  for (const loan of loans) {
    if (loan.status === 'CLOSED' || loan.status === 'PAID_OFF' || loan.status === 'WRITTEN_OFF') {
      continue;
    }

    const dpd = calculateDaysInArrears(loan, asOfDate);
    if (dpd === 0) {
      buckets[0].loanCount++;
      buckets[0].principalAmount += loan.outstandingPrincipal;
    } else if (dpd <= 30) {
      buckets[1].loanCount++;
      buckets[1].principalAmount += loan.outstandingPrincipal;
    } else if (dpd <= 60) {
      buckets[2].loanCount++;
      buckets[2].principalAmount += loan.outstandingPrincipal;
    } else if (dpd <= 90) {
      buckets[3].loanCount++;
      buckets[3].principalAmount += loan.outstandingPrincipal;
    } else {
      buckets[4].loanCount++;
      buckets[4].principalAmount += loan.outstandingPrincipal;
    }
  }

  for (const b of buckets) {
    b.principalAmount = roundCurrency(b.principalAmount);
  }

  return buckets;
}
