import type { PreScreeningRequest, DocumentItem } from '../types/prescreening.js';

export const STANDARD_REQUIRED_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-gov-id',
    name: 'Government Photo Identification',
    received: false,
    required: true,
    description: 'Unexpired state driver license, national passport, or official military ID card.'
  },
  {
    id: 'doc-paystubs',
    name: 'Recent Consecutive Paystubs (30 Days)',
    received: false,
    required: true,
    description: 'Most recent 30 consecutive calendar days of verified payroll stubs showing YTD earnings.'
  },
  {
    id: 'doc-tax-returns',
    name: 'Tax Filings & W-2s (Last 2 Years)',
    received: false,
    required: true,
    description: 'Signed IRS Form 1040s, W-2s, or Form 1099s (Schedule C/K-1 required for self-employed).'
  },
  {
    id: 'doc-bank-statements',
    name: 'Asset Bank Statements (2 Months)',
    received: false,
    required: true,
    description: 'Most recent 2 full calendar months of complete depository and liquid reserve bank statements.'
  },
  {
    id: 'doc-credit-disclosure',
    name: 'Credit Disclosure Authorization',
    received: false,
    required: true,
    description: 'Signed electronic borrower credit report and information disclosure consent (Form 1003).'
  }
];

export interface SyntheticApplicationPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  expectedCategory: 'READY_FOR_REVIEW' | 'NEEDS_INFORMATION' | 'MANUAL_REVIEW';
  application: PreScreeningRequest;
}

export function createChecklist(receivedMap: Record<string, boolean> = {}): DocumentItem[] {
  return STANDARD_REQUIRED_DOCUMENTS.map((doc) => ({
    ...doc,
    received: Boolean(receivedMap[doc.id])
  }));
}

export const SYNTHETIC_APPLICATION_PRESETS: SyntheticApplicationPreset[] = [
  {
    id: 'preset-case-prime',
    name: 'Case 1: Prime Salaried Conforming',
    badge: 'Ready for Review',
    description: 'Complete documentation, prime DTI (23.2%), low LTV (70%), 4+ years employment tenure.',
    expectedCategory: 'READY_FOR_REVIEW',
    application: {
      applicationId: 'APP-2026-0819',
      applicantName: 'Sarah Jenkins (Synthetic Prime)',
      principal: 350000,
      annualRate: 6.25,
      termMonths: 360,
      grossMonthlyIncome: 12500,
      existingMonthlyDebt: 750,
      assetValue: 500000,
      employmentType: 'salaried',
      employmentMonths: 54,
      creditScore: 765,
      documents: createChecklist({
        'doc-gov-id': true,
        'doc-paystubs': true,
        'doc-tax-returns': true,
        'doc-bank-statements': true,
        'doc-credit-disclosure': true
      })
    }
  },
  {
    id: 'preset-case-missing-docs',
    name: 'Case 2: Self-Employed with Missing Documents',
    badge: 'Needs Information',
    description: 'Self-employed consultant, sound income, but missing 2-year tax returns and bank statements.',
    expectedCategory: 'NEEDS_INFORMATION',
    application: {
      applicationId: 'APP-2026-0422',
      applicantName: 'Marcus Vance (Synthetic Incomplete)',
      principal: 420000,
      annualRate: 6.75,
      termMonths: 360,
      grossMonthlyIncome: 14000,
      existingMonthlyDebt: 950,
      assetValue: 520000,
      employmentType: 'self_employed',
      employmentMonths: 38,
      creditScore: 710,
      documents: createChecklist({
        'doc-gov-id': true,
        'doc-paystubs': true,
        'doc-tax-returns': false, // Missing tax returns (Schedule C)
        'doc-bank-statements': false, // Missing bank statements
        'doc-credit-disclosure': true
      })
    }
  },
  {
    id: 'preset-case-manual-review',
    name: 'Case 3: High-DTI & Score Escalation',
    badge: 'Manual Review',
    description: 'Complete documentation, but elevated DTI (46.8%) exceeding automated conforming ceiling and credit score below 660.',
    expectedCategory: 'MANUAL_REVIEW',
    application: {
      applicationId: 'APP-2026-0904',
      applicantName: 'David Chen (Synthetic Escalation)',
      principal: 440000,
      annualRate: 7.25,
      termMonths: 360,
      grossMonthlyIncome: 7500,
      existingMonthlyDebt: 500,
      assetValue: 470000,
      employmentType: 'salaried',
      employmentMonths: 18,
      creditScore: 645, // Triggers POL-REV-001 (score < 660)
      documents: createChecklist({
        'doc-gov-id': true,
        'doc-paystubs': true,
        'doc-tax-returns': true,
        'doc-bank-statements': true,
        'doc-credit-disclosure': true
      })
    }
  }
];

