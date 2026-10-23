import { describe, it, expect, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';
import {
  HealthResponseSchema,
  AppInfoResponseSchema,
  LoanCalculationResponseSchema
} from '@loanlens/shared';

describe('Backend API Endpoints', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/health returns 200 with valid HealthResponse schema', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('loanlens-backend');

    const parsed = HealthResponseSchema.parse(res.body);
    expect(parsed.status).toBe('ok');
  });

  it('GET /api returns 200 with metadata and 3 module definitions', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('LoanLens AI API');

    const parsed = AppInfoResponseSchema.parse(res.body);
    expect(parsed.modules.length).toBe(3);
    expect(parsed.modules.map((m) => m.title)).toEqual([
      'Loan Advisor',
      'Policy Assistant',
      'Agentic Pre-Screening'
    ]);
  });

  it('GET /api/unknown-endpoint returns 404 AppError JSON', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Route not found');
  });

  it('CORS permits configured frontend origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('CORS rejects unauthorized origin with 403', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://malicious-site.example.com');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('CORS origin');
  });

  describe('Loan Advisor API', () => {
    it('POST /api/loan-advisor/calculate calculates mortgage audit example with verified 25.43% DTI and 80.0% LTV', async () => {
      const payload = {
        principal: 400000,
        annualRate: 6.5,
        termMonths: 360,
        grossMonthlyIncome: 12500,
        existingMonthlyDebt: 650,
        assetValue: 500000,
        scenarioName: 'Audit Mortgage Scenario'
      };

      const res = await request(app)
        .post('/api/loan-advisor/calculate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.principal).toBe(400000);
      expect(res.body.monthlyEMI).toBe(2528.27);
      expect(res.body.totalRepayment).toBe(910179.81);
      expect(res.body.totalInterest).toBe(510179.81);

      // Verified DTI formula: (650 + 2528.27) / 12500 * 100 = 25.42616% => 25.43%
      expect(res.body.dti?.dtiPercentage).toBe(25.43);
      expect(res.body.dti?.riskTier).toBe('low_risk');

      // Verified LTV formula: 400000 / 500000 * 100 = 80.0%
      expect(res.body.ltv?.ltvPercentage).toBe(80.0);
      expect(res.body.ltv?.tier).toBe('standard');

      expect(res.body.persistenceStatus).toBe('saved');
      expect(res.body.calculationId).toBeDefined();

      const parsed = LoanCalculationResponseSchema.parse(res.body);
      expect(parsed.monthlyEMI).toBe(2528.27);
    });

    it('POST /api/loan-advisor/calculate accurately computes zero-interest promotional loans', async () => {
      const payload = {
        principal: 12000,
        annualRate: 0.0,
        termMonths: 24,
        scenarioName: 'Zero-Interest Promo'
      };

      const res = await request(app)
        .post('/api/loan-advisor/calculate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.monthlyEMI).toBe(500.0);
      expect(res.body.totalInterest).toBe(0.0);
      expect(res.body.totalRepayment).toBe(12000.0);
      expect(res.body.amortizationSchedule.length).toBe(24);
      expect(res.body.amortizationSchedule[23].closingBalance).toBe(0.0);
      expect(res.body.dti).toBeUndefined();
      expect(res.body.ltv).toBeUndefined();
    });

    it('POST /api/loan-advisor/calculate accurately handles database persistence failure gracefully without failing calculation', async () => {
      // Temporarily mock prisma.loanCalculation.create to simulate DB connection drop or failure
      const originalCreate = prisma.loanCalculation.create;
      vi.spyOn(prisma.loanCalculation, 'create').mockRejectedValueOnce(
        new Error('Simulated PostgreSQL write failure / constraint timeout')
      );

      const payload = {
        principal: 50000,
        annualRate: 5.0,
        termMonths: 60,
        scenarioName: 'DB Failure Resilience Test'
      };

      const res = await request(app)
        .post('/api/loan-advisor/calculate')
        .send(payload);

      // Calculation should succeed with HTTP 200
      expect(res.status).toBe(200);
      expect(res.body.principal).toBe(50000);
      expect(res.body.monthlyEMI).toBe(943.56);

      // Persistence status must explicitly report 'failed' and calculationId must be undefined
      expect(res.body.persistenceStatus).toBe('failed');
      expect(res.body.calculationId).toBeUndefined();

      // Restore mock
      vi.restoreAllMocks();
    });

    it('POST /api/loan-advisor/calculate rejects invalid negative or missing payload with 400', async () => {
      const invalidPayload = {
        principal: -5000,
        annualRate: 6.5
        // termMonths missing
      };

      const res = await request(app)
        .post('/api/loan-advisor/calculate')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
    });

    it('GET /api/loan-advisor/presets returns synthetic demo borrower presets', async () => {
      const res = await request(app).get('/api/loan-advisor/presets');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.presets)).toBe(true);
      expect(res.body.presets.length).toBe(3);
      expect(res.body.presets[0].name).toContain('Prime');
    });
  });

  describe('Policy Assistant API', () => {
    it('POST /api/policy-assistant/query retrieves current policy guidelines with verified citations', async () => {
      const res = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'What is the maximum allowed DTI ratio and required reserves?',
          audience: 'all'
        });

      expect(res.status).toBe(200);
      expect(res.body.hasSufficientEvidence).toBe(true);
      expect(res.body.citations.length).toBeGreaterThan(0);
      expect(res.body.citations[0].policyId).toBe('POL-DTI-001');
      expect(res.body.citations[0].version).toBe('2.1');
      expect(res.body.answer).toContain('POL-DTI-001');
      expect(res.body.disclaimer).toContain('Illustrative Demo Material');
    });

    it('POST /api/policy-assistant/query strictly excludes superseded policy POL-DTI-000-OLD', async () => {
      const res = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'legacy 50% debt obligations ratio pre-2024 superseded',
          audience: 'all'
        });

      expect(res.status).toBe(200);
      const citations = res.body.citations as Array<{ policyId: string }>;
      const hasSuperseded = citations.some((c) => c.policyId === 'POL-DTI-000-OLD');
      expect(hasSuperseded).toBe(false);
    });

    it('POST /api/policy-assistant/query strictly excludes future-effective draft policy POL-ESG-2028', async () => {
      const res = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'green energy solar home energy score 2028 draft',
          audience: 'all'
        });

      expect(res.status).toBe(200);
      const citations = res.body.citations as Array<{ policyId: string }>;
      const hasFuture = citations.some((c) => c.policyId === 'POL-ESG-2028');
      expect(hasFuture).toBe(false);
    });

    it('POST /api/policy-assistant/query enforces audience filtering on the server', async () => {
      // Manual review triggers (POL-REV-001) has audience 'underwriter'
      const borrowerRes = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'manual review triggers credit score 660 escalation',
          audience: 'borrower'
        });

      expect(borrowerRes.status).toBe(200);
      const borrowerCitations = borrowerRes.body.citations as Array<{ policyId: string }>;
      expect(borrowerCitations.some((c) => c.policyId === 'POL-REV-001')).toBe(false);

      const underwriterRes = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'manual review triggers credit score 660 escalation',
          audience: 'underwriter'
        });

      expect(underwriterRes.status).toBe(200);
      const underwriterCitations = underwriterRes.body.citations as Array<{ policyId: string }>;
      expect(underwriterCitations.some((c) => c.policyId === 'POL-REV-001')).toBe(true);
    });

    it('POST /api/policy-assistant/query returns honest no-evidence response for unsupported queries', async () => {
      const res = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'how to register an interstellar spaceship with bitcoin',
          audience: 'all'
        });

      expect(res.status).toBe(200);
      expect(res.body.hasSufficientEvidence).toBe(false);
      expect(res.body.citations.length).toBe(0);
      expect(res.body.answer).toContain('no active, applicable material');
    });

    it('POST /api/policy-assistant/query returns no-evidence for unsupported crypto staking collateral inquiry', async () => {
      const res = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'What is the policy for crypto staking collateral?',
          audience: 'all'
        });

      expect(res.status).toBe(200);
      expect(res.body.hasSufficientEvidence).toBe(false);
      expect(res.body.citations.length).toBe(0);
      expect(res.body.answer).toContain('no active, applicable material');
    });

    it('POST /api/policy-assistant/query prioritizes employment and document policies for self-employed borrower documents inquiry', async () => {
      const res = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'What documents must a self-employed borrower provide to verify income?',
          audience: 'all'
        });

      expect(res.status).toBe(200);
      expect(res.body.hasSufficientEvidence).toBe(true);
      const policyIds = (res.body.citations as Array<{ policyId: string }>).map((c) => c.policyId);

      expect(policyIds).toContain('POL-EMP-001');
      expect(policyIds).toContain('POL-DOC-001');
      expect(policyIds).not.toContain('POL-DTI-001');
    });

    it('POST /api/policy-assistant/query removes tangential LTV citations when querying specifically about maximum DTI', async () => {
      const res = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: 'What is the maximum DTI for a conventional prime loan?',
          audience: 'all'
        });

      expect(res.status).toBe(200);
      expect(res.body.hasSufficientEvidence).toBe(true);
      const policyIds = (res.body.citations as Array<{ policyId: string }>).map((c) => c.policyId);

      expect(policyIds).toContain('POL-DTI-001');
      expect(policyIds).not.toContain('POL-LTV-001');
    });

    it('POST /api/policy-assistant/query rejects empty or single-character query with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/policy-assistant/query')
        .send({
          query: ' '
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('GET /api/policy-assistant/policies returns policy catalog list', async () => {
      const res = await request(app).get('/api/policy-assistant/policies');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.policies)).toBe(true);
      expect(res.body.totalCount).toBeGreaterThanOrEqual(8);
    });

    it('GET /api/policy-assistant/sample-questions returns curated hackathon questions', async () => {
      const res = await request(app).get('/api/policy-assistant/sample-questions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.sampleQuestions)).toBe(true);
      expect(res.body.sampleQuestions.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Agentic Pre-Screening API', () => {
    it('POST /api/pre-screening/evaluate evaluates Case 1 as READY_FOR_REVIEW and persists record', async () => {
      const payload = {
        applicationId: 'APP-TEST-001',
        applicantName: 'Alice Walker (Synthetic Test)',
        principal: 300000,
        annualRate: 6.0,
        termMonths: 360,
        grossMonthlyIncome: 12000,
        existingMonthlyDebt: 600,
        assetValue: 450000,
        employmentType: 'salaried',
        employmentMonths: 48,
        creditScore: 750,
        documents: [
          { id: 'doc-gov-id', name: 'Government Photo ID', received: true, required: true, description: 'ID' },
          { id: 'doc-paystubs', name: 'Paystubs (30 Days)', received: true, required: true, description: 'Paystubs' },
          { id: 'doc-tax-returns', name: 'Tax Filings', received: true, required: true, description: 'Taxes' },
          { id: 'doc-bank-statements', name: 'Bank Statements', received: true, required: true, description: 'Bank' },
          { id: 'doc-credit-disclosure', name: 'Credit Disclosure', received: true, required: true, description: 'Consent' }
        ]
      };

      const res = await request(app)
        .post('/api/pre-screening/evaluate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.category).toBe('READY_FOR_REVIEW');
      expect(res.body.workflowStatus).toBe('pending');
      expect(res.body.documentAudit.allRequiredPresent).toBe(true);
      expect(res.body.calculation.monthlyEMI).toBe(1798.65);
      expect(res.body.calculation.dti.dtiPercentage).toBe(19.99);
      expect(res.body.calculation.ltv.ltvPercentage).toBe(66.67);
      expect(res.body.findings.length).toBeGreaterThan(0);
      expect(res.body.citations.length).toBeGreaterThan(0);
      expect(['persisted', 'failed']).toContain(res.body.persistenceStatus);
      if (res.body.persistenceStatus === 'persisted') {
        expect(res.body.recordId).toBeDefined();
      }
    });

    it('POST /api/pre-screening/evaluate evaluates missing documents application as NEEDS_INFORMATION', async () => {
      const payload = {
        applicationId: 'APP-TEST-002',
        applicantName: 'Bob Vance (Missing Docs Test)',
        principal: 380000,
        annualRate: 6.5,
        termMonths: 360,
        grossMonthlyIncome: 10000,
        existingMonthlyDebt: 500,
        employmentType: 'salaried',
        employmentMonths: 36,
        documents: [
          { id: 'doc-gov-id', name: 'Government Photo ID', received: true, required: true, description: 'ID' },
          { id: 'doc-paystubs', name: 'Paystubs', received: false, required: true, description: 'Paystubs' },
          { id: 'doc-tax-returns', name: 'Tax Filings', received: false, required: true, description: 'Taxes' }
        ]
      };

      const res = await request(app)
        .post('/api/pre-screening/evaluate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.category).toBe('NEEDS_INFORMATION');
      expect(res.body.documentAudit.allRequiredPresent).toBe(false);
      expect(res.body.documentAudit.missingRequired).toContain('Paystubs');
      expect(res.body.findings.some((f: { code: string }) => f.code === 'DOCS_MISSING')).toBe(true);
      expect(res.body.citations.some((c: { policyId: string }) => c.policyId === 'POL-DOC-002')).toBe(true);
    });

    it('POST /api/pre-screening/evaluate evaluates manual review trigger application as MANUAL_REVIEW', async () => {
      const payload = {
        applicationId: 'APP-TEST-003',
        applicantName: 'Charlie Low (Score Escalation Test)',
        principal: 400000,
        annualRate: 7.0,
        termMonths: 360,
        grossMonthlyIncome: 8000,
        existingMonthlyDebt: 600,
        employmentType: 'salaried',
        employmentMonths: 24,
        creditScore: 630, // Trigger: < 660
        documents: [
          { id: 'doc-gov-id', name: 'Government Photo ID', received: true, required: true, description: 'ID' }
        ]
      };

      const res = await request(app)
        .post('/api/pre-screening/evaluate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.category).toBe('MANUAL_REVIEW');
    });

    it('POST /api/pre-screening/evaluate handles database persistence failure gracefully without failing evaluation', async () => {
      const originalCreate = prisma.preScreeningRecord.create;
      (prisma.preScreeningRecord as any).create = vi
        .fn()
        .mockRejectedValueOnce(new Error('Simulated database write timeout'));

      const payload = {
        applicationId: 'APP-TEST-004',
        applicantName: 'Diana Prince (DB Resilience Test)',
        principal: 250000,
        annualRate: 5.5,
        termMonths: 360,
        grossMonthlyIncome: 9500,
        existingMonthlyDebt: 300,
        employmentType: 'salaried',
        employmentMonths: 30,
        documents: [
          { id: 'doc-gov-id', name: 'Government Photo ID', received: true, required: true, description: 'ID' }
        ]
      };

      try {
        const res = await request(app)
          .post('/api/pre-screening/evaluate')
          .send(payload);

        // Must succeed with 200 and explicitly report persistence failure
        expect(res.status).toBe(200);
        expect(res.body.persistenceStatus).toBe('failed');
        expect(res.body.recordId).toBeUndefined();
      } finally {
        prisma.preScreeningRecord.create = originalCreate;
      }
    });

    it('POST /api/pre-screening/evaluate rejects invalid inputs with 400 validation error', async () => {
      const invalidPayload = {
        applicantName: '', // empty name
        principal: -1000
      };

      const res = await request(app)
        .post('/api/pre-screening/evaluate')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('GET /api/pre-screening/presets returns synthetic demo applications', async () => {
      const res = await request(app).get('/api/pre-screening/presets');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.presets)).toBe(true);
      expect(res.body.presets.length).toBeGreaterThanOrEqual(3);
    });

    it('PATCH /api/pre-screening/:id/status updates workflow review status or returns 404', async () => {
      // Create a test record first
      const record = await prisma.preScreeningRecord.create({
        data: {
          applicationId: 'APP-PATCH-TEST',
          applicantName: 'Test Reviewer Case',
          category: 'READY_FOR_REVIEW',
          workflowStatus: 'pending',
          principal: 200000,
          annualRate: 5.0,
          termMonths: 240,
          grossIncome: 8000,
          monthlyDebt: 200,
          monthlyEMI: 1319.91,
          totalRepayment: 316778.4,
          totalInterest: 116778.4,
          dtiPercentage: 18.99,
          summary: 'Test summary',
          findings: [],
          citations: [],
          missingDocs: []
        }
      });

      const updateRes = await request(app)
        .patch(`/api/pre-screening/${record.id}/status`)
        .send({
          workflowStatus: 'reviewed',
          reviewerNotes: 'Verified clean credit and assets. Ready for underwriting committee.'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.workflowStatus).toBe('reviewed');
      expect(updateRes.body.reviewerNotes).toContain('Ready for underwriting committee');

      // Test 404 for non-existent record
      const notFoundRes = await request(app)
        .patch('/api/pre-screening/00000000-0000-0000-0000-000000000000/status')
        .send({ workflowStatus: 'needs_more_info' });

      expect(notFoundRes.status).toBe(404);
    });
  });
});

