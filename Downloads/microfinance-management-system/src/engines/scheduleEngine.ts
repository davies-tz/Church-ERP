/**
 * Repayment Schedule Engine
 * Generates deterministic amortization tables with precision validation
 */
import {
  GracePeriodType,
  InterestMethod,
  LoanInstallment,
  RepaymentFrequency,
} from '../types';
import { calculateEqualInstallmentPMT, getPeriodicRate, roundCurrency } from './interestEngine';

export interface ScheduleGenerationParams {
  loanId: string;
  disbursedPrincipal: number;
  annualNominalRate: number; // percentage, e.g. 18
  interestMethod: InterestMethod;
  repaymentFrequency: RepaymentFrequency;
  termInstallments: number;
  startDate: string; // YYYY-MM-DD
  gracePeriodType: GracePeriodType;
  gracePeriodInstallments: number;
  processingFee?: number;
}

export function addFrequencyPeriod(dateStr: string, frequency: RepaymentFrequency, periodsToAdd: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  switch (frequency) {
    case 'DAILY':
      d.setDate(d.getDate() + periodsToAdd);
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + (7 * periodsToAdd));
      break;
    case 'BIWEEKLY':
      d.setDate(d.getDate() + (14 * periodsToAdd));
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + periodsToAdd);
      break;
  }
  return d.toISOString().split('T')[0];
}

export function generateRepaymentSchedule(params: ScheduleGenerationParams): LoanInstallment[] {
  const {
    loanId,
    disbursedPrincipal,
    annualNominalRate,
    interestMethod,
    repaymentFrequency,
    termInstallments,
    startDate,
    gracePeriodType,
    gracePeriodInstallments,
  } = params;

  const periodicRate = getPeriodicRate(annualNominalRate, repaymentFrequency);
  const installments: LoanInstallment[] = [];

  // Effective amortization installments (excluding principal grace periods)
  const principalAmortizationTerms = Math.max(1, termInstallments - gracePeriodInstallments);

  if (interestMethod === 'FLAT') {
    // Flat method: Total interest = Principal * annualRate * (termInPeriods / periodsPerYear)
    const periodsPerYear = repaymentFrequency === 'MONTHLY' ? 12 : repaymentFrequency === 'WEEKLY' ? 52 : 365;
    const totalInterest = roundCurrency(disbursedPrincipal * (annualNominalRate / 100) * (termInstallments / periodsPerYear));
    const equalPrincipal = roundCurrency(disbursedPrincipal / principalAmortizationTerms);
    const equalInterest = roundCurrency(totalInterest / termInstallments);

    let cumulativePrincipal = 0;
    let cumulativeInterest = 0;

    for (let i = 1; i <= termInstallments; i++) {
      const isGracePeriod = i <= gracePeriodInstallments;
      let principalDue = 0;
      let interestDue = equalInterest;

      if (!isGracePeriod) {
        if (i === termInstallments) {
          // Invariant balancing: Last installment takes remaining principal difference
          principalDue = roundCurrency(disbursedPrincipal - cumulativePrincipal);
        } else {
          principalDue = equalPrincipal;
          cumulativePrincipal += principalDue;
        }
      }

      if (isGracePeriod && gracePeriodType === 'PRINCIPAL_AND_INTEREST') {
        interestDue = 0; // Deferred
      }

      if (i === termInstallments) {
        interestDue = roundCurrency(totalInterest - cumulativeInterest);
      } else {
        cumulativeInterest += interestDue;
      }

      const dueDate = addFrequencyPeriod(startDate, repaymentFrequency, i);
      const totalDue = roundCurrency(principalDue + interestDue);

      installments.push({
        id: `inst-${loanId}-${i}`,
        loanId,
        installmentNumber: i,
        dueDate,
        principalDue,
        interestDue,
        feeDue: 0,
        penaltyDue: 0,
        totalDue,
        principalPaid: 0,
        interestPaid: 0,
        feePaid: 0,
        penaltyPaid: 0,
        totalPaid: 0,
        status: 'PENDING',
      });
    }
  } else if (interestMethod === 'DECLINING_BALANCE') {
    // Declining Balance: Interest = current outstanding * periodicRate
    let balance = disbursedPrincipal;
    const regularPrincipal = roundCurrency(disbursedPrincipal / principalAmortizationTerms);
    let cumulativePrincipal = 0;

    for (let i = 1; i <= termInstallments; i++) {
      const isGrace = i <= gracePeriodInstallments;
      let interestDue = roundCurrency(balance * periodicRate);
      let principalDue = 0;

      if (!isGrace) {
        if (i === termInstallments) {
          principalDue = roundCurrency(disbursedPrincipal - cumulativePrincipal);
        } else {
          principalDue = regularPrincipal;
          cumulativePrincipal += principalDue;
        }
        balance = Math.max(0, balance - principalDue);
      } else if (gracePeriodType === 'PRINCIPAL_AND_INTEREST') {
        interestDue = 0;
      }

      const dueDate = addFrequencyPeriod(startDate, repaymentFrequency, i);
      const totalDue = roundCurrency(principalDue + interestDue);

      installments.push({
        id: `inst-${loanId}-${i}`,
        loanId,
        installmentNumber: i,
        dueDate,
        principalDue,
        interestDue,
        feeDue: 0,
        penaltyDue: 0,
        totalDue,
        principalPaid: 0,
        interestPaid: 0,
        feePaid: 0,
        penaltyPaid: 0,
        totalPaid: 0,
        status: 'PENDING',
      });
    }
  } else {
    // EQUAL_INSTALLMENT (Annuity / PMT)
    let balance = disbursedPrincipal;
    const pmt = calculateEqualInstallmentPMT(disbursedPrincipal, periodicRate, principalAmortizationTerms);
    let cumulativePrincipal = 0;

    for (let i = 1; i <= termInstallments; i++) {
      const isGrace = i <= gracePeriodInstallments;
      let interestDue = roundCurrency(balance * periodicRate);
      let principalDue = 0;

      if (!isGrace) {
        principalDue = roundCurrency(pmt - interestDue);
        if (i === termInstallments || principalDue > balance) {
          principalDue = roundCurrency(disbursedPrincipal - cumulativePrincipal);
        } else {
          cumulativePrincipal += principalDue;
        }
        balance = Math.max(0, balance - principalDue);
      } else if (gracePeriodType === 'PRINCIPAL_AND_INTEREST') {
        interestDue = 0;
      }

      const dueDate = addFrequencyPeriod(startDate, repaymentFrequency, i);
      const totalDue = roundCurrency(principalDue + interestDue);

      installments.push({
        id: `inst-${loanId}-${i}`,
        loanId,
        installmentNumber: i,
        dueDate,
        principalDue,
        interestDue,
        feeDue: 0,
        penaltyDue: 0,
        totalDue,
        principalPaid: 0,
        interestPaid: 0,
        feePaid: 0,
        penaltyPaid: 0,
        totalPaid: 0,
        status: 'PENDING',
      });
    }
  }

  return installments;
}
