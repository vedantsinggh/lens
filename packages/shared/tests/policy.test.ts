import { describe, it, expect } from 'vitest';
import {
  SYNTHETIC_POLICY_CORPUS,
  retrieveEligiblePolicies,
  generateGroundedAnswer,
  tokenizeQuery,
  extractMatchedExcerpt,
  PolicyQueryRequestSchema
} from '../src/index.js';

describe('Policy Assistant Retrieval & Grounding Engine', () => {
  describe('tokenizeQuery', () => {
    it('tokenizes and removes common stop words', () => {
      const terms = tokenizeQuery('What is the maximum allowed DTI ratio for a conforming loan?');
      expect(terms).toContain('maximum');
      expect(terms).toContain('allowed');
      expect(terms).toContain('dti');
      expect(terms).toContain('ratio');
      expect(terms).toContain('conforming');
      expect(terms).toContain('loan');
      expect(terms).not.toContain('what');
      expect(terms).not.toContain('is');
      expect(terms).not.toContain('the');
      expect(terms).not.toContain('for');
    });
  });

  describe('retrieveEligiblePolicies', () => {
    it('retrieves current DTI policy for a DTI inquiry', () => {
      const citations = retrieveEligiblePolicies(SYNTHETIC_POLICY_CORPUS, 'debt to income limits');
      expect(citations.length).toBeGreaterThan(0);

      const topCitation = citations[0];
      expect(topCitation?.policyId).toBe('POL-DTI-001');
      expect(topCitation?.section).toContain('Section 3.1');
      expect(topCitation?.matchedExcerpt).toContain('debt against gross monthly income');
      expect(topCitation?.version).toBe('2.1');
    });

    it('strictly excludes superseded policies (POL-DTI-000-OLD must NEVER be returned)', () => {
      // Specifically query for terms in the superseded policy ("50% debt non-prime pre-2024")
      const citations = retrieveEligiblePolicies(SYNTHETIC_POLICY_CORPUS, 'legacy 50% debt obligations');
      const hasSuperseded = citations.some((c) => c.policyId === 'POL-DTI-000-OLD');
      expect(hasSuperseded).toBe(false);

      // Verify that all returned citations are strictly current
      for (const citation of citations) {
        expect(citation.policyId).not.toBe('POL-DTI-000-OLD');
      }
    });

    it('strictly excludes future-effective draft policies (POL-ESG-2028 must NEVER be returned)', () => {
      // Query for terms from the 2028 draft policy ("green energy efficiency solar 2028")
      const citations = retrieveEligiblePolicies(SYNTHETIC_POLICY_CORPUS, 'green energy solar efficiency home score');
      const hasFuture = citations.some((c) => c.policyId === 'POL-ESG-2028');
      expect(hasFuture).toBe(false);
    });

    it('enforces audience filtering on the server', () => {
      // Query for manual review triggers (audience: 'underwriter')
      // When audience is 'borrower', underwriter-only policies must be excluded
      const borrowerCitations = retrieveEligiblePolicies(
        SYNTHETIC_POLICY_CORPUS,
        'manual review triggers credit score 660 escalation',
        { audience: 'borrower' }
      );
      const hasUnderwriterPolicy = borrowerCitations.some((c) => c.policyId === 'POL-REV-001');
      expect(hasUnderwriterPolicy).toBe(false);

      // When audience is 'underwriter' or 'all', POL-REV-001 is eligible
      const underwriterCitations = retrieveEligiblePolicies(
        SYNTHETIC_POLICY_CORPUS,
        'manual review triggers credit score 660 escalation',
        { audience: 'underwriter' }
      );
      const foundInUnderwriter = underwriterCitations.some((c) => c.policyId === 'POL-REV-001');
      expect(foundInUnderwriter).toBe(true);
    });

    it('returns empty array when query has no matching terms or is empty', () => {
      expect(retrieveEligiblePolicies(SYNTHETIC_POLICY_CORPUS, '')).toEqual([]);
      expect(retrieveEligiblePolicies(SYNTHETIC_POLICY_CORPUS, '   ')).toEqual([]);
      expect(retrieveEligiblePolicies(SYNTHETIC_POLICY_CORPUS, 'xyznonexistenttermquantumflux')).toEqual([]);
    });

    it('respects topK parameter and bounds result count', () => {
      const top2 = retrieveEligiblePolicies(SYNTHETIC_POLICY_CORPUS, 'loan application requirements', { topK: 2 });
      expect(top2.length).toBeLessThanOrEqual(2);
    });
  });

  describe('generateGroundedAnswer', () => {
    it('returns clear no-evidence response when citations are empty', () => {
      const response = generateGroundedAnswer('how to fly to mars on cryptocurrency', [], 'all');
      expect(response.hasSufficientEvidence).toBe(false);
      expect(response.citations.length).toBe(0);
      expect(response.answer).toContain('no active, applicable material');
    });

    it('synthesizes answer citing only retrieved sources, with citations matching retrieved set', () => {
      const citations = retrieveEligiblePolicies(SYNTHETIC_POLICY_CORPUS, 'mandatory required documents paystubs w2');
      expect(citations.length).toBeGreaterThan(0);

      const response = generateGroundedAnswer('mandatory required documents paystubs w2', citations, 'all');
      expect(response.hasSufficientEvidence).toBe(true);
      expect(response.citations.length).toBe(citations.length);

      // Verify that every citation ID in response is present in the answer text
      for (const citation of response.citations) {
        expect(response.answer).toContain(citation.policyId);
        expect(response.answer).toContain(citation.version);
        expect(response.answer).toContain(citation.section);
      }

      // Verify disclaimer is present
      expect(response.disclaimer).toContain('Illustrative Demo Material');
    });
  });

  describe('PolicyQueryRequestSchema', () => {
    it('validates correct query request', () => {
      const valid = { query: 'What is the LTV limit?', audience: 'borrower', topK: 3 };
      const parsed = PolicyQueryRequestSchema.parse(valid);
      expect(parsed.query).toBe('What is the LTV limit?');
      expect(parsed.audience).toBe('borrower');
    });

    it('rejects queries that are too short or empty', () => {
      expect(() => PolicyQueryRequestSchema.parse({ query: ' ' })).toThrow();
      expect(() => PolicyQueryRequestSchema.parse({ query: 'a' })).toThrow();
    });

    it('rejects queries exceeding 300 characters', () => {
      const longQuery = 'x'.repeat(305);
      expect(() => PolicyQueryRequestSchema.parse({ query: longQuery })).toThrow();
    });
  });
});
