import { z } from 'zod';

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
 * Default module metadata for LoanLens AI
 */
export const INITIAL_MODULES = [
  {
    id: MODULE_IDS.LOAN_ADVISOR,
    title: 'Loan Advisor',
    description: 'Deterministic financial modeling, repayment schedule calculator, and borrower affordability analysis.',
    status: 'placeholder' as const,
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
