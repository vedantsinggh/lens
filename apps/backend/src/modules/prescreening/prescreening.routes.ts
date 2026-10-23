import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  evaluateLoanPreScreening,
  validateApplicationInput,
  SYNTHETIC_APPLICATION_PRESETS,
  SYNTHETIC_POLICY_CORPUS,
  WorkflowStatusUpdateRequestSchema,
  type PolicyDocument,
  type PreScreeningResponse
} from '@loanlens/shared';
import { prisma } from '../../db.js';

export const prescreeningRouter = Router();

/**
 * POST /api/pre-screening/evaluate
 * Evaluates a synthetic loan application, validates completeness,
 * computes deterministic financial metrics, retrieves grounded policy citations,
 * and persists the preliminary screening assessment.
 */
prescreeningRouter.post('/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate application input
    const validated = validateApplicationInput(req.body);

    // 2. Fetch eligible current policy corpus from database (with fallback to shared corpus)
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
      console.warn(
        '[PreScreening] Using in-memory synthetic policy corpus fallback:',
        dbError instanceof Error ? dbError.message : dbError
      );
    }

    // 3. Run deterministic orchestration engine
    const evaluation = evaluateLoanPreScreening(validated, { policyCorpus });

    // 4. Persist screening record to PostgreSQL (with resilient error handling)
    let persistenceStatus: 'persisted' | 'failed' = 'persisted';
    let recordId: string | undefined = undefined;

    try {
      const savedRecord = await prisma.preScreeningRecord.create({
        data: {
          applicationId: evaluation.applicationId,
          applicantName: evaluation.applicantName,
          category: evaluation.category,
          workflowStatus: evaluation.workflowStatus,
          principal: validated.principal,
          annualRate: validated.annualRate,
          termMonths: validated.termMonths,
          grossIncome: validated.grossMonthlyIncome,
          monthlyDebt: validated.existingMonthlyDebt,
          monthlyEMI: evaluation.calculation.monthlyEMI,
          totalRepayment: evaluation.calculation.totalRepayment,
          totalInterest: evaluation.calculation.totalInterest,
          dtiPercentage: evaluation.calculation.dti.dtiPercentage,
          ltvPercentage: evaluation.calculation.ltv?.ltvPercentage ?? null,
          summary: evaluation.summary,
          findings: JSON.parse(JSON.stringify(evaluation.findings)),
          citations: JSON.parse(JSON.stringify(evaluation.citations)),
          missingDocs: evaluation.documentAudit.missingRequired
        }
      });
      recordId = savedRecord.id;
    } catch (dbError) {
      console.warn(
        '[PreScreening] Database persistence failed:',
        dbError instanceof Error ? dbError.message : dbError
      );
      persistenceStatus = 'failed';
    }

    const response: PreScreeningResponse = {
      ...evaluation,
      persistenceStatus,
      recordId
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pre-screening/presets
 * Returns curated synthetic application presets for rapid hackathon testing.
 */
prescreeningRouter.get('/presets', (_req: Request, res: Response) => {
  res.status(200).json({
    presets: SYNTHETIC_APPLICATION_PRESETS
  });
});

/**
 * PATCH /api/pre-screening/:id/status
 * Updates human reviewer workflow status ('reviewed' or 'needs_more_info').
 * These represent internal human workflow statuses, strictly NOT autonomous credit approvals/denials.
 */
prescreeningRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!recordId) {
      res.status(400).json({ error: 'Record ID is required' });
      return;
    }
    const validated = WorkflowStatusUpdateRequestSchema.parse(req.body);

    try {
      const updated = await prisma.preScreeningRecord.update({
        where: { id: recordId },
        data: {
          workflowStatus: validated.workflowStatus,
          reviewerNotes: validated.reviewerNotes || null
        }
      });

      res.status(200).json({
        id: updated.id,
        applicationId: updated.applicationId,
        workflowStatus: updated.workflowStatus,
        reviewerNotes: updated.reviewerNotes,
        updatedAt: updated.updatedAt.toISOString()
      });
    } catch {
      res.status(404).json({
        error: `Pre-screening record with id '${recordId}' not found`
      });
    }
  } catch (error) {
    next(error);
  }
});
