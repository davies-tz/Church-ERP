/**
 * Deterministic Credit Risk Assessment Engine
 * Complies with Microfinance best-practices (DTI, cash flow, debt service capacity)
 */
import { LoanAssessment } from '../types';
import { roundCurrency } from './interestEngine';

export interface AssessmentInputs {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingMonthlyLoanObligations: number;
  requestedInstallmentAmount: number;
  repaymentHistoryRating: 'PERFECT' | 'MINOR_DELAY' | 'PRIOR_DEFAULT' | 'NEW_BORROWER';
  yearsInBusiness: number;
  groupStandingRating?: 'EXCELLENT' | 'GOOD' | 'POOR';
  collateralCoverageRatio: number; // e.g. 1.2 = 120%
}

export function evaluateCreditRisk(inputs: AssessmentInputs): {
  disposableIncome: number;
  debtToIncomeRatio: number;
  creditScore: number;
  riskGrade: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  recommendation: 'RECOMMEND_APPROVE' | 'RECOMMEND_REJECT' | 'CONDITIONALLY_APPROVE';
  notes: string;
} {
  const {
    monthlyIncome,
    monthlyExpenses,
    existingMonthlyLoanObligations,
    requestedInstallmentAmount,
    repaymentHistoryRating,
    yearsInBusiness,
    groupStandingRating,
    collateralCoverageRatio,
  } = inputs;

  const disposableIncome = roundCurrency(monthlyIncome - monthlyExpenses);
  const totalDebtService = existingMonthlyLoanObligations + requestedInstallmentAmount;
  const debtToIncomeRatio = monthlyIncome > 0
    ? roundCurrency((totalDebtService / monthlyIncome) * 100)
    : 100;

  // Base score 500 out of 1000
  let score = 500;

  // 1. Debt to Income impact
  if (debtToIncomeRatio <= 30) score += 180;
  else if (debtToIncomeRatio <= 45) score += 100;
  else if (debtToIncomeRatio <= 60) score += 20;
  else score -= 150;

  // 2. Repayment track record
  if (repaymentHistoryRating === 'PERFECT') score += 150;
  else if (repaymentHistoryRating === 'MINOR_DELAY') score += 50;
  else if (repaymentHistoryRating === 'NEW_BORROWER') score += 40;
  else if (repaymentHistoryRating === 'PRIOR_DEFAULT') score -= 220;

  // 3. Business maturity
  if (yearsInBusiness >= 3) score += 80;
  else if (yearsInBusiness >= 1) score += 40;
  else score += 10;

  // 4. Collateral / Savings guarantee
  if (collateralCoverageRatio >= 1.2) score += 70;
  else if (collateralCoverageRatio >= 1.0) score += 40;
  else score += 10;

  // 5. Group standing if applicable
  if (groupStandingRating === 'EXCELLENT') score += 50;
  else if (groupStandingRating === 'POOR') score -= 100;

  // Clamp score between 100 and 950
  score = Math.max(100, Math.min(950, score));

  let riskGrade: LoanAssessment['riskGrade'] = 'HIGH';
  let recommendation: LoanAssessment['recommendation'] = 'RECOMMEND_REJECT';
  let notes = '';

  if (score >= 750 && debtToIncomeRatio <= 45) {
    riskGrade = 'LOW';
    recommendation = 'RECOMMEND_APPROVE';
    notes = 'Strong cash flow buffer, sound debt service capacity, solid credit track record.';
  } else if (score >= 600 && debtToIncomeRatio <= 55) {
    riskGrade = 'MEDIUM';
    recommendation = 'RECOMMEND_APPROVE';
    notes = 'Acceptable risk tier with sustainable disposable income and adequate collateral cushion.';
  } else if (score >= 480 && debtToIncomeRatio <= 65) {
    riskGrade = 'HIGH';
    recommendation = 'CONDITIONALLY_APPROVE';
    notes = 'Elevated DTI or limited credit history; recommend mandatory compulsory savings collateral or reduced loan term.';
  } else {
    riskGrade = 'VERY_HIGH';
    recommendation = 'RECOMMEND_REJECT';
    notes = 'Debt-to-income exceeds prudential safety limits or high default likelihood detected.';
  }

  return {
    disposableIncome,
    debtToIncomeRatio,
    creditScore: score,
    riskGrade,
    recommendation,
    notes,
  };
}
