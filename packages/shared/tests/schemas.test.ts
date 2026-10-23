import { describe, it, expect } from 'vitest';
import { HealthResponseSchema, AppInfoResponseSchema, INITIAL_MODULES } from '../src/index.js';

describe('Shared Schemas', () => {
  it('validates a correct HealthResponse object', () => {
    const valid = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: 12.34,
      environment: 'development',
      service: 'loanlens-backend'
    };
    const parsed = HealthResponseSchema.parse(valid);
    expect(parsed.status).toBe('ok');
    expect(parsed.service).toBe('loanlens-backend');
  });

  it('rejects an invalid HealthResponse object with non-ok status', () => {
    const invalid = {
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: 10,
      environment: 'development',
      service: 'loanlens-backend'
    };
    expect(() => HealthResponseSchema.parse(invalid)).toThrow();
  });

  it('validates INITIAL_MODULES metadata against AppInfoResponseSchema', () => {
    const info = {
      name: 'LoanLens AI API',
      version: '0.1.0',
      description: 'Lending platform decision support system',
      modules: INITIAL_MODULES
    };
    const parsed = AppInfoResponseSchema.parse(info);
    expect(parsed.modules.length).toBe(3);
    expect(parsed.modules[0]?.title).toBe('Loan Advisor');
  });
});
