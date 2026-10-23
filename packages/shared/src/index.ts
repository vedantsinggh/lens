import { z } from 'zod';

// Re-export all financial calculation engine functions & interfaces
export * from './calculations/financial.js';

/**
 * Health check response schema and type
 */
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  uptime: z.number().nonnegative(),
  environment: z.string(),
  service: z.string()
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/**
 * Core application info response schema and type
 */
export const AppInfoResponseSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  modules: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.enum(['placeholder', 'beta', 'active']),
      phase: z.number().int().positive()
    })
  )
});

export type AppInfoResponse = z.infer<typeof AppInfoResponseSchema>;

/**
 * Known system module identifiers
 */
export const MODULE_IDS = {
  LOAN_ADVISOR: 'loan-advisor',
  POLICY_ASSISTANT: 'policy-assistant',
  AGENTIC_PRESCREENING: 'agentic-prescreening'
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];

/**
 * Module metadata for LoanLens AI
 */
export const INITIAL_MODULES = [
  {
    id: MODULE_IDS.LOAN_ADVISOR,
    title: 'Loan Advisor',
    description: 'Deterministic financial modeling, repayment schedule calculator, DTI/EMI computation, and amortization schedules.',
    status: 'active' as const, // Now active in Phase 2!
    phase: 2
  },
  {
    id: MODULE_IDS.POLICY_ASSISTANT,
    title: 'Policy Assistant',
    description: 'Semantic vector retrieval (RAG) over credit underwriting policies and institutional compliance documents.',
    status: 'placeholder' as const,
    phase: 2
  },
  {
    id: MODULE_IDS.AGENTIC_PRESCREENING,
    title: 'Agentic Pre-Screening',
    description: 'AI-assisted loan underwriting recommendation engine with human-in-the-loop audit governance.',
    status: 'placeholder' as const,
    phase: 3
  }
];

/**
 * Request schema for loan calculation endpoint
 */
export const LoanCalculationRequestSchema = z.object({
  principal: z.number({ required_error: 'Loan principal is required' }).positive('Principal must be greater than 0'),
  annualRate: z.number({ required_error: 'Annual interest rate is required' }).min(0, 'Interest rate cannot be negative').max(100, 'Rate cannot exceed 100%'),
  termMonths: z.number({ required_error: 'Loan term in months is required' }).int('Term must be a whole number of months').min(1, 'Term must be at least 1 month').max(600, 'Term cannot exceed 600 months (50 years)'),
  grossMonthlyIncome: z.number().positive('Monthly income must be positive').optional(),
  existingMonthlyDebt: z.number().nonnegative('Monthly debt must be non-negative').optional(),
  assetValue: z.number().positive('Asset value must be positive').optional(),
  borrowerId: z.string().uuid().optional(),
  scenarioName: z.string().max(100).optional()
});

export type LoanCalculationRequest = z.infer<typeof LoanCalculationRequestSchema>;

/**
 * Schema for an individual amortization payment row
 */
export const AmortizationRowSchema = z.object({
  month: z.number().int().positive(),
  openingBalance: z.number(),
  payment: z.number(),
  principal: z.number(),
  interest: z.number(),
  closingBalance: z.number()
});

/**
 * Response schema for loan calculation endpoint
 */
export const LoanCalculationResponseSchema = z.object({
  calculationId: z.string().optional(),
  principal: z.number(),
  annualRate: z.number(),
  termMonths: z.number(),
  monthlyEMI: z.number(),
  totalRepayment: z.number(),
  totalInterest: z.number(),
  amortizationSchedule: z.array(AmortizationRowSchema),
  dti: z.object({
    dtiPercentage: z.number(),
    riskTier: z.enum(['low_risk', 'moderate_risk', 'high_risk']),
    description: z.string()
  }).optional(),
  ltv: z.object({
    ltvPercentage: z.number(),
    tier: z.enum(['standard', 'elevated_pmi_required', 'critical_risk']),
    description: z.string()
  }).optional(),
  savedAt: z.string().optional()
});

export type LoanCalculationResponse = z.infer<typeof LoanCalculationResponseSchema>;

/**
 * Synthetic borrower demo presets for instant UI testing
 */
export interface DemoPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  principal: number;
  annualRate: number;
  termMonths: number;
  grossMonthlyIncome: number;
  existingMonthlyDebt: number;
  assetValue: number;
}

export const SYNTHETIC_DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'preset-prime-mortgage',
    name: 'Prime Conforming Mortgage',
    badge: 'Prime / Low Risk',
    description: 'Conventional 30-year fixed home loan. High creditworthiness, 80% LTV, comfortable 24% DTI.',
    principal: 400000,
    annualRate: 6.5,
    termMonths: 360,
    grossMonthlyIncome: 12500,
    existingMonthlyDebt: 650,
    assetValue: 500000
  },
  {
    id: 'preset-auto-conforming',
    name: 'Auto Loan (Borderline DTI)',
    badge: 'Moderate DTI',
    description: '5-year automotive financing with existing student/card obligations pushing DTI near 40%.',
    principal: 38000,
    annualRate: 7.25,
    termMonths: 60,
    grossMonthlyIncome: 4800,
    existingMonthlyDebt: 1150,
    assetValue: 42000
  },
  {
    id: 'preset-zero-interest-promo',
    name: 'Retail 0% APR Financing Promo',
    badge: '0.00% Zero-Interest',
    description: 'Special 24-month interest-free promotional equipment loan. Exact linear division, zero division-by-zero.',
    principal: 12000,
    annualRate: 0.0,
    termMonths: 24,
    grossMonthlyIncome: 6500,
    existingMonthlyDebt: 350,
    assetValue: 15000
  }
];
