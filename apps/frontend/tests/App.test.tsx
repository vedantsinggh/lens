import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App.tsx';

describe('Frontend App Dashboard Shell - Phase 3', () => {
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
        if (url.includes('/api/policy-assistant/query')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              query: 'What is the maximum allowable DTI ratio?',
              audience: 'all',
              hasSufficientEvidence: true,
              answer: 'Standard maximum DTI is 43.0% [POL-DTI-001 v2.1 - Section 4.1: Qualifying DTI Thresholds].',
              citations: [
                {
                  policyId: 'POL-DTI-001',
                  version: 'v2.1',
                  title: 'Debt-to-Income (DTI) Underwriting Limits',
                  section: 'Section 4.1: Qualifying DTI Thresholds',
                  audience: 'all',
                  category: 'eligibility',
                  effectiveDate: '2025-01-15',
                  relevanceScore: 0.88,
                  matchedExcerpt: 'Standard maximum allowable DTI for conventional conforming prime residential loans is 43.0%.',
                  fullContent: 'Standard maximum allowable DTI for conventional conforming prime residential loans is 43.0%.'
                }
              ],
              retrievalLatencyMs: 4,
              disclaimer: 'Synthetic Demonstration Material'
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

  it('renders LoanLens AI branding and phase 3 badge', async () => {
    render(<App />);
    expect(await screen.findByText('LoanLens AI')).toBeInTheDocument();
    expect(screen.getByText('Phase 3')).toBeInTheDocument();
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

  it('renders Policy Assistant as an active module with search input, citations, and disclaimer', async () => {
    render(<App />);
    expect(await screen.findByText('2. Grounded Policy Assistant')).toBeInTheDocument();
    expect(screen.getByText('Phase 3 Active')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask a question about DTI/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask Assistant/i })).toBeInTheDocument();

    // Verify rendered grounded answer and citation
    expect(await screen.findByText(/Grounded Policy Response/i)).toBeInTheDocument();
    expect(screen.getByText('POL-DTI-001')).toBeInTheDocument();
    expect(screen.getByText('Section 4.1: Qualifying DTI Thresholds')).toBeInTheDocument();
  });

  it('renders Agentic Pre-Screening as a clearly labelled placeholder for subsequent phase', async () => {
    render(<App />);
    expect(screen.getByText('3. Agentic Pre-Screening')).toBeInTheDocument();
    expect(screen.getByText('Phase 4 Placeholder')).toBeInTheDocument();

    const placeholders = screen.getAllByText(/Placeholder Ready for Phase 4/i);
    expect(placeholders.length).toBe(1);
  });
});
