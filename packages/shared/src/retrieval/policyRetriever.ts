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
  'any', 'some', 'if', 'then', 'than', 'of', 'by', 'as', 'it', 'this', 'that'
]);

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
      if (lower.includes(term)) {
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

    // Check exact phrase match bonus
    if (contentLower.includes(queryLower)) {
      rawScore += 4.0;
    }
    if (titleLower.includes(queryLower)) {
      rawScore += 5.0;
    }

    // Term-by-term scoring
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        rawScore += 2.5;
      }
      if (keywordsLower.some((k) => k.includes(term))) {
        rawScore += 2.0;
      }
      if (contentLower.includes(term)) {
        rawScore += 1.0;
      }
    }

    // Normalize score into [0, 1] range based on query term count
    const maxPossibleScore = Math.max(1, queryTerms.length * 3.5 + 4.0);
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

  return scoredPolicies.slice(0, topK);
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
