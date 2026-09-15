/**
 * Core Payment & Allocation Engine
 * Enforces configurable cascade allocation, partial payment tracking,
 * and immutable payment reversals.
 */
import {
  Loan,
  LoanInstallment,
  Payment,
  PaymentAllocation,
  PaymentMethod,
} from '../types';
import { roundCurrency } from './interestEngine';

export interface PaymentExecutionResult {
  payment: Payment;
  updatedLoan: Loan;
  overpaymentAmount: number;
}

export function allocatePaymentToLoan(
  loan: Loan,
  amount: number,
  paymentMethod: PaymentMethod,
  channelRef: string,
  receivedBy: string,
  idempotencyKey: string,
  allocationStrategy: 'PENALTY_FEE_INTEREST_PRINCIPAL' | 'PRINCIPAL_INTEREST_FEE_PENALTY' = 'PENALTY_FEE_INTEREST_PRINCIPAL'
): PaymentExecutionResult {
  let remainingPayment = roundCurrency(amount);
  const allocations: PaymentAllocation[] = [];

  // Deep clone installments so we maintain purity
  const updatedInstallments: LoanInstallment[] = loan.installments.map(inst => ({ ...inst }));

  // Sort installments sequentially by installment number
  updatedInstallments.sort((a, b) => a.installmentNumber - b.installmentNumber);

  for (const inst of updatedInstallments) {
    if (remainingPayment <= 0) break;

    const penaltyUnpaid = roundCurrency(inst.penaltyDue - inst.penaltyPaid);
    const feeUnpaid = roundCurrency(inst.feeDue - inst.feePaid);
    const interestUnpaid = roundCurrency(inst.interestDue - inst.interestPaid);
    const principalUnpaid = roundCurrency(inst.principalDue - inst.principalPaid);

    const totalUnpaid = roundCurrency(penaltyUnpaid + feeUnpaid + interestUnpaid + principalUnpaid);
    if (totalUnpaid <= 0) {
      continue; // Already fully paid
    }

    let allocatedPenalty = 0;
    let allocatedFee = 0;
    let allocatedInterest = 0;
    let allocatedPrincipal = 0;

    if (allocationStrategy === 'PENALTY_FEE_INTEREST_PRINCIPAL') {
      // 1. Penalty
      if (penaltyUnpaid > 0 && remainingPayment > 0) {
        allocatedPenalty = Math.min(penaltyUnpaid, remainingPayment);
        remainingPayment = roundCurrency(remainingPayment - allocatedPenalty);
      }
      // 2. Fee
      if (feeUnpaid > 0 && remainingPayment > 0) {
        allocatedFee = Math.min(feeUnpaid, remainingPayment);
        remainingPayment = roundCurrency(remainingPayment - allocatedFee);
      }
      // 3. Interest
      if (interestUnpaid > 0 && remainingPayment > 0) {
        allocatedInterest = Math.min(interestUnpaid, remainingPayment);
        remainingPayment = roundCurrency(remainingPayment - allocatedInterest);
      }
      // 4. Principal
      if (principalUnpaid > 0 && remainingPayment > 0) {
        allocatedPrincipal = Math.min(principalUnpaid, remainingPayment);
        remainingPayment = roundCurrency(remainingPayment - allocatedPrincipal);
      }
    } else {
      // PRINCIPAL_INTEREST_FEE_PENALTY
      // 1. Principal
      if (principalUnpaid > 0 && remainingPayment > 0) {
        allocatedPrincipal = Math.min(principalUnpaid, remainingPayment);
        remainingPayment = roundCurrency(remainingPayment - allocatedPrincipal);
      }
      // 2. Interest
      if (interestUnpaid > 0 && remainingPayment > 0) {
        allocatedInterest = Math.min(interestUnpaid, remainingPayment);
        remainingPayment = roundCurrency(remainingPayment - allocatedInterest);
      }
      // 3. Fee
      if (feeUnpaid > 0 && remainingPayment > 0) {
        allocatedFee = Math.min(feeUnpaid, remainingPayment);
        remainingPayment = roundCurrency(remainingPayment - allocatedFee);
      }
      // 4. Penalty
      if (penaltyUnpaid > 0 && remainingPayment > 0) {
        allocatedPenalty = Math.min(penaltyUnpaid, remainingPayment);
        remainingPayment = roundCurrency(remainingPayment - allocatedPenalty);
      }
    }

    // Update installment paid totals
    inst.penaltyPaid = roundCurrency(inst.penaltyPaid + allocatedPenalty);
    inst.feePaid = roundCurrency(inst.feePaid + allocatedFee);
    inst.interestPaid = roundCurrency(inst.interestPaid + allocatedInterest);
    inst.principalPaid = roundCurrency(inst.principalPaid + allocatedPrincipal);
    inst.totalPaid = roundCurrency(inst.penaltyPaid + inst.feePaid + inst.interestPaid + inst.principalPaid);

    // Update status
    const remainingInInst = roundCurrency(inst.totalDue - inst.totalPaid);
    if (remainingInInst <= 0.01) {
      inst.status = 'PAID';
    } else {
      inst.status = 'PARTIALLY_PAID';
    }

    const totalAllocated = roundCurrency(allocatedPenalty + allocatedFee + allocatedInterest + allocatedPrincipal);
    if (totalAllocated > 0) {
      allocations.push({
        id: `alloc-${Date.now()}-${inst.installmentNumber}`,
        installmentId: inst.id,
        installmentNumber: inst.installmentNumber,
        allocatedPenalty,
        allocatedFee,
        allocatedInterest,
        allocatedPrincipal,
        totalAllocated,
      });
    }
  }

  // Recalculate loan-level outstanding balances
  let newOutstandingPrincipal = 0;
  let newOutstandingInterest = 0;
  let newOutstandingFees = 0;
  let newOutstandingPenalties = 0;

  for (const inst of updatedInstallments) {
    newOutstandingPrincipal += Math.max(0, inst.principalDue - inst.principalPaid);
    newOutstandingInterest += Math.max(0, inst.interestDue - inst.interestPaid);
    newOutstandingFees += Math.max(0, inst.feeDue - inst.feePaid);
    newOutstandingPenalties += Math.max(0, inst.penaltyDue - inst.penaltyPaid);
  }

  newOutstandingPrincipal = roundCurrency(newOutstandingPrincipal);
  newOutstandingInterest = roundCurrency(newOutstandingInterest);
  newOutstandingFees = roundCurrency(newOutstandingFees);
  newOutstandingPenalties = roundCurrency(newOutstandingPenalties);
  const newTotalOutstanding = roundCurrency(
    newOutstandingPrincipal + newOutstandingInterest + newOutstandingFees + newOutstandingPenalties
  );

  const receiptNumber = `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

  const payment: Payment = {
    id: `pay-${Date.now()}`,
    receiptNumber,
    loanId: loan.id,
    loanAccountNumber: loan.loanAccountNumber,
    customerName: loan.customerName,
    branchId: loan.branchId,
    amount,
    paymentMethod,
    channelReference: channelRef,
    paymentDate: new Date().toISOString(),
    receivedBy,
    idempotencyKey,
    isReversed: false,
    allocations,
  };

  const updatedLoan: Loan = {
    ...loan,
    outstandingPrincipal: newOutstandingPrincipal,
    outstandingInterest: newOutstandingInterest,
    outstandingFees: newOutstandingFees,
    outstandingPenalties: newOutstandingPenalties,
    totalOutstanding: newTotalOutstanding,
    status: newTotalOutstanding <= 0.01 ? 'PAID_OFF' : loan.status,
    installments: updatedInstallments,
  };

  return {
    payment,
    updatedLoan,
    overpaymentAmount: remainingPayment,
  };
}

/**
 * Reverse a payment: restores original installment balances and flags payment as reversed
 */
export function reversePayment(loan: Loan, payment: Payment, reversalReason: string, reversedBy: string): Loan {
  if (payment.isReversed) {
    throw new Error('Payment has already been reversed.');
  }

  const updatedInstallments = loan.installments.map(inst => {
    const alloc = payment.allocations.find(a => a.installmentId === inst.id);
    if (!alloc) return { ...inst };

    const principalPaid = roundCurrency(Math.max(0, inst.principalPaid - alloc.allocatedPrincipal));
    const interestPaid = roundCurrency(Math.max(0, inst.interestPaid - alloc.allocatedInterest));
    const feePaid = roundCurrency(Math.max(0, inst.feePaid - alloc.allocatedFee));
    const penaltyPaid = roundCurrency(Math.max(0, inst.penaltyPaid - alloc.allocatedPenalty));
    const totalPaid = roundCurrency(principalPaid + interestPaid + feePaid + penaltyPaid);

    let status: LoanInstallment['status'] = 'PENDING';
    if (totalPaid <= 0) {
      // Check if overdue
      const isPastDue = new Date(inst.dueDate) < new Date();
      status = isPastDue ? 'OVERDUE' : 'PENDING';
    } else if (totalPaid < inst.totalDue) {
      status = 'PARTIALLY_PAID';
    } else {
      status = 'PAID';
    }

    return {
      ...inst,
      principalPaid,
      interestPaid,
      feePaid,
      penaltyPaid,
      totalPaid,
      status,
    };
  });

  // Re-calculate totals
  let newOutstandingPrincipal = 0;
  let newOutstandingInterest = 0;
  let newOutstandingFees = 0;
  let newOutstandingPenalties = 0;

  for (const inst of updatedInstallments) {
    newOutstandingPrincipal += Math.max(0, inst.principalDue - inst.principalPaid);
    newOutstandingInterest += Math.max(0, inst.interestDue - inst.interestPaid);
    newOutstandingFees += Math.max(0, inst.feeDue - inst.feePaid);
    newOutstandingPenalties += Math.max(0, inst.penaltyDue - inst.penaltyPaid);
  }

  return {
    ...loan,
    outstandingPrincipal: roundCurrency(newOutstandingPrincipal),
    outstandingInterest: roundCurrency(newOutstandingInterest),
    outstandingFees: roundCurrency(newOutstandingFees),
    outstandingPenalties: roundCurrency(newOutstandingPenalties),
    totalOutstanding: roundCurrency(newOutstandingPrincipal + newOutstandingInterest + newOutstandingFees + newOutstandingPenalties),
    status: 'ACTIVE',
    installments: updatedInstallments,
  };
}
