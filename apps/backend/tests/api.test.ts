import { describe, it, expect, afterAll } from 'vitest';
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
    it('POST /api/loan-advisor/calculate calculates standard loan quote and returns 200', async () => {
      const payload = {
        principal: 400000,
        annualRate: 6.5,
        termMonths: 360,
        grossMonthlyIncome: 12000,
        existingMonthlyDebt: 650,
        assetValue: 500000,
        scenarioName: 'Test Conforming Mortgage'
      };

      const res = await request(app)
        .post('/api/loan-advisor/calculate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.principal).toBe(400000);
      expect(res.body.monthlyEMI).toBe(2528.27);
      expect(res.body.amortizationSchedule.length).toBe(360);
      expect(res.body.amortizationSchedule[359].closingBalance).toBe(0.0);
      expect(res.body.dti?.dtiPercentage).toBe(26.49);
      expect(res.body.ltv?.ltvPercentage).toBe(80.0);

      // Validate strict schema conformance
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
      expect(res.body.dti).toBeUndefined();
      expect(res.body.ltv).toBeUndefined();
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
});
