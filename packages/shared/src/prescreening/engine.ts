import {
  calculateLoanQuote
} from '../calculations/financial.js';
import type {
  PreScreeningRequest,
  PreScreeningResponse,
  PreScreeningFinding,
  ScreeningCategory
} from '../types/prescreening.js';
import {
  PreScreeningRequestSchema,
  PRELIMINARY_SCREENING_DISCLAIMER
} from '../types/prescreening.js';
import type { PolicyDocument, PolicyCitation } from '../types/policy.js';
import { retrieveEligiblePolicies } from '../retrieval/policyRetriever.js';
import { SYNTHETIC_POLICY_CORPUS } from '../data/syntheticPolicies.js';

/**
 * Tool 1: Input Validation
 * Validates untrusted loan application data against the shared Zod schema.
 */
export function validateApplicationInput(input: unknown): PreScreeningRequest {
  return PreScreeningRequestSchema.parse(input);
}

/**
 * Tool 2: Financial Metrics Calculation
 * Runs deterministic financial calculations using the audited financial engine.
 */
export function computeFinancialMetrics(input: PreScreeningRequest) {
  const quote = calculateLoanQuote({
    principal: input.principal,
    annualRate: input.annualRate,
    termMonths: input.termMonths,
    grossMonthlyIncome: input.grossMonthlyIncome,
    existingMonthlyDebt: input.existingMonthlyDebt,
    assetValue: input.assetValue
  });

  if (!quote.dti) {
    throw new Error('DTI calculation failed: grossMonthlyIncome must be positive');
  }

  return {
    amortization: {
      monthlyEMI: quote.monthlyEMI,
      totalRepayment: quote.totalRepayment,
      totalInterest: quote.totalInterest
    },
    dti: quote.dti,
    ltv: quote.ltv
  };
}

/**
 * Tool 3: Document Completeness Audit
 * Verifies presence of mandatory documentation based on borrower employment profile.
 */
export function auditRequiredDocuments(input: PreScreeningRequest) {
  const documents = input.documents || [];
  const missingRequired: string[] = [];
  let receivedCount = 0;
  let totalRequiredCount = 0;

  for (const doc of documents) {
    if (doc.required) {
      totalRequiredCount += 1;
      if (doc.received) {
        receivedCount += 1;
      } else {
        missingRequired.push(doc.name);
      }
    }
  }

  // If no documents were provided in payload, treat as 0 received out of standard required docs
  if (documents.length === 0) {
    missingRequired.push(
      'Government Photo ID',
      'Paystubs / Income Verification',
      'Tax Filings (Last 2 Years)',
      'Bank Statements (2 Months)',
      'Credit Disclosure Authorization'
    );
    totalRequiredCount = 5;
  }

  return {
    allRequiredPresent: missingRequired.length === 0,
    missingRequired,
    receivedCount,
    totalRequiredCount
  };
}

/**
 * Tool 4 & 5: Policy Compliance Audit & Pre-Screening Synthesis
 * Evaluates application metrics against current synthetic underwriting policies,
 * retrieves verifiable citations, and deterministically assigns screening category.
 */
export function evaluateLoanPreScreening(
  input: PreScreeningRequest,
  options: {
    policyCorpus?: PolicyDocument[];
    referenceDate?: Date;
  } = {}
): Omit<PreScreeningResponse, 'persistenceStatus' | 'recordId'> {
  const validated = validateApplicationInput(input);
  const corpus = options.policyCorpus || SYNTHETIC_POLICY_CORPUS;
  const refDate = options.referenceDate || new Date();

  // 1. Calculate deterministic financial metrics
  const { amortization, dti, ltv } = computeFinancialMetrics(validated);

  // 2. Audit documentation completeness
  const docAudit = auditRequiredDocuments(validated);

  // 3. Evaluate findings against policy corpus
  const findings: PreScreeningFinding[] = [];
  const policiesToCite = new Set<string>();

  // A. Document findings
  if (!docAudit.allRequiredPresent) {
    findings.push({
      code: 'DOCS_MISSING',
      severity: 'warning',
      title: 'Incomplete Documentation',
      message: `Application is missing ${docAudit.missingRequired.length} required item(s): ${docAudit.missingRequired.join(
        ', '
      )}. Under POL-DOC-002, the applicant is granted a 14-calendar-day cure period.`,
      relatedPolicyId: 'POL-DOC-002',
      policySection: 'Section 5.3: Missing Documents & Expirations',
      policyVersion: '2.0'
    });
    policiesToCite.add('POL-DOC-002');
  } else {
    findings.push({
      code: 'DOCS_COMPLETE',
      severity: 'info',
      title: 'Documentation Complete',
      message:
        'All mandatory initial borrower documents have been submitted and verified per POL-DOC-001 checklist standards.',
      relatedPolicyId: 'POL-DOC-001',
      policySection: 'Section 5.1: Initial Application Submissions',
      policyVersion: '3.0'
    });
    policiesToCite.add('POL-DOC-001');
  }

  // B. DTI findings
  const dtiVal = dti.dtiPercentage;
  if (dtiVal <= 36.0) {
    findings.push({
      code: 'DTI_PRIME',
      severity: 'info',
      title: 'Prime Conforming DTI Ratio',
      message: `Total DTI of ${dtiVal.toFixed(
        2
      )}% qualifies for expedited automated underwriting under POL-DTI-001 Tier 1 Prime standards (<= 36.00%).`,
      relatedPolicyId: 'POL-DTI-001',
      policySection: 'Section 3.1: DTI Eligibility Limits',
      policyVersion: '2.1'
    });
    policiesToCite.add('POL-DTI-001');
  } else if (dtiVal <= 43.0) {
    findings.push({
      code: 'DTI_MODERATE',
      severity: 'info',
      title: 'Moderate DTI Ratio (Reserves Required)',
      message: `Total DTI of ${dtiVal.toFixed(
        2
      )}% is acceptable in Tier 2 (36.01% - 43.00%) conditioned upon maintaining at least 3 months of liquid cash reserves.`,
      relatedPolicyId: 'POL-DTI-001',
      policySection: 'Section 3.1: DTI Eligibility Limits',
      policyVersion: '2.1'
    });
    policiesToCite.add('POL-DTI-001');
  } else if (dtiVal <= 45.0) {
    findings.push({
      code: 'DTI_CEILING_ESCALATION',
      severity: 'critical',
      title: 'DTI Triggers Mandatory Manual Review',
      message: `Total DTI of ${dtiVal.toFixed(
        2
      )}% falls between 43.01% and 45.00%. POL-REV-001 Section 6.2 mandates manual review by a human underwriter.`,
      relatedPolicyId: 'POL-REV-001',
      policySection: 'Section 6.2: Exception and Escalation Triggers',
      policyVersion: '2.1'
    });
    policiesToCite.add('POL-REV-001');
    policiesToCite.add('POL-DTI-001');
  } else {
    findings.push({
      code: 'DTI_NON_CONFORMING',
      severity: 'critical',
      title: 'Non-Conforming DTI Ratio',
      message: `Total DTI of ${dtiVal.toFixed(
        2
      )}% exceeds the 45.00% automated cap. Automated approval is prohibited under POL-DTI-001. Requires Credit Committee exception escalation under POL-EXC-001.`,
      relatedPolicyId: 'POL-DTI-001',
      policySection: 'Section 3.1: DTI Eligibility Limits',
      policyVersion: '2.1'
    });
    policiesToCite.add('POL-DTI-001');
    policiesToCite.add('POL-EXC-001');
  }

  // C. LTV findings
  if (ltv) {
    const ltvVal = ltv.ltvPercentage;
    if (ltvVal <= 80.0) {
      findings.push({
        code: 'LTV_STANDARD',
        severity: 'info',
        title: 'Standard LTV (Equity Cushion Verified)',
        message: `Calculated LTV of ${ltvVal.toFixed(
          2
        )}% meets Tier 1 standard (<= 80.00%) under POL-LTV-001 without private mortgage insurance (PMI).`,
        relatedPolicyId: 'POL-LTV-001',
        policySection: 'Section 4.2: Collateral Valuation & Equity Tiers',
        policyVersion: '2.0'
      });
      policiesToCite.add('POL-LTV-001');
    } else if (ltvVal <= 95.0) {
      findings.push({
        code: 'LTV_ELEVATED_PMI',
        severity: 'warning',
        title: 'Elevated LTV — PMI Required',
        message: `Calculated LTV of ${ltvVal.toFixed(
          2
        )}% falls in Tier 2 (80.01% - 95.00%). Borrower-paid mortgage insurance is required per POL-LTV-001.`,
        relatedPolicyId: 'POL-LTV-001',
        policySection: 'Section 4.2: Collateral Valuation & Equity Tiers',
        policyVersion: '2.0'
      });
      policiesToCite.add('POL-LTV-001');
    } else {
      findings.push({
        code: 'LTV_HIGH_LEVERAGE',
        severity: 'critical',
        title: 'High Leverage LTV Ceiling Exceeded',
        message: `Calculated LTV of ${ltvVal.toFixed(
          2
        )}% exceeds the 95.00% conventional limit. Prohibited for standard financing under POL-LTV-001; requires secondary collateral coverage or specialized subsidy.`,
        relatedPolicyId: 'POL-LTV-001',
        policySection: 'Section 4.2: Collateral Valuation & Equity Tiers',
        policyVersion: '2.0'
      });
      policiesToCite.add('POL-LTV-001');
    }
  }

  // D. Employment findings
  if (validated.employmentType === 'self_employed') {
    if (validated.employmentMonths < 24) {
      findings.push({
        code: 'SELF_EMPLOYED_TENURE_SHORT',
        severity: 'critical',
        title: 'Self-Employment Continuity Under 2 Years',
        message: `Self-employed borrower has ${validated.employmentMonths} months of business history. POL-EMP-001 Section 2.4 requires at least 24 consecutive months of profitable tax filings (Form 1040 Schedule C/K-1).`,
        relatedPolicyId: 'POL-EMP-001',
        policySection: 'Section 2.4: Employment Continuity Standards',
        policyVersion: '2.2'
      });
      policiesToCite.add('POL-EMP-001');
    } else {
      findings.push({
        code: 'SELF_EMPLOYED_TENURE_MET',
        severity: 'info',
        title: 'Self-Employment Continuity Confirmed',
        message: `Self-employed borrower demonstrates ${validated.employmentMonths} months history, satisfying the 2-year business continuity standard under POL-EMP-001.`,
        relatedPolicyId: 'POL-EMP-001',
        policySection: 'Section 2.4: Employment Continuity Standards',
        policyVersion: '2.2'
      });
      policiesToCite.add('POL-EMP-001');
    }
  } else {
    if (validated.employmentMonths < 24) {
      findings.push({
        code: 'EMPLOYMENT_RECENT_TRANSITION',
        severity: 'warning',
        title: 'Recent Employment Transition',
        message: `Current employment tenure of ${validated.employmentMonths} months is under 24 months. Written employer confirmation of non-probationary status required under POL-EMP-001.`,
        relatedPolicyId: 'POL-EMP-001',
        policySection: 'Section 2.4: Employment Continuity Standards',
        policyVersion: '2.2'
      });
      policiesToCite.add('POL-EMP-001');
    } else {
      findings.push({
        code: 'EMPLOYMENT_STABLE',
        severity: 'info',
        title: 'Employment Stability Verified',
        message: `Borrower demonstrates ${validated.employmentMonths} months stable employment, satisfying the 24-month benchmark under POL-EMP-001.`,
        relatedPolicyId: 'POL-EMP-001',
        policySection: 'Section 2.4: Employment Continuity Standards',
        policyVersion: '2.2'
      });
      policiesToCite.add('POL-EMP-001');
    }
  }

  // E. Credit score triggers
  if (validated.creditScore !== undefined) {
    if (validated.creditScore < 660) {
      findings.push({
        code: 'CREDIT_SCORE_MANUAL_REVIEW',
        severity: 'critical',
        title: 'Credit Score Below 660 Automated Threshold',
        message: `Credit score of ${validated.creditScore} is below 660. Under POL-REV-001 Section 6.2, automated decisioning is suspended and mandatory manual review is triggered.`,
        relatedPolicyId: 'POL-REV-001',
        policySection: 'Section 6.2: Exception and Escalation Triggers',
        policyVersion: '2.1'
      });
      policiesToCite.add('POL-REV-001');
    } else {
      findings.push({
        code: 'CREDIT_SCORE_CONFORMING',
        severity: 'info',
        title: 'Conforming Credit Score',
        message: `Credit score of ${validated.creditScore} meets conforming Automated Underwriting threshold (>= 660).`,
        relatedPolicyId: 'POL-REV-001',
        policySection: 'Section 6.2: Exception and Escalation Triggers',
        policyVersion: '2.1'
      });
    }
  }

  // 4. Deterministic Category Decision
  let category: ScreeningCategory = 'READY_FOR_REVIEW';
  if (!docAudit.allRequiredPresent) {
    category = 'NEEDS_INFORMATION';
  } else if (findings.some((f) => f.severity === 'critical')) {
    category = 'MANUAL_REVIEW';
  } else {
    category = 'READY_FOR_REVIEW';
  }

  // 5. Gather citations strictly using the verified retrieval engine
  const citations: PolicyCitation[] = [];
  for (const policyId of policiesToCite) {
    const matchingDocs = retrieveEligiblePolicies(corpus, policyId, {
      audience: 'underwriter', // Pre-screening engine operates under underwriter authority
      referenceDate: refDate,
      topK: 1
    });
    if (matchingDocs[0]) {
      citations.push(matchingDocs[0]);
    } else {
      const direct = corpus.find(
        (p) =>
          p.policyId === policyId &&
          p.status === 'current' &&
          new Date(p.effectiveDate).getTime() <= refDate.getTime()
      );
      if (direct) {
        citations.push({
          policyId: direct.policyId,
          title: direct.title,
          section: direct.section,
          version: direct.version,
          matchedExcerpt: direct.content.slice(0, 200),
          fullContent: direct.content,
          relevanceScore: 1.0,
          audience: direct.audience,
          effectiveDate: direct.effectiveDate
        });
      }
    }
  }

  // 6. Generate human-readable summary
  let summary = '';
  if (category === 'READY_FOR_REVIEW') {
    summary = `Preliminary screening complete: Application exhibits complete documentation, prime DTI (${dtiVal.toFixed(
      2
    )}%), and acceptable employment stability. Case is ready for human underwriter sign-off.`;
  } else if (category === 'NEEDS_INFORMATION') {
    summary = `Preliminary screening paused: Application lacks mandatory documentation (${docAudit.missingRequired.join(
      ', '
    )}). Applicant must be notified of the 14-day cure deadline before underwriting proceeds.`;
  } else {
    const criticalReasons = findings
      .filter((f) => f.severity === 'critical')
      .map((f) => f.title)
      .join('; ');
    summary = `Preliminary screening escalated: Application triggers mandatory human review due to: ${criticalReasons}. Automated approval cap or underwriting guidelines exceeded.`;
  }

  const applicationId = validated.applicationId || `APP-${Date.now().toString().slice(-6)}`;

  return {
    applicationId,
    applicantName: validated.applicantName,
    category,
    workflowStatus: 'pending',
    summary,
    calculation: {
      monthlyEMI: amortization.monthlyEMI,
      totalRepayment: amortization.totalRepayment,
      totalInterest: amortization.totalInterest,
      dti: {
        dtiPercentage: dti.dtiPercentage,
        riskTier: dti.riskTier,
        description: dti.description
      },
      ltv: ltv
        ? {
            ltvPercentage: ltv.ltvPercentage,
            tier: ltv.tier,
            description: ltv.description
          }
        : undefined
    },
    documentAudit: docAudit,
    findings,
    citations,
    evaluatedAt: refDate.toISOString(),
    disclaimer: PRELIMINARY_SCREENING_DISCLAIMER
  };
}
