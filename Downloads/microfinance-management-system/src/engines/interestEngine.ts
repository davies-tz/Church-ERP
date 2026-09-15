/**
 * Core Deterministic Interest Calculation Engine
 * Reference: Mambu & Apache Fineract Financial Standards
 */
import { DayCountConvention, InterestMethod, RepaymentFrequency } from '../types';

export interface InterestCalculationParams {
  principal: number;
  annualNominalRate: number; // e.g. 18 for 18%
  termInstallments: number;
  frequency: RepaymentFrequency;
  method: InterestMethod;
  dayCountConvention: DayCountConvention;
}

export function getPeriodsPerYear(frequency: RepaymentFrequency): number {
  switch (frequency) {
    case 'DAILY':
      return 365;
    case 'WEEKLY':
      return 52;
    case 'BIWEEKLY':
      return 26;
    case 'MONTHLY':
      return 12;
    default:
      return 12;
  }
}

export function getPeriodicRate(annualRatePercentage: number, frequency: RepaymentFrequency): number {
  const periods = getPeriodsPerYear(frequency);
  return (annualRatePercentage / 100) / periods;
}

/**
 * Calculates PMT (Equal Installment) annuity payment
 * PMT = P * [ r(1+r)^n ] / [ (1+r)^n - 1 ]
 */
export function calculateEqualInstallmentPMT(principal: number, periodicRate: number, numInstallments: number): number {
  if (periodicRate === 0) {
    return roundCurrency(principal / numInstallments);
  }
  const factor = Math.pow(1 + periodicRate, numInstallments);
  const pmt = principal * (periodicRate * factor) / (factor - 1);
  return roundCurrency(pmt);
}

/**
 * Rounding strictly to 2 decimal places (or 0 decimal for TZS standard)
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Format currency in Tanzanian Shillings (TZS)
 */
export function formatTZS(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
