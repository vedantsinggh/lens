import { describe, it, expect } from 'vitest';
import {
  calculateEMI,
  calculateAmortizationSchedule,
  calculateDTI,
  calculateLTV,
  calculateLoanQuote,
  roundCurrency
} from '../src/index.js';

describe('Financial Math Engine - Unit Tests & Audit Invariants', () => {
  describe('calculateEMI', () => {
    it('calculates accurate EMI for standard positive-interest 30-year fixed loan ($400,000 at 6.5% for 360 months)', () => {
      // Standard financial formula:
      // P = 400000, r = 0.065 / 12 = 0.005416666666666667, n = 360
      // EMI = 400000 * [r*(1+r)^360] / [(1+r)^360 - 1] = 2528.27
      const emi = calculateEMI(400000, 6.5, 360);
      expect(emi).toBe(2528.27);
    });

    it('calculates accurate EMI for a 5-year auto loan ($30,000 at 5% for 60 months)', () => {
      const emi = calculateEMI(30000, 5, 60);
      expect(emi).toBe(566.14);
    });

    it('handles zero-interest loan without division-by-zero errors ($12,000 at 0% for 24 months)', () => {
      // Linear division: 12000 / 24 = 500.00
      const emi = calculateEMI(12000, 0, 24);
      expect(emi).toBe(500.0);
    });

    it('rejects invalid inputs: negative or zero principal', () => {
      expect(() => calculateEMI(-1000, 5, 36)).toThrow(/Invalid loan principal/);
      expect(() => calculateEMI(0, 5, 36)).toThrow(/Invalid loan principal/);
    });

    it('rejects invalid inputs: negative or excessive rate', () => {
      expect(() => calculateEMI(10000, -2, 36)).toThrow(/Invalid annual interest rate/);
      expect(() => calculateEMI(10000, 150, 36)).toThrow(/Invalid annual interest rate/);
    });

    it('rejects invalid inputs: non-integer or zero term', () => {
      expect(() => calculateEMI(10000, 5, 0)).toThrow(/Invalid loan term/);
      expect(() => calculateEMI(10000, 5, -12)).toThrow(/Invalid loan term/);
      expect(() => calculateEMI(10000, 5, 12.5)).toThrow(/Invalid loan term/);
    });
  });

  describe('Amortization Schedule Invariants & Rounding Integrity', () => {
    it('satisfies all 4 financial invariants on standard 30-year conforming mortgage ($400,000 @ 6.5%, 360M)', () => {
      const principal = 400000;
      const rate = 6.5;
      const term = 360;

      const result = calculateAmortizationSchedule(principal, rate, term);

      // Invariant 1: Sum of all actual scheduled payments equals totalRepayment exactly
      const sumPayments = roundCurrency(result.schedule.reduce((acc, row) => acc + row.payment, 0));
      expect(sumPayments).toBe(result.totalRepayment);

      // Invariant 2: Total interest paid equals totalRepayment minus principal exactly
      const expectedInterest = roundCurrency(result.totalRepayment - principal);
      expect(result.totalInterestPaid).toBe(expectedInterest);

      // Invariant 3: Sum of all principal paid across all months equals initial principal exactly
      const sumPrincipalPaid = roundCurrency(result.schedule.reduce((acc, row) => acc + row.principal, 0));
      expect(sumPrincipalPaid).toBe(principal);
      expect(result.totalPrincipalRepaid).toBe(principal);

      // Invariant 4: Final closing balance reaches exactly 0.00 with zero penny leakage
      const finalMonth = result.schedule[result.schedule.length - 1];
      expect(finalMonth?.closingBalance).toBe(0.0);

      // Verify regular EMI is rounded to 2 decimal places
      const baseEmi = calculateEMI(principal, rate, term);
      expect(result.schedule[0]?.payment).toBe(baseEmi);
      // Final month adjusted payment accommodates penny reconciliation
      expect(finalMonth?.payment).toBe(roundCurrency(finalMonth!.principal + finalMonth!.interest));
    });

    it('satisfies all 4 financial invariants on zero-interest promotional loan ($12,000 @ 0%, 24M)', () => {
      const principal = 12000;
      const rate = 0.0;
      const term = 24;

      const result = calculateAmortizationSchedule(principal, rate, term);

      // Invariant 1: Sum of payments equals totalRepayment
      const sumPayments = roundCurrency(result.schedule.reduce((acc, row) => acc + row.payment, 0));
      expect(sumPayments).toBe(12000.0);
      expect(result.totalRepayment).toBe(12000.0);

      // Invariant 2: Total interest paid is exactly 0.00
      expect(result.totalInterestPaid).toBe(0.0);
      expect(result.totalInterestPaid).toBe(roundCurrency(result.totalRepayment - principal));

      // Invariant 3: Sum of principal repaid equals principal
      expect(result.totalPrincipalRepaid).toBe(12000.0);

      // Invariant 4: Final closing balance is exactly 0.00
      expect(result.schedule[23]?.closingBalance).toBe(0.0);

      // Every month payment and principal is exactly 500.00 with 0 interest
      for (const row of result.schedule) {
        expect(row.interest).toBe(0.0);
        expect(row.payment).toBe(500.0);
        expect(row.principal).toBe(500.0);
      }
    });

    it('satisfies invariants on irregular odd principal and interest rate ($275,432.89 @ 6.875%, 180M)', () => {
      const principal = 275432.89;
      const rate = 6.875;
      const term = 180;

      const result = calculateAmortizationSchedule(principal, rate, term);

      const sumPayments = roundCurrency(result.schedule.reduce((acc, row) => acc + row.payment, 0));
      expect(sumPayments).toBe(result.totalRepayment);

      const sumPrincipal = roundCurrency(result.schedule.reduce((acc, row) => acc + row.principal, 0));
      expect(sumPrincipal).toBe(roundCurrency(principal));

      expect(result.totalInterestPaid).toBe(roundCurrency(result.totalRepayment - principal));
      expect(result.schedule[term - 1]?.closingBalance).toBe(0.0);
    });
  });

  describe('DTI (Debt-to-Income) & Mortgage Example Audit', () => {
    it('verifies reported mortgage example: $400,000 @ 6.5%, 360M, $12,500 income, $650 debt produces exact DTI of 25.43%', () => {
      // 1. Calculate EMI
      const emi = calculateEMI(400000, 6.5, 360);
      expect(emi).toBe(2528.27);

      // 2. Formula: (existingMonthlyDebt + proposedEMI) / grossMonthlyIncome * 100
      const existingMonthlyDebt = 650;
      const grossMonthlyIncome = 12500;
      const totalDebt = existingMonthlyDebt + emi; // 650 + 2528.27 = 3178.27
      expect(totalDebt).toBe(3178.27);

      // 3. DTI = (3178.27 / 12500) * 100 = 25.42616% => rounded = 25.43%
      const dtiResult = calculateDTI(totalDebt, grossMonthlyIncome);
      expect(dtiResult.dtiPercentage).toBe(25.43);
      expect(dtiResult.riskTier).toBe('low_risk');
      expect(dtiResult.description).toContain('Illustrative Demo Guideline');
    });

    it('evaluates low risk for DTI <= 36%', () => {
      const result = calculateDTI(2500, 10000);
      expect(result.dtiPercentage).toBe(25);
      expect(result.riskTier).toBe('low_risk');
    });

    it('evaluates moderate risk for DTI between 36.01% and 43%', () => {
      const result = calculateDTI(4000, 10000);
      expect(result.dtiPercentage).toBe(40);
      expect(result.riskTier).toBe('moderate_risk');
    });

    it('evaluates high risk for DTI > 43%', () => {
      const result = calculateDTI(5000, 10000);
      expect(result.dtiPercentage).toBe(50);
      expect(result.riskTier).toBe('high_risk');
    });

    it('throws on invalid non-positive income', () => {
      expect(() => calculateDTI(1000, 0)).toThrow(/Gross monthly income must be a positive number/);
      expect(() => calculateDTI(1000, -5000)).toThrow(/Gross monthly income must be a positive number/);
    });
  });

  describe('LTV (Loan-to-Value) & Illustrative Guidelines', () => {
    it('evaluates standard tier for LTV <= 80%', () => {
      const result = calculateLTV(400000, 500000);
      expect(result.ltvPercentage).toBe(80);
      expect(result.tier).toBe('standard');
      expect(result.description).toContain('Illustrative Demo Guideline');
    });

    it('evaluates elevated PMI required tier for LTV between 80.01% and 95%', () => {
      const result = calculateLTV(450000, 500000);
      expect(result.ltvPercentage).toBe(90);
      expect(result.tier).toBe('elevated_pmi_required');
    });

    it('evaluates critical risk tier for LTV > 95%', () => {
      const result = calculateLTV(490000, 500000);
      expect(result.ltvPercentage).toBe(98);
      expect(result.tier).toBe('critical_risk');
    });

    it('throws on invalid collateral asset value', () => {
      expect(() => calculateLTV(100000, 0)).toThrow(/Asset \/ collateral value must be greater than 0/);
      expect(() => calculateLTV(100000, -50000)).toThrow(/Asset \/ collateral value must be greater than 0/);
    });
  });

  describe('calculateLoanQuote Integration', () => {
    it('produces verified full quote matching the reported mortgage scenario', () => {
      const quote = calculateLoanQuote({
        principal: 400000,
        annualRate: 6.5,
        termMonths: 360,
        grossMonthlyIncome: 12500,
        existingMonthlyDebt: 650,
        assetValue: 500000
      });

      expect(quote.principal).toBe(400000);
      expect(quote.monthlyEMI).toBe(2528.27);
      expect(quote.totalRepayment).toBe(910179.81);
      expect(quote.totalInterest).toBe(510179.81);
      expect(quote.dti?.dtiPercentage).toBe(25.43);
      expect(quote.ltv?.ltvPercentage).toBe(80.0);
      expect(quote.amortizationSchedule.length).toBe(360);
      expect(quote.amortizationSchedule[359]?.closingBalance).toBe(0.0);
    });
  });
});
