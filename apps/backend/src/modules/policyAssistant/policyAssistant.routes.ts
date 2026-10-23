import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  PolicyQueryRequestSchema,
  retrieveEligiblePolicies,
  generateGroundedAnswer,
  SYNTHETIC_POLICY_CORPUS,
  type PolicyDocument
} from '@loanlens/shared';
import { prisma } from '../../db.js';

export const policyAssistantRouter = Router();

/**
 * POST /api/policy-assistant/query
 * Query credit underwriting guidelines and produce a grounded, cited answer.
 */
policyAssistantRouter.post('/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = performance.now();
    const validated = PolicyQueryRequestSchema.parse(req.body);

    // Fetch eligible policies from PostgreSQL database if available, otherwise use shared corpus
    let policyCorpus: PolicyDocument[] = SYNTHETIC_POLICY_CORPUS;

    try {
      const dbPolicies = await prisma.creditPolicy.findMany({
        where: {
          status: 'current',
          effectiveDate: { lte: new Date() }
        }
      });

      if (dbPolicies && dbPolicies.length > 0) {
        policyCorpus = dbPolicies.map((p) => ({
          id: p.id,
          policyId: p.policyId,
          title: p.title,
          section: p.section,
          category: p.category,
          audience: p.audience as PolicyDocument['audience'],
          effectiveDate: p.effectiveDate.toISOString(),
          version: p.version,
          status: p.status as PolicyDocument['status'],
          content: p.content,
          keywords: p.keywords
        }));
      }
    } catch (dbError) {
      console.warn('[PolicyAssistant] Using in-memory synthetic policy corpus fallback:', dbError instanceof Error ? dbError.message : dbError);
    }

    // Retrieve eligible citations using lexical term relevance with strict server-side filtering
    const citations = retrieveEligiblePolicies(policyCorpus, validated.query, {
      audience: validated.audience,
      topK: validated.topK
    });

    // Synthesize grounded answer backed strictly by retrieved sources
    const groundedResponse = generateGroundedAnswer(validated.query, citations, validated.audience);
    const retrievalLatencyMs = Math.round(performance.now() - startTime);

    res.status(200).json({
      ...groundedResponse,
      retrievalLatencyMs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/policy-assistant/policies
 * List all policies currently in the repository with status and versioning.
 */
policyAssistantRouter.get('/policies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const audienceFilter = typeof req.query['audience'] === 'string' ? req.query['audience'] : undefined;
    const statusFilter = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;

    let policies: PolicyDocument[] = SYNTHETIC_POLICY_CORPUS;

    try {
      const dbPolicies = await prisma.creditPolicy.findMany({
        orderBy: [{ category: 'asc' }, { policyId: 'asc' }]
      });

      if (dbPolicies && dbPolicies.length > 0) {
        policies = dbPolicies.map((p) => ({
          id: p.id,
          policyId: p.policyId,
          title: p.title,
          section: p.section,
          category: p.category,
          audience: p.audience as PolicyDocument['audience'],
          effectiveDate: p.effectiveDate.toISOString(),
          version: p.version,
          status: p.status as PolicyDocument['status'],
          content: p.content,
          keywords: p.keywords
        }));
      }
    } catch {
      // Fallback to shared corpus
    }

    let filtered = policies;
    if (audienceFilter && audienceFilter !== 'all') {
      filtered = filtered.filter((p) => p.audience === 'all' || p.audience === audienceFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    res.status(200).json({
      policies: filtered,
      totalCount: filtered.length,
      disclaimer: 'Synthetic Demonstration Policy Catalog'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/policy-assistant/sample-questions
 * Return curated demo questions for easy hackathon evaluation.
 */
policyAssistantRouter.get('/sample-questions', (_req: Request, res: Response) => {
  const sampleQuestions = [
    {
      id: 'q1',
      question: 'What is the maximum conforming DTI ratio and what cash reserves are required?',
      topic: 'DTI Limits',
      audience: 'all' as const
    },
    {
      id: 'q2',
      question: 'When is private mortgage insurance (PMI) required based on LTV?',
      topic: 'LTV & Collateral',
      audience: 'all' as const
    },
    {
      id: 'q3',
      question: 'What documents are required for application and how long is the cure period?',
      topic: 'Documentation',
      audience: 'borrower' as const
    },
    {
      id: 'q4',
      question: 'What conditions trigger a mandatory manual underwriting review?',
      topic: 'Underwriting Review',
      audience: 'underwriter' as const
    },
    {
      id: 'q5',
      question: 'Who has the authority to grant a policy exception and what factors qualify?',
      topic: 'Exceptions & Governance',
      audience: 'underwriter' as const
    }
  ];

  res.status(200).json({ sampleQuestions });
});
