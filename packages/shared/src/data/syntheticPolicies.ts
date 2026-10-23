import type { PolicyDocument } from '../types/policy.js';

/**
 * Synthetic Credit Underwriting Policy Corpus
 *
 * NOTE: For hackathon demonstration purposes only.
 * Contains at least 10 sections including active current guidelines,
 * one superseded historical policy (for filter testing), and one future-dated policy.
 */
export const SYNTHETIC_POLICY_CORPUS: PolicyDocument[] = [
  // 1. Illustrative DTI Thresholds (Current)
  {
    policyId: 'POL-DTI-001',
    title: 'Conforming Debt-to-Income (DTI) Ratios and Thresholds',
    section: 'Section 3.1: DTI Eligibility Limits',
    category: 'Affordability',
    audience: 'all',
    effectiveDate: '2024-01-01T00:00:00.000Z',
    version: '2.1',
    status: 'current',
    content:
      'Standard conforming loan applications evaluate maximum monthly debt against gross monthly income. Tier 1 Prime: Total DTI equal to or less than 36.00% qualifies for expedited automated underwriting. Tier 2 Moderate: DTI between 36.01% and 43.00% is acceptable if the borrower maintains at least 3 months of liquid cash reserves. Tier 3 Ceiling: DTI exceeding 43.00% is strictly non-conforming and triggers mandatory senior underwriter escalation. Under no circumstances may an automated system approve a loan exceeding 45.00% DTI without credit committee review.',
    keywords: ['dti', 'debt to income', 'ratio', '36%', '43%', 'reserves', 'conforming', 'affordability', 'limits']
  },

  // 2. Legacy / Superseded DTI Policy (Superseded - MUST BE FILTERED OUT)
  {
    policyId: 'POL-DTI-000-OLD',
    title: 'Legacy Maximum Debt Obligations Ratio (Superseded)',
    section: 'Section 3.1-Legacy: Pre-2024 DTI Rules',
    category: 'Affordability',
    audience: 'underwriter',
    effectiveDate: '2020-01-01T00:00:00.000Z',
    version: '1.0',
    status: 'superseded', // EXCLUDED from current retrieval
    content:
      'SUPERSEDED: Borrowers may be considered for non-prime consumer lending with debt ratios up to 50.00% without documented cash reserve requirements. This historical rule was decommissioned and replaced by POL-DTI-001 on January 1, 2024, and must no longer be used for active underwriting evaluations.',
    keywords: ['superseded', 'legacy', 'dti', '50%', 'old']
  },

  // 3. Illustrative LTV Thresholds (Current)
  {
    policyId: 'POL-LTV-001',
    title: 'Loan-to-Value (LTV) and Collateral Requirements',
    section: 'Section 4.2: Collateral Valuation & Equity Tiers',
    category: 'Collateral',
    audience: 'all',
    effectiveDate: '2024-01-01T00:00:00.000Z',
    version: '2.0',
    status: 'current',
    content:
      'Collateral loan-to-value (LTV) limits dictate required equity and credit enhancement. Tier 1 Standard: LTV at or below 80.00% requires no private mortgage insurance (PMI). Tier 2 Elevated LTV: LTV between 80.01% and 95.00% requires borrower-paid mortgage insurance or a secondary corporate guarantee. Tier 3 High Leverage: LTV exceeding 95.00% is prohibited for conventional financing and requires first-time homebuyer subsidy or specialized secondary collateral coverage.',
    keywords: ['ltv', 'loan to value', 'collateral', 'equity', '80%', '95%', 'pmi', 'mortgage insurance']
  },

  // 4. Minimum Income & Employment History (Current)
  {
    policyId: 'POL-EMP-001',
    title: 'Employment Stability and Minimum Income Verification',
    section: 'Section 2.4: Employment Continuity Standards',
    category: 'Eligibility',
    audience: 'all',
    effectiveDate: '2024-03-15T00:00:00.000Z',
    version: '2.2',
    status: 'current',
    content:
      'Wage earners must demonstrate at least 24 consecutive months of stable employment in the same industry or line of work. Job transitions within the last 12 months require written employer verification confirming non-probationary status. Self-employed borrowers require a minimum 2-year history of profitable business tax filings (Form 1040 Schedule C or K-1). Minimum qualifying gross annual income for standard personal lending is $24,000 ($2,000 monthly).',
    keywords: ['employment', 'income', '24 months', 'self-employed', 'stability', 'probation', '2 years', 'w-2']
  },

  // 5. Required Application Documents (Current)
  {
    policyId: 'POL-DOC-001',
    title: 'Mandatory Borrower Documentation Checklist',
    section: 'Section 5.1: Initial Application Submissions',
    category: 'Documentation',
    audience: 'all',
    effectiveDate: '2024-01-01T00:00:00.000Z',
    version: '3.0',
    status: 'current',
    content:
      'All loan applications require submission of the following verified documents prior to underwriting review: 1) Government-issued photo identification (Passport or Driver License); 2) Most recent 30 consecutive days of paystubs; 3) Last 2 years of W-2 statements or 1099 tax returns; 4) Most recent 2 months of complete asset bank statements demonstrating sufficient funds for closing and reserves; and 5) Signed electronic credit disclosure authorization (Consent Form 1003).',
    keywords: ['documents', 'checklist', 'paystubs', 'w-2', 'bank statements', 'id', 'license', 'requirements']
  },

  // 6. Missing-Document Handling & Cure Periods (Current)
  {
    policyId: 'POL-DOC-002',
    title: 'Incomplete Documentation and Application Cure Periods',
    section: 'Section 5.3: Missing Documents & Expirations',
    category: 'Documentation',
    audience: 'borrower',
    effectiveDate: '2024-01-01T00:00:00.000Z',
    version: '2.0',
    status: 'current',
    content:
      'When required application documentation is incomplete, missing, or illegible, the application status transitions to Pending Documentation. The applicant receives written notification specifying missing items and is granted a 14-calendar-day cure period. If requested documentation is not received within 14 days, a second notice is issued granting a 7-day final extension. Bank statements older than 90 days or paystubs older than 60 days are expired and must be refreshed.',
    keywords: ['missing documents', 'incomplete', 'cure period', '14 days', 'pending', 'expired', 'bank statement']
  },

  // 7. Manual-Review Triggers (Current)
  {
    policyId: 'POL-REV-001',
    title: 'Automated Decisioning Escalation and Manual Review Triggers',
    section: 'Section 6.2: Exception and Escalation Triggers',
    category: 'Underwriting',
    audience: 'underwriter',
    effectiveDate: '2024-02-01T00:00:00.000Z',
    version: '2.1',
    status: 'current',
    content:
      'Automated underwriting systems may recommend approval but must route applications for mandatory manual review by a human underwriter when any of the following triggers occur: 1) Credit score is below 660; 2) DTI ratio is between 43.01% and 45.00%; 3) Large non-payroll deposit exceeding 50% of monthly income appears on bank statements; 4) Unresolved tax lien or civil judgment on credit bureau report; or 5) Discrepancy between stated income and verified IRS transcripts.',
    keywords: ['manual review', 'triggers', 'escalation', 'underwriter', 'credit score 660', 'large deposit', 'discrepancy']
  },

  // 8. Policy Exceptions and Escalation Protocols (Current)
  {
    policyId: 'POL-EXC-001',
    title: 'Credit Policy Exceptions and Credit Committee Escalations',
    section: 'Section 7.4: Governance & Exception Authority',
    category: 'Governance',
    audience: 'underwriter',
    effectiveDate: '2024-01-01T00:00:00.000Z',
    version: '2.0',
    status: 'current',
    content:
      'Underwriters may request an exception to policy for loans with strong compensating factors. Allowed compensating factors include: verified liquid reserves exceeding 12 months of total debt payments, substantial verified unencumbered assets, or loan-to-value below 65%. Exceptions must be documented in writing with a comprehensive risk mitigation rationale and require dual sign-off from a Senior Underwriting Manager and the Chief Risk Officer. AI recommendation agents have zero authority to grant policy exceptions.',
    keywords: ['exceptions', 'credit committee', 'compensating factors', 'reserves', 'cro', 'escalation', 'sign-off']
  },

  // 9. Identity Verification and Anti-Fraud Procedures (Current)
  {
    policyId: 'POL-FRAUD-001',
    title: 'Borrower Identity Verification and Red Flag Reductions',
    section: 'Section 1.3: KYC and Fraud Prevention Safeguards',
    category: 'Compliance',
    audience: 'all',
    effectiveDate: '2024-04-01T00:00:00.000Z',
    version: '2.0',
    status: 'current',
    content:
      'Customer Identification Program (CIP) and Know Your Customer (KYC) requirements must be verified against government databases before credit issuance. Red flag triggers include: address discrepancy between credit bureau and utility bill, multiple SSN inquiries across multiple states within 30 days, or mismatched borrower date of birth. Any detected identity discrepancy requires biometric or in-person notarized identification validation.',
    keywords: ['identity', 'fraud', 'kyc', 'cip', 'ssn', 'red flags', 'verification', 'discrepancy']
  },

  // 10. Future-Dated Policy (Future-Effective - MUST BE FILTERED OUT)
  {
    policyId: 'POL-ESG-2028',
    title: 'Mandatory Green Energy Efficiency Concessions (Draft 2028)',
    section: 'Section 8.1: Future Green Standards',
    category: 'Sustainability',
    audience: 'all',
    effectiveDate: '2028-01-01T00:00:00.000Z', // FUTURE DATE: Must be excluded from active policies
    version: '1.0',
    status: 'draft',
    content:
      'FUTURE REGULATION (NOT YET EFFECTIVE): Effective January 1, 2028, all residential properties securing loans over $500,000 must produce a certified Home Energy Score (HES) of 7 or higher. Solar installation grants of 0.25% interest rate reductions will be applicable. This guideline is currently in draft status and must NOT be applied to current loan approvals.',
    keywords: ['green', 'energy', '2028', 'future', 'draft', 'solar']
  }
];
