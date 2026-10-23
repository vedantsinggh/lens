import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App.tsx';

describe('Frontend App Dashboard Shell - Phase 2', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/health')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              status: 'ok',
              timestamp: '2026-10-23T09:00:00.000Z',
              uptime: 10,
              environment: 'test',
              service: 'loanlens-backend'
            })
          });
        }
        if (url.includes('/api/loan-advisor/calculate')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              calculationId: 'test-calc-1234',
              principal: 400000,
              annualRate: 6.5,
              termMonths: 360,
              monthlyEMI: 2528.27,
              totalRepayment: 910177.2,
              totalInterest: 510177.2,
              amortizationSchedule: [
                {
                  month: 1,
                  openingBalance: 400000,
                  payment: 2528.27,
                  principal: 361.6,
                  interest: 2166.67,
                  closingBalance: 399638.4
                }
              ],
              dti: {
                dtiPercentage: 25.43,
                riskTier: 'low_risk',
                description: 'Prime DTI (<= 36%): Excellent capacity for repayment.'
              },
              ltv: {
                ltvPercentage: 80.0,
                tier: 'standard',
                description: 'Standard LTV (<= 80%): Sufficient equity cushion.'
              }
            })
          });
        }
        if (url.includes('/api')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              name: 'LoanLens AI API',
              version: '0.1.0',
              description: 'Intelligent Lending Platform',
              modules: []
            })
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      })
    );
  });

  it('renders LoanLens AI branding and phase 2 badge', async () => {
    render(<App />);
    expect(await screen.findByText('LoanLens AI')).toBeInTheDocument();
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
  });

  it('renders Loan Advisor as a functional module with calculation inputs and results', async () => {
    render(<App />);
    expect(await screen.findByText('1. Loan Advisor')).toBeInTheDocument();
    expect(screen.getByText('Phase 2 Live')).toBeInTheDocument();
    expect(screen.getByLabelText(/Loan Principal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Annual Nominal Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Calculate Loan Terms/i)).toBeInTheDocument();

    // Verify calculated EMI renders from API response
    expect(await screen.findByText('$2,528.27')).toBeInTheDocument();
  });

  it('renders Policy Assistant and Agentic Pre-Screening as clearly labelled placeholders', async () => {
    render(<App />);
    expect(await screen.findByText('2. Policy Assistant')).toBeInTheDocument();
    expect(screen.getByText('3. Agentic Pre-Screening')).toBeInTheDocument();

    const placeholders = screen.getAllByText(/Placeholder Ready/i);
    expect(placeholders.length).toBe(2);
  });
});
