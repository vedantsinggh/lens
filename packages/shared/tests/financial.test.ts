import { describe, it, expect } from 'vitest';
import {
  calculateEMI,
  calculateAmortizationSchedule,
  calculateDTI,
  calculateLTV,
  calculateLoanQuote,
  validateLoanInputs,
  roundCurrency
} from '../src/index.js';

describe('Financial Math Engine - Unit Tests', () => {
  describe('calculateEMI', () => {
    it('calculates accurate EMI for standard positive-interest 30-year fixed loan ($400,000 at 6.5% for 360 months)', () => {
      // Standard financial formula:
      // P = 400000, r = 0.065 / 12 = 0.005416666666666667, n = 360
      // EMI = 400000 * [r*(1+r)^360] / [(1+r)^360 - 1] = 2528.27
      const emi = calculateEMI(400000, 6.5, 360);
      expect(emi).toBe(2528.27);
    });

    it('calculates accurate EMI for a 5-year auto loan ($30,000 at 5% for 60 months)', () => {
      // EMI = 30000 * (0.05/12 * 1.05^(60/12)...) = 566.14
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

  describe('calculateAmortizationSchedule', () => {
    it('produces an amortization schedule where final closing balance is exactly 0.00', () => {
      const result = calculateAmortizationSchedule(100000, 7.5, 36);
      expect(result.schedule.length).toBe(36);

      const lastRow = result.schedule[35];
      expect(lastRow?.closingBalance).toBe(0.0);

      // Verify no negative balances throughout schedule
      for (const row of result.schedule) {
        expect(row.openingBalance).toBeGreaterThan(0);
        expect(row.closingBalance).toBeGreaterThanOrEqual(0);
        expect(row.principal).toBeGreaterThan(0);
        expect(row.payment).toBeGreaterThan(0);
      }
    });

    it('reconciles total principal repaid to exactly match original principal (zero penny leakage)', () => {
      const principal = 275432.89;
      const result = calculateAmortizationSchedule(principal, 6.875, 180);

      // Exact floating point round reconciliation
      expect(roundCurrency(result.totalPrincipalRepaid)).toBe(roundCurrency(principal));
      expect(result.schedule[result.schedule.length - 1]?.closingBalance).toBe(0.0);
    });

    it('handles zero-interest loan amortization schedule accurately', () => {
      const result = calculateAmortizationSchedule(6000, 0, 12);
      expect(result.schedule.length).toBe(12);
      expect(result.totalInterestPaid).toBe(0.0);
      expect(result.totalPrincipalRepaid).toBe(6000.0);
      expect(result.totalRepayment).toBe(6000.0);

      for (const row of result.schedule) {
        expect(row.interest).toBe(0.0);
        expect(row.payment).toBe(500.0);
        expect(row.principal).toBe(500.0);
      }
      expect(result.schedule[11]?.closingBalance).toBe(0.0);
    });
  });

  describe('calculateDTI (Debt-to-Income)', () => {
    it('evaluates low risk for DTI <= 36%', () => {
      // $2,500 debt on $10,000 monthly income = 25%
      const result = calculateDTI(2500, 10000);
      expect(result.dtiPercentage).toBe(25);
      expect(result.riskTier).toBe('low_risk');
    });

    it('evaluates moderate risk for DTI between 36.01% and 43%', () => {
      // $4,000 debt on $10,000 monthly income = 40%
      const result = calculateDTI(4000, 10000);
      expect(result.dtiPercentage).toBe(40);
      expect(result.riskTier).toBe('moderate_risk');
    });

    it('evaluates high risk for DTI > 43%', () => {
      // $5,000 debt on $10,000 monthly income = 50%
      const result = calculateDTI(5000, 10000);
      expect(result.dtiPercentage).toBe(50);
      expect(result.riskTier).toBe('high_risk');
    });

    it('throws on invalid non-positive income', () => {
      expect(() => calculateDTI(1000, 0)).toThrow(/Gross monthly income must be a positive number/);
      expect(() => calculateDTI(1000, -5000)).toThrow(/Gross monthly income must be a positive number/);
    });
  });

  describe('calculateLTV (Loan-to-Value)', () => {
    it('evaluates standard tier for LTV <= 80%', () => {
      // $400,000 loan on $500,000 home = 80%
      const result = calculateLTV(400000, 500000);
      expect(result.ltvPercentage).toBe(80);
      expect(result.tier).toBe('standard');
    });

    it('evaluates elevated PMI required tier for LTV between 80.01% and 95%', () => {
      // $450,000 loan on $500,000 home = 90%
      const result = calculateLTV(450000, 500000);
      expect(result.ltvPercentage).toBe(90);
      expect(result.tier).toBe('elevated_pmi_required');
    });

    it('evaluates critical risk tier for LTV > 95%', () => {
      // $490,000 loan on $500,000 home = 98%
      const result = calculateLTV(490000, 500000);
      expect(result.ltvPercentage).toBe(98);
      expect(result.tier).toBe('critical_risk');
    });

    it('throws on invalid collateral asset value', () => {
      expect(() => calculateLTV(100000, 0)).toThrow(/Asset \/ collateral value must be greater than 0/);
      expect(() => calculateLTV(100000, -50000)).toThrow(/Asset \/ collateral value must be greater than 0/);
    });
  });

  describe('calculateLoanQuote', () => {
    it('produces a full quote with EMI, total interest, total repayment, DTI and LTV', () => {
      const quote = calculateLoanQuote({
        principal: 300000,
        annualRate: 6.0,
        termMonths: 360,
        grossMonthlyIncome: 10000,
        existingMonthlyDebt: 500,
        assetValue: 400000
      });

      expect(quote.principal).toBe(300000);
      expect(quote.monthlyEMI).toBe(1798.65);
      expect(quote.totalRepayment).toBeGreaterThan(300000);
      expect(quote.totalInterest).toBe(roundCurrency(quote.totalRepayment - 300000));
      expect(quote.amortizationSchedule.length).toBe(360);

      // Total debt = 500 existing + 1798.65 EMI = 2298.65 => DTI = 22.99% (low_risk)
      expect(quote.dti?.dtiPercentage).toBe(22.99);
      expect(quote.dti?.riskTier).toBe('low_risk');

      // LTV = 300000 / 400000 = 75% (standard)
      expect(quote.ltv?.ltvPercentage).toBe(75);
      expect(quote.ltv?.tier).toBe('standard');
    });
  });
});
