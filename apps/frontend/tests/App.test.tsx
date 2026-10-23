import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App.tsx';

describe('Frontend App Dashboard Shell - Phase 4', () => {
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
        if (url.includes('/api/pre-screening/evaluate')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              recordId: 'audit-rec-1234',
              applicationId: 'APP-2026-0819',
              category: 'READY_FOR_REVIEW',
              summary: 'Application APP-2026-0819 satisfies all primary automated underwriting checks.',
              calculation: {
                monthlyEMI: 2155.01,
                totalRepayment: 775803.6,
                totalInterest: 425803.6,
                dti: {
                  dtiPercentage: 23.24,
                  riskTier: 'low_risk',
                  description: 'Prime DTI (<= 36%): Standard qualifying capacity.'
                },
                ltv: {
                  ltvPercentage: 70.0,
                  tier: 'standard',
                  description: 'Prime LTV (<= 80%): Standard equity position, PMI waived.'
                }
              },
              documentAudit: {
                allRequiredPresent: true,
                missingRequired: [],
                receivedCount: 5,
                totalRequiredCount: 5
              },
              findings: [
                {
                  code: 'DOCS_COMPLETE',
                  severity: 'info',
                  title: 'Documentation Complete',
                  message: 'All 5 mandatory verification documents received.',
                  relatedPolicyId: 'POL-DOC-001',
                  policySection: 'Section 5.1: Core Mandatory Application Documentation',
                  policyVersion: '2.1'
                }
              ],
              citations: [
                {
                  policyId: 'POL-DOC-001',
                  title: 'Mandatory Borrower Verification Documentation',
                  section: 'Section 5.1: Core Mandatory Application Documentation',
                  version: '2.1',
                  status: 'active',
                  effectiveDate: '2025-01-15',
                  audience: 'all',
                  relevanceScore: 0.95,
                  excerpt: 'All residential loan applications require core verification documents.'
                }
              ],
              persistenceStatus: 'persisted',
              workflowStatus: 'pending',
              disclaimer: 'Preliminary Screening Aid Only'
            })
          });
        }
        if (url.includes('/api/pre-screening/presets')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              presets: []
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
        return Promise.reject(new Error(`Unknown URL: ${url}`));
      })
    );
  });

  it('renders LoanLens AI branding and Phase 4 badge', async () => {
    render(<App />);
    expect(await screen.findByText('LoanLens AI')).toBeInTheDocument();
    expect(screen.getByText('Phase 4')).toBeInTheDocument();
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

  it('renders Agentic Pre-Screening as an active functional module with workflow controls', async () => {
    render(<App />);
    expect(await screen.findByText('Agentic Pre-Screening')).toBeInTheDocument();
    expect(screen.getByText('Phase 4 Active')).toBeInTheDocument();
    expect(screen.getByText('Human Decision Bound')).toBeInTheDocument();

    // Verify synthetic presets render
    expect(screen.getByText(/Case 1: Prime Salaried Conforming/i)).toBeInTheDocument();
    expect(screen.getByText(/Case 2: Self-Employed with Missing Documents/i)).toBeInTheDocument();

    // Verify preliminary classification and workflow controls render
    expect(await screen.findByText('READY FOR UNDERWRITER REVIEW')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark as Reviewed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request More Information/i })).toBeInTheDocument();
  });
});
