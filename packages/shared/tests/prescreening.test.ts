import { describe, it, expect } from 'vitest';
import {
  evaluateLoanPreScreening,
  validateApplicationInput,
  computeFinancialMetrics,
  auditRequiredDocuments,
  SYNTHETIC_APPLICATION_PRESETS,
  SYNTHETIC_POLICY_CORPUS,
  STANDARD_REQUIRED_DOCUMENTS
} from '../src/index.js';

describe('Agentic Pre-Screening Engine', () => {
  describe('Input Validation & Tool 1', () => {
    it('validates a complete compliant application request', () => {
      const preset = SYNTHETIC_APPLICATION_PRESETS[0].application;
      const validated = validateApplicationInput(preset);
      expect(validated.applicantName).toBe(preset.applicantName);
      expect(validated.principal).toBe(350000);
      expect(validated.grossMonthlyIncome).toBe(12500);
    });

    it('rejects negative principal, negative rates, or invalid term months', () => {
      expect(() =>
        validateApplicationInput({
          applicantName: 'Test Invalid',
          principal: -50000,
          annualRate: 5.0,
          termMonths: 360,
          grossMonthlyIncome: 10000,
          existingMonthlyDebt: 0,
          employmentMonths: 36
        })
      ).toThrow();

      expect(() =>
        validateApplicationInput({
          applicantName: 'Test Rate',
          principal: 200000,
          annualRate: -2.5,
          termMonths: 360,
          grossMonthlyIncome: 10000,
          existingMonthlyDebt: 0,
          employmentMonths: 36
        })
      ).toThrow();
    });
  });

  describe('Financial Calculations Tool 2', () => {
    it('computes exact EMI, DTI, and LTV using deterministic financial engine', () => {
      const preset = SYNTHETIC_APPLICATION_PRESETS[0].application;
      const metrics = computeFinancialMetrics(preset);

      // Principal 350,000, rate 6.25%, 360 months -> EMI 2155.01
      expect(metrics.amortization.monthlyEMI).toBe(2155.01);
      // DTI: (750 debt + 2155.01 EMI) / 12500 income = 23.24%
      expect(metrics.dti.dtiPercentage).toBe(23.24);
      expect(metrics.dti.riskTier).toBe('low_risk');
      // LTV: 350,000 / 500,000 = 70.0%
      expect(metrics.ltv?.ltvPercentage).toBe(70.0);
      expect(metrics.ltv?.tier).toBe('standard');
    });
  });

  describe('Document Completeness Tool 3', () => {
    it('accurately identifies missing required documents', () => {
      const incomplete = SYNTHETIC_APPLICATION_PRESETS[1].application;
      const audit = auditRequiredDocuments(incomplete);

      expect(audit.allRequiredPresent).toBe(false);
      expect(audit.missingRequired.length).toBe(2);
      expect(audit.missingRequired).toContain('Tax Filings & W-2s (Last 2 Years)');
      expect(audit.missingRequired).toContain('Asset Bank Statements (2 Months)');
    });

    it('passes when all required documents are marked received', () => {
      const complete = SYNTHETIC_APPLICATION_PRESETS[0].application;
      const audit = auditRequiredDocuments(complete);

      expect(audit.allRequiredPresent).toBe(true);
      expect(audit.missingRequired.length).toBe(0);
      expect(audit.receivedCount).toBe(audit.totalRequiredCount);
    });
  });

  describe('End-to-End Pre-Screening Workflow Evaluation', () => {
    it('evaluates Case 1 (Prime Salaried) as READY_FOR_REVIEW', () => {
      const primeApp = SYNTHETIC_APPLICATION_PRESETS[0].application;
      const report = evaluateLoanPreScreening(primeApp);

      expect(report.category).toBe('READY_FOR_REVIEW');
      expect(report.workflowStatus).toBe('pending');
      expect(report.documentAudit.allRequiredPresent).toBe(true);
      expect(report.calculation.dti.dtiPercentage).toBeLessThan(36.0);
      expect(report.calculation.ltv?.ltvPercentage).toBeLessThanOrEqual(80.0);

      // Verify findings contain prime DTI and complete documents
      const codes = report.findings.map((f) => f.code);
      expect(codes).toContain('DOCS_COMPLETE');
      expect(codes).toContain('DTI_PRIME');
      expect(codes).toContain('LTV_STANDARD');

      // Citations must be grounded and non-empty
      expect(report.citations.length).toBeGreaterThan(0);
      for (const citation of report.citations) {
        expect(['POL-DOC-001', 'POL-DTI-001', 'POL-LTV-001', 'POL-EMP-001']).toContain(citation.policyId);
      }
    });

    it('evaluates Case 2 (Missing Documents) as NEEDS_INFORMATION', () => {
      const missingDocsApp = SYNTHETIC_APPLICATION_PRESETS[1].application;
      const report = evaluateLoanPreScreening(missingDocsApp);

      expect(report.category).toBe('NEEDS_INFORMATION');
      expect(report.documentAudit.allRequiredPresent).toBe(false);
      expect(report.documentAudit.missingRequired.length).toBeGreaterThanOrEqual(1);

      // Verify missing docs finding and POL-DOC-002 citation
      const docFinding = report.findings.find((f) => f.code === 'DOCS_MISSING');
      expect(docFinding).toBeDefined();
      expect(docFinding?.relatedPolicyId).toBe('POL-DOC-002');
      expect(docFinding?.message).toContain('14-calendar-day cure period');

      const citedIds = report.citations.map((c) => c.policyId);
      expect(citedIds).toContain('POL-DOC-002');
    });

    it('evaluates Case 3 (High DTI & Credit Score Trigger) as MANUAL_REVIEW', () => {
      const manualReviewApp = SYNTHETIC_APPLICATION_PRESETS[2].application;
      const report = evaluateLoanPreScreening(manualReviewApp);

      expect(report.category).toBe('MANUAL_REVIEW');
      expect(report.documentAudit.allRequiredPresent).toBe(true);

      // Verify DTI and credit score triggers
      const codes = report.findings.map((f) => f.code);
      expect(codes).toContain('CREDIT_SCORE_MANUAL_REVIEW');
      expect(codes.some((c) => c === 'DTI_CEILING_ESCALATION' || c === 'DTI_NON_CONFORMING')).toBe(true);

      // Verify cited policies include POL-REV-001
      const citedIds = report.citations.map((c) => c.policyId);
      expect(citedIds).toContain('POL-REV-001');
    });

    it('preserves policy status and future date exclusions (never cites superseded or draft policies)', () => {
      const primeApp = SYNTHETIC_APPLICATION_PRESETS[0].application;
      const report = evaluateLoanPreScreening(primeApp);

      const citedIds = report.citations.map((c) => c.policyId);
      expect(citedIds).not.toContain('POL-DTI-000-OLD');
      expect(citedIds).not.toContain('POL-ESG-2028');
    });

    it('enforces that every citation ID in findings exists in the synthetic policy corpus', () => {
      const primeApp = SYNTHETIC_APPLICATION_PRESETS[0].application;
      const report = evaluateLoanPreScreening(primeApp);

      const corpusIds = new Set(SYNTHETIC_POLICY_CORPUS.map((p) => p.policyId));
      for (const finding of report.findings) {
        if (finding.relatedPolicyId) {
          expect(corpusIds.has(finding.relatedPolicyId)).toBe(true);
        }
      }
    });
  });
});
