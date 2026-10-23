import { z } from 'zod';
import { PolicyCitationSchema } from './policy.js';

export type ScreeningCategory = 'READY_FOR_REVIEW' | 'NEEDS_INFORMATION' | 'MANUAL_REVIEW';
export type ReviewWorkflowStatus = 'pending' | 'reviewed' | 'needs_more_info';
export type EmploymentType = 'salaried' | 'self_employed' | 'other';

export const DocumentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  received: z.boolean(),
  required: z.boolean().default(true),
  description: z.string()
});

export type DocumentItem = z.infer<typeof DocumentItemSchema>;

export const PreScreeningFindingSchema = z.object({
  code: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string(),
  message: z.string(),
  relatedPolicyId: z.string().optional(),
  policySection: z.string().optional(),
  policyVersion: z.string().optional()
});

export type PreScreeningFinding = z.infer<typeof PreScreeningFindingSchema>;

export const PreScreeningRequestSchema = z.object({
  applicationId: z.string().optional(),
  applicantName: z
    .string({ required_error: 'Applicant name is required' })
    .trim()
    .min(2, 'Applicant name must be at least 2 characters')
    .max(100, 'Applicant name cannot exceed 100 characters'),
  principal: z
    .number({ required_error: 'Loan principal is required' })
    .min(1000, 'Principal must be at least $1,000')
    .max(5000000, 'Principal cannot exceed $5,000,000'),
  annualRate: z
    .number({ required_error: 'Annual interest rate is required' })
    .min(0, 'Interest rate cannot be negative')
    .max(100, 'Interest rate cannot exceed 100%'),
  termMonths: z
    .number({ required_error: 'Loan term in months is required' })
    .int('Term must be a whole number of months')
    .min(6, 'Loan term must be at least 6 months')
    .max(480, 'Loan term cannot exceed 480 months (40 years)'),
  grossMonthlyIncome: z
    .number({ required_error: 'Gross monthly income is required' })
    .min(100, 'Gross monthly income must be at least $100'),
  existingMonthlyDebt: z
    .number({ required_error: 'Existing monthly debt is required' })
    .min(0, 'Existing monthly debt cannot be negative')
    .default(0),
  assetValue: z
    .number()
    .min(0, 'Asset value cannot be negative')
    .optional(),
  employmentType: z.enum(['salaried', 'self_employed', 'other']).default('salaried'),
  employmentMonths: z
    .number({ required_error: 'Employment duration in months is required' })
    .int('Employment duration must be a whole number of months')
    .min(0, 'Employment duration cannot be negative'),
  creditScore: z
    .number()
    .int('Credit score must be an integer')
    .min(300, 'Minimum credit score is 300')
    .max(850, 'Maximum credit score is 850')
    .optional(),
  documents: z.array(DocumentItemSchema).default([])
});

export type PreScreeningRequest = z.infer<typeof PreScreeningRequestSchema>;

export const PreScreeningResponseSchema = z.object({
  applicationId: z.string(),
  applicantName: z.string(),
  category: z.enum(['READY_FOR_REVIEW', 'NEEDS_INFORMATION', 'MANUAL_REVIEW']),
  workflowStatus: z.enum(['pending', 'reviewed', 'needs_more_info']),
  summary: z.string(),
  calculation: z.object({
    monthlyEMI: z.number(),
    totalRepayment: z.number(),
    totalInterest: z.number(),
    dti: z.object({
      dtiPercentage: z.number(),
      riskTier: z.string(),
      description: z.string()
    }),
    ltv: z
      .object({
        ltvPercentage: z.number(),
        tier: z.string(),
        description: z.string()
      })
      .optional()
  }),
  documentAudit: z.object({
    allRequiredPresent: z.boolean(),
    missingRequired: z.array(z.string()),
    receivedCount: z.number().int(),
    totalRequiredCount: z.number().int()
  }),
  findings: z.array(PreScreeningFindingSchema),
  citations: z.array(PolicyCitationSchema),
  persistenceStatus: z.enum(['persisted', 'skipped', 'failed']),
  recordId: z.string().optional(),
  evaluatedAt: z.string(),
  disclaimer: z.string()
});

export type PreScreeningResponse = z.infer<typeof PreScreeningResponseSchema>;

export const WorkflowStatusUpdateRequestSchema = z.object({
  workflowStatus: z.enum(['pending', 'reviewed', 'needs_more_info']),
  reviewerNotes: z.string().max(1000).optional()
});

export type WorkflowStatusUpdateRequest = z.infer<typeof WorkflowStatusUpdateRequestSchema>;

export const PRELIMINARY_SCREENING_DISCLAIMER =
  'Preliminary Screening Aid Only: Evaluated strictly against synthetic demonstration lending rules. This assessment provides preliminary decision support for human underwriters and does not constitute a loan approval, denial, or credit commitment. Final lending authority rests solely with human reviewers.';
