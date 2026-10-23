import { z } from 'zod';

export type PolicyAudience = 'all' | 'borrower' | 'underwriter';
export type PolicyStatus = 'current' | 'superseded' | 'draft';

export interface PolicyDocument {
  id?: string;
  policyId: string;
  title: string;
  section: string;
  category: string;
  audience: PolicyAudience;
  effectiveDate: string;
  version: string;
  status: PolicyStatus;
  content: string;
  keywords: string[];
}

export const PolicyCitationSchema = z.object({
  policyId: z.string(),
  title: z.string(),
  section: z.string(),
  version: z.string(),
  matchedExcerpt: z.string(),
  fullContent: z.string().optional(),
  relevanceScore: z.number(),
  audience: z.string(),
  effectiveDate: z.string()
});

export type PolicyCitation = z.infer<typeof PolicyCitationSchema>;

export const PolicyQueryRequestSchema = z.object({
  query: z
    .string({ required_error: 'Query string is required' })
    .trim()
    .min(2, 'Query must be at least 2 characters long')
    .max(300, 'Query cannot exceed 300 characters'),
  audience: z.enum(['all', 'borrower', 'underwriter']).default('all'),
  topK: z.number().int().min(1).max(10).default(4)
});

export type PolicyQueryRequest = z.infer<typeof PolicyQueryRequestSchema>;

export const PolicyQueryResponseSchema = z.object({
  query: z.string(),
  audience: z.enum(['all', 'borrower', 'underwriter']),
  answer: z.string(),
  hasSufficientEvidence: z.boolean(),
  citations: z.array(PolicyCitationSchema),
  retrievedCount: z.number().int().nonnegative(),
  disclaimer: z.string(),
  retrievalMethod: z.string(),
  retrievalLatencyMs: z.number().optional()
});

export type PolicyQueryResponse = z.infer<typeof PolicyQueryResponseSchema>;

/**
 * Standard synthetic policy disclaimer
 */
export const SYNTHETIC_POLICY_DISCLAIMER =
  'Illustrative Demo Material: All credit underwriting policies, thresholds, and conditions shown are synthetic hackathon demonstration models and do not represent real banking, credit union, or legal guidelines.';
