import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App.tsx';

describe('Frontend App Dashboard Shell', () => {
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

  it('renders LoanLens AI branding and phase 1 badge', async () => {
    render(<App />);
    expect(await screen.findByText('LoanLens AI')).toBeInTheDocument();
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
  });

  it('renders the three required module entry point cards as placeholders', async () => {
    render(<App />);
    expect(await screen.findByText('1. Loan Advisor')).toBeInTheDocument();
    expect(screen.getByText('2. Policy Assistant')).toBeInTheDocument();
    expect(screen.getByText('3. Agentic Pre-Screening')).toBeInTheDocument();

    const placeholders = screen.getAllByText(/Placeholder Ready/i);
    expect(placeholders.length).toBe(3);
  });
});
