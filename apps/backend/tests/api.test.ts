import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { HealthResponseSchema, AppInfoResponseSchema } from '@loanlens/shared';

describe('Backend API Endpoints', () => {
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
});
