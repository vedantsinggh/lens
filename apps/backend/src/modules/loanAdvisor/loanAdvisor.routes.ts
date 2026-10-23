import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  LoanCalculationRequestSchema,
  calculateLoanQuote,
  SYNTHETIC_DEMO_PRESETS,
  type LoanCalculationResponse
} from '@loanlens/shared';
import { prisma } from '../../db.js';

export const loanAdvisorRouter = Router();

/**
 * POST /api/loan-advisor/calculate
 * Calculate deterministic loan terms, EMI, amortization schedule, DTI, and LTV.
 */
loanAdvisorRouter.post('/calculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = LoanCalculationRequestSchema.parse(req.body);

    const quoteResult = calculateLoanQuote({
      principal: validatedInput.principal,
      annualRate: validatedInput.annualRate,
      termMonths: validatedInput.termMonths,
      grossMonthlyIncome: validatedInput.grossMonthlyIncome,
      existingMonthlyDebt: validatedInput.existingMonthlyDebt,
      assetValue: validatedInput.assetValue
    });

    let calculationId: string | undefined;
    let savedAt: string | undefined;

    // Persist calculation record asynchronously to PostgreSQL if available
    try {
      const savedRecord = await prisma.loanCalculation.create({
        data: {
          borrowerId: validatedInput.borrowerId || null,
          principal: quoteResult.principal,
          annualRate: quoteResult.annualRate,
          termMonths: quoteResult.termMonths,
          monthlyEMI: quoteResult.monthlyEMI,
          totalRepayment: quoteResult.totalRepayment,
          totalInterest: quoteResult.totalInterest,
          dtiRatio: quoteResult.dti?.dtiPercentage || null,
          ltvRatio: quoteResult.ltv?.ltvPercentage || null,
          scenarioName: validatedInput.scenarioName || 'Custom Calculator Scenario'
        }
      });
      calculationId = savedRecord.id;
      savedAt = savedRecord.createdAt.toISOString();
    } catch (dbError) {
      console.warn('[LoanAdvisor] Database persistence skipped or unavailable:', dbError instanceof Error ? dbError.message : dbError);
    }

    const response: LoanCalculationResponse = {
      calculationId,
      principal: quoteResult.principal,
      annualRate: quoteResult.annualRate,
      termMonths: quoteResult.termMonths,
      monthlyEMI: quoteResult.monthlyEMI,
      totalRepayment: quoteResult.totalRepayment,
      totalInterest: quoteResult.totalInterest,
      amortizationSchedule: quoteResult.amortizationSchedule,
      dti: quoteResult.dti,
      ltv: quoteResult.ltv,
      savedAt
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/loan-advisor/presets
 * Return predefined synthetic demo borrower scenarios for one-click demo testing.
 */
loanAdvisorRouter.get('/presets', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Optionally fetch seeded borrowers from PostgreSQL to enrich presets with database IDs
    let borrowersMap: Record<string, string> = {};
    try {
      const borrowers = await prisma.borrower.findMany({ select: { id: true, email: true } });
      borrowersMap = borrowers.reduce<Record<string, string>>((acc, b) => {
        acc[b.email] = b.id;
        return acc;
      }, {});
    } catch {
      // Fallback if DB is query-restricted
    }

    const presetsWithBorrowerIds = SYNTHETIC_DEMO_PRESETS.map((preset) => {
      let borrowerId: string | undefined;
      if (preset.id.includes('prime')) {
        borrowerId = borrowersMap['jane.doe.synthetic@loanlens.example.com'];
      } else if (preset.id.includes('auto')) {
        borrowerId = borrowersMap['alex.rivera.synthetic@loanlens.example.com'];
      } else if (preset.id.includes('zero')) {
        borrowerId = borrowersMap['marcus.chen.synthetic@loanlens.example.com'];
      }
      return {
        ...preset,
        borrowerId
      };
    });

    res.status(200).json({ presets: presetsWithBorrowerIds });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/loan-advisor/history
 * Return recent calculation records for auditing / comparison.
 */
loanAdvisorRouter.get('/history', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const calculations = await prisma.loanCalculation.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { borrower: { select: { fullName: true, creditScore: true } } }
    });

    res.status(200).json({ calculations });
  } catch (error) {
    next(error);
  }
});
