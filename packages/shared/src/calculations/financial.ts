/**
 * LoanLens AI - Deterministic Financial Math Engine
 *
 * Implements bank-grade, deterministic loan calculation formulas:
 * - Equated Monthly Installment (EMI) using standard actuarial reduction
 * - Zero-interest promotional loan handling (linear division, zero division-by-zero)
 * - Monthly Amortization Schedule with zero penny-leakage reconciliation
 * - Debt-to-Income (DTI) ratio with illustrative demo risk tier evaluation
 * - Loan-to-Value (LTV) ratio with illustrative demo collateral tier evaluation
 *
 * All functions are purely deterministic and free from non-deterministic AI alterations.
 *
 * Rounding Policy:
 * 1. Financial values are rounded using standard half-up rounding to two decimal places (cents/pence).
 * 2. In amortization schedules, the final monthly payment absorbs any cumulative penny differences
 *    such that total principal repaid equals the original principal exactly and the final closing
 *    balance reaches exactly 0.00.
 * 3. Total repayment is mathematically identical to the sum of all scheduled actual payments:
 *    totalRepayment = sum(schedule[i].payment).
 * 4. Total interest is mathematically identical to total repayment minus initial principal:
 *    totalInterestPaid = totalRepayment - totalPrincipalRepaid.
 */

export interface AmortizationRow {
  month: number;
  openingBalance: number;
  payment: number;
  principal: number;
  interest: number;
  closingBalance: number;
}

export interface AmortizationScheduleResult {
  schedule: AmortizationRow[];
  totalPrincipalRepaid: number;
  totalInterestPaid: number;
  totalRepayment: number;
}

export interface DTIEvaluation {
  dtiPercentage: number;
  riskTier: 'low_risk' | 'moderate_risk' | 'high_risk';
  description: string;
}

export interface LTVEvaluation {
  ltvPercentage: number;
  tier: 'standard' | 'elevated_pmi_required' | 'critical_risk';
  description: string;
}

export interface LoanQuoteResult {
  principal: number;
  annualRate: number;
  termMonths: number;
  monthlyEMI: number;
  totalRepayment: number;
  totalInterest: number;
  amortizationSchedule: AmortizationRow[];
  dti?: DTIEvaluation;
  ltv?: LTVEvaluation;
}

/**
 * Standard banking half-up rounding to two decimal places (cents/pence).
 * Resolves floating point inaccuracies like 0.1 + 0.2 = 0.30000000000000004.
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Validates basic loan parameters, throwing a descriptive Error if values are invalid.
 */
export function validateLoanInputs(principal: number, annualRate: number, termMonths: number): void {
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error(`Invalid loan principal: must be a positive number greater than 0, received ${principal}`);
  }
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) {
    throw new Error(`Invalid annual interest rate: must be between 0% and 100%, received ${annualRate}`);
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0 || termMonths > 600) {
    throw new Error(`Invalid loan term: must be an integer between 1 and 600 months, received ${termMonths}`);
  }
}

/**
 * Computes Equated Monthly Installment (EMI).
 *
 * Formula for rate > 0:
 *   r = annualRate / 100 / 12
 *   EMI = P * [r * (1 + r)^n] / [(1 + r)^n - 1]
 *
 * Formula for zero-interest loan (rate == 0):
 *   EMI = P / n
 */
export function calculateEMI(principal: number, annualRate: number, termMonths: number): number {
  validateLoanInputs(principal, annualRate, termMonths);

  if (annualRate === 0) {
    return roundCurrency(principal / termMonths);
  }

  const monthlyRate = annualRate / 100 / 12;
  const growthFactor = Math.pow(1 + monthlyRate, termMonths);
  const emi = (principal * monthlyRate * growthFactor) / (growthFactor - 1);

  return roundCurrency(emi);
}

/**
 * Generates a full monthly amortization schedule with exact penny-reconciliation.
 * The final month adjusts for any fractional penny rounding differences so that:
 * 1. Total principal repaid matches the original principal exactly.
 * 2. Final closing balance is precisely 0.00.
 * 3. Total repayment strictly equals the sum of all actual scheduled payments.
 * 4. Total interest strictly equals total repayment minus principal.
 */
export function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number
): AmortizationScheduleResult {
  validateLoanInputs(principal, annualRate, termMonths);

  const baseEmi = calculateEMI(principal, annualRate, termMonths);
  const monthlyRate = annualRate === 0 ? 0 : annualRate / 100 / 12;

  const schedule: AmortizationRow[] = [];
  let currentBalance = roundCurrency(principal);
  let totalPrincipalAccumulator = 0;

  for (let month = 1; month <= termMonths; month++) {
    const openingBalance = currentBalance;
    const interest = annualRate === 0 ? 0 : roundCurrency(openingBalance * monthlyRate);

    let principalPaid: number;
    let payment: number;
    let closingBalance: number;

    if (month === termMonths || openingBalance <= baseEmi) {
      // Final month or balance payoff adjustment
      principalPaid = openingBalance;
      payment = roundCurrency(principalPaid + interest);
      closingBalance = 0;
    } else {
      principalPaid = roundCurrency(baseEmi - interest);
      if (principalPaid <= 0) {
        principalPaid = 0.01;
      }
      payment = roundCurrency(principalPaid + interest);
      closingBalance = roundCurrency(openingBalance - principalPaid);
      if (closingBalance < 0.005) {
        closingBalance = 0;
      }
    }

    currentBalance = closingBalance;
    totalPrincipalAccumulator = roundCurrency(totalPrincipalAccumulator + principalPaid);

    schedule.push({
      month,
      openingBalance,
      payment,
      principal: principalPaid,
      interest,
      closingBalance
    });
  }

  const totalPrincipalRepaid = roundCurrency(totalPrincipalAccumulator);
  const totalRepayment = roundCurrency(schedule.reduce((acc, row) => acc + row.payment, 0));
  const totalInterestPaid = roundCurrency(totalRepayment - totalPrincipalRepaid);

  return {
    schedule,
    totalPrincipalRepaid,
    totalInterestPaid,
    totalRepayment
  };
}

/**
 * Computes Debt-to-Income (DTI) ratio.
 * Formula: (totalMonthlyDebt / grossMonthlyIncome) * 100
 *
 * NOTE: Risk tiers are illustrative demo guidelines only and do not represent
 * universal lending, legal, or regulatory standards.
 */
export function calculateDTI(totalMonthlyDebt: number, grossMonthlyIncome: number): DTIEvaluation {
  if (!Number.isFinite(grossMonthlyIncome) || grossMonthlyIncome <= 0) {
    throw new Error(`Gross monthly income must be a positive number greater than 0, received ${grossMonthlyIncome}`);
  }
  if (!Number.isFinite(totalMonthlyDebt) || totalMonthlyDebt < 0) {
    throw new Error(`Total monthly debt must be a non-negative number, received ${totalMonthlyDebt}`);
  }

  const dtiPercentage = roundCurrency((totalMonthlyDebt / grossMonthlyIncome) * 100);

  let riskTier: DTIEvaluation['riskTier'];
  let description: string;

  if (dtiPercentage <= 36) {
    riskTier = 'low_risk';
    description = 'Illustrative Demo Guideline (<= 36%): Healthy debt-to-income benchmark in standard credit models.';
  } else if (dtiPercentage <= 43) {
    riskTier = 'moderate_risk';
    description = 'Illustrative Demo Guideline (36.01% - 43%): Conforming boundary. Additional reserves or compensating factors may apply.';
  } else {
    riskTier = 'high_risk';
    description = 'Illustrative Demo Guideline (> 43%): Elevated debt burden exceeding typical standard benchmarks.';
  }

  return {
    dtiPercentage,
    riskTier,
    description
  };
}

/**
 * Computes Loan-to-Value (LTV) ratio.
 * Formula: (loanAmount / assetValue) * 100
 *
 * NOTE: Collateral tiers are illustrative demo guidelines only and do not represent
 * universal lending, legal, or regulatory standards.
 */
export function calculateLTV(loanAmount: number, assetValue: number): LTVEvaluation {
  if (!Number.isFinite(assetValue) || assetValue <= 0) {
    throw new Error(`Asset / collateral value must be greater than 0, received ${assetValue}`);
  }
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    throw new Error(`Loan amount must be greater than 0, received ${loanAmount}`);
  }

  const ltvPercentage = roundCurrency((loanAmount / assetValue) * 100);

  let tier: LTVEvaluation['tier'];
  let description: string;

  if (ltvPercentage <= 80) {
    tier = 'standard';
    description = 'Illustrative Demo Guideline (<= 80%): Standard equity cushion. Frequently exempt from private mortgage insurance.';
  } else if (ltvPercentage <= 95) {
    tier = 'elevated_pmi_required';
    description = 'Illustrative Demo Guideline (80.01% - 95%): Lower equity cushion. Mortgage insurance (PMI) commonly evaluated in conventional programs.';
  } else {
    tier = 'critical_risk';
    description = 'Illustrative Demo Guideline (> 95%): High collateral leverage. Typically requires specialized underwriting or extra credit enhancement.';
  }

  return {
    ltvPercentage,
    tier,
    description
  };
}

/**
 * Comprehensive loan quote generator combining all deterministic calculations.
 */
export function calculateLoanQuote(params: {
  principal: number;
  annualRate: number;
  termMonths: number;
  grossMonthlyIncome?: number;
  existingMonthlyDebt?: number;
  assetValue?: number;
}): LoanQuoteResult {
  const { principal, annualRate, termMonths, grossMonthlyIncome, existingMonthlyDebt, assetValue } = params;

  validateLoanInputs(principal, annualRate, termMonths);

  const scheduleResult = calculateAmortizationSchedule(principal, annualRate, termMonths);
  const baseEmi = calculateEMI(principal, annualRate, termMonths);

  let dti: DTIEvaluation | undefined;
  if (grossMonthlyIncome !== undefined && grossMonthlyIncome > 0) {
    // Formula: (existingMonthlyDebt + proposedEMI) / grossMonthlyIncome * 100
    const totalDebt = (existingMonthlyDebt || 0) + baseEmi;
    dti = calculateDTI(totalDebt, grossMonthlyIncome);
  }

  let ltv: LTVEvaluation | undefined;
  if (assetValue !== undefined && assetValue > 0) {
    ltv = calculateLTV(principal, assetValue);
  }

  return {
    principal: roundCurrency(principal),
    annualRate,
    termMonths,
    monthlyEMI: baseEmi,
    totalRepayment: scheduleResult.totalRepayment,
    totalInterest: scheduleResult.totalInterestPaid,
    amortizationSchedule: scheduleResult.schedule,
    dti,
    ltv
  };
}
