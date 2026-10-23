import type {
  PolicyDocument,
  PolicyCitation,
  PolicyAudience,
  PolicyQueryResponse
} from '../types/policy.js';
import { SYNTHETIC_POLICY_DISCLAIMER } from '../types/policy.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'about',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'may', 'might',
  'must', 'shall', 'will', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
  'any', 'some', 'if', 'then', 'than', 'of', 'by', 'as', 'it', 'this', 'that',
  // Conversational meta-query words that describe queries rather than credit topics
  'policy', 'policies', 'guideline', 'guidelines', 'rule', 'rules', 'standard',
  'standards', 'provide', 'tell', 'give', 'happen', 'happens'
]);

/**
 * Normalizes common English word endings to their root/stem.
 */
export function stemTerm(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith('ation')) return w.slice(0, -5);
  if (w.endsWith('ment')) return w.slice(0, -4);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  return w;
}

/**
 * Checks if target string matches term directly or via stem.
 */
function matchesToken(target: string, term: string, stem: string): boolean {
  return target.includes(term) || (stem.length >= 3 && target.includes(stem));
}

/**
 * Tokenizes and normalizes text into alphanumeric search terms, filtering common stop words.
 */
export function tokenizeQuery(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Extracts a concise matched excerpt (1-2 sentences) from policy content matching query terms.
 */
export function extractMatchedExcerpt(content: string, queryTerms: string[]): string {
  const sentences = content.split(/(?<=[.!?])\s+/);
  const scoredSentences = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const stem = stemTerm(term);
      if (matchesToken(lower, term, stem)) {
        score += 1;
      }
    }
    return { sentence, score };
  });

  scoredSentences.sort((a, b) => b.score - a.score);

  const bestSentences = scoredSentences.filter((s) => s.score > 0).slice(0, 2);
  if (bestSentences.length > 0) {
    return bestSentences.map((s) => s.sentence).join(' ');
  }

  // Fallback to first sentence if no specific sentence scored higher
  return sentences[0] || content.slice(0, 150);
}

/**
 * High-precision lexical retrieval engine with pre-retrieval status, date, and audience filtering.
 */
export function retrieveEligiblePolicies(
  corpus: PolicyDocument[],
  query: string,
  options: {
    audience?: PolicyAudience;
    topK?: number;
    referenceDate?: Date;
    minScoreThreshold?: number;
  } = {}
): PolicyCitation[] {
  const {
    audience = 'all',
    topK = 4,
    referenceDate = new Date(),
    minScoreThreshold = 0.15
  } = options;

  const queryTerms = tokenizeQuery(query);
  if (queryTerms.length === 0) {
    return [];
  }

  const queryLower = query.toLowerCase().trim();
  const refTime = referenceDate.getTime();

  // 1. Strict Eligibility Pre-Filtering
  const eligiblePolicies = corpus.filter((policy) => {
    // Invariant 1: Exclude superseded policies
    if (policy.status === 'superseded') {
      return false;
    }

    // Invariant 2: Exclude future-effective or draft policies
    const effectiveTime = new Date(policy.effectiveDate).getTime();
    if (policy.status !== 'current' || effectiveTime > refTime) {
      return false;
    }

    // Invariant 3: Enforce audience boundaries on server
    if (audience !== 'all' && policy.audience !== 'all' && policy.audience !== audience) {
      return false;
    }

    return true;
  });

  // 2. Lexical Relevance Scoring
  const scoredPolicies: PolicyCitation[] = [];

  for (const policy of eligiblePolicies) {
    const titleLower = policy.title.toLowerCase();
    const contentLower = policy.content.toLowerCase();
    const keywordsLower = policy.keywords.map((k) => k.toLowerCase());

    let rawScore = 0;
    let matchedTermsCount = 0;

    // Check exact phrase match bonus
    if (contentLower.includes(queryLower)) {
      rawScore += 5.0;
    }
    if (titleLower.includes(queryLower)) {
      rawScore += 6.0;
    }

    // Term-by-term scoring with stem normalization
    for (const term of queryTerms) {
      const stem = stemTerm(term);
      let termMatched = false;

      if (policy.policyId.toLowerCase().includes(term)) {
        rawScore += 10.0;
        termMatched = true;
      }
      if (matchesToken(titleLower, term, stem)) {
        rawScore += 3.5;
        termMatched = true;
      }
      if (keywordsLower.some((k) => matchesToken(k, term, stem))) {
        rawScore += 3.0;
        termMatched = true;
      }
      if (matchesToken(contentLower, term, stem)) {
        rawScore += 1.5;
        termMatched = true;
      }

      if (termMatched) {
        matchedTermsCount += 1;
      }
    }

    // Minimum coverage requirement: multi-term queries must match at least 2 terms (or >= 50%)
    // Prevents accidental keyword collisions on unsupported topics (e.g. "crypto staking collateral")
    const isSingleTerm = queryTerms.length === 1;
    const meetsCoverage = isSingleTerm
      ? matchedTermsCount >= 1
      : queryTerms.length === 2
      ? matchedTermsCount >= 1
      : matchedTermsCount >= 2;

    if (!meetsCoverage) {
      continue;
    }

    // Normalize score into [0, 1] range based on query term count
    const maxPossibleScore = Math.max(1, queryTerms.length * 4.0 + 4.0);
    const normalizedScore = Math.min(1.0, Math.round((rawScore / maxPossibleScore) * 100) / 100);

    if (normalizedScore >= minScoreThreshold) {
      const matchedExcerpt = extractMatchedExcerpt(policy.content, queryTerms);
      scoredPolicies.push({
        policyId: policy.policyId,
        title: policy.title,
        section: policy.section,
        version: policy.version,
        matchedExcerpt,
        fullContent: policy.content,
        relevanceScore: normalizedScore,
        audience: policy.audience,
        effectiveDate: policy.effectiveDate
      });
    }
  }

  // Sort descending by relevance score
  scoredPolicies.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const topCandidate = scoredPolicies[0];
  if (!topCandidate) {
    return [];
  }
  const topScore = topCandidate.relevanceScore;
  const relativeThreshold = Math.max(minScoreThreshold, topScore * 0.65);
  let filtered = scoredPolicies.filter((p) => p.relevanceScore >= relativeThreshold);

  // Subject Acronym Specificity Guardrail:
  // If query specifies "dti", exclude tangential collateral/LTV policies lacking DTI terms
  if (queryTerms.includes('dti')) {
    const dtiMatches = filtered.filter((p) => {
      const text = (p.title + ' ' + (p.fullContent || '')).toLowerCase();
      return text.includes('dti') || text.includes('debt-to-income') || text.includes('debt to income');
    });
    if (dtiMatches.length > 0) {
      filtered = dtiMatches;
    }
  }

  // Document Intent Guardrail:
  // If query specifies documents/checklist ("documents", "checklist"), prioritize documentation
  // and employment verification policies, dropping tangential calculation-only guidelines
  const isDocQuery = queryTerms.some((t) => stemTerm(t) === 'document' || t === 'checklist');
  if (isDocQuery) {
    const docMatches = filtered.filter((p) => {
      const text = (p.title + ' ' + (p.fullContent || '')).toLowerCase();
      return (
        text.includes('document') ||
        text.includes('checklist') ||
        text.includes('paystub') ||
        text.includes('w-2') ||
        text.includes('tax return') ||
        text.includes('tax filing') ||
        text.includes('1040') ||
        text.includes('self-employed')
      );
    });
    if (docMatches.length > 0) {
      filtered = docMatches;
    }
  }

  return filtered.slice(0, topK);
}

/**
 * Grounded extractive answer synthesizer.
 * Synthesizes an honest answer supported solely by retrieved excerpts.
 * Never invents citations or rules.
 */
export function generateGroundedAnswer(
  query: string,
  citations: PolicyCitation[],
  audience: PolicyAudience = 'all'
): PolicyQueryResponse {
  if (citations.length === 0) {
    return {
      query,
      audience,
      answer:
        'The current synthetic credit policy guidelines contain no active, applicable material addressing this inquiry. Please verify that the question pertains to supported conforming lending criteria or check underwriter escalation procedures.',
      hasSufficientEvidence: false,
      citations: [],
      retrievedCount: 0,
      disclaimer: SYNTHETIC_POLICY_DISCLAIMER,
      retrievalMethod: 'Lexical full-text term scoring with strict status/date/audience pre-filtering'
    };
  }

  // Build grounded response directly citing retrieved sections
  const answerParagraphs: string[] = [];

  answerParagraphs.push(
    `Based strictly on current credit underwriting guidelines (retrieved ${citations.length} applicable section${
      citations.length > 1 ? 's' : ''
    }):`
  );

  citations.forEach((citation, index) => {
    answerParagraphs.push(
      `${index + 1}. [${citation.policyId} v${citation.version} - ${citation.section}]: "${citation.matchedExcerpt}"`
    );
  });

  const synthesizedAnswer = answerParagraphs.join('\n\n');

  return {
    query,
    audience,
    answer: synthesizedAnswer,
    hasSufficientEvidence: true,
    citations,
    retrievedCount: citations.length,
    disclaimer: SYNTHETIC_POLICY_DISCLAIMER,
    retrievalMethod: 'Lexical full-text term scoring with strict status/date/audience pre-filtering'
  };
}
