import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  FileSearch,
  Search,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Sparkles,
  RefreshCw,
  BookOpen,
  Filter
} from 'lucide-react';
import {
  SYNTHETIC_POLICY_DISCLAIMER,
  type PolicyQueryResponse,
  type PolicyCitation,
  type PolicyAudience
} from '@loanlens/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const DEFAULT_SAMPLE_QUESTIONS = [
  {
    label: 'DTI Thresholds',
    query: 'What is the maximum allowable DTI ratio for conventional conforming loans?',
    audience: 'all' as PolicyAudience
  },
  {
    label: 'LTV & PMI Limits',
    query: 'What is the maximum LTV threshold before requiring Private Mortgage Insurance?',
    audience: 'all' as PolicyAudience
  },
  {
    label: 'Self-Employed Docs',
    query: 'What documentation is required to verify income for self-employed borrowers?',
    audience: 'borrower' as PolicyAudience
  },
  {
    label: 'Missing Document Cure',
    query: 'What is the cure period and grace deadline when missing documents are flagged?',
    audience: 'all' as PolicyAudience
  },
  {
    label: 'Manual Review Escalation',
    query: 'When is an application triggered for manual review and Credit Committee exception?',
    audience: 'underwriter' as PolicyAudience
  },
  {
    label: 'No-Evidence Test',
    query: 'Can borrowers use speculative cryptocurrency staking yields as qualifying income?',
    audience: 'all' as PolicyAudience
  }
];

export function PolicyAssistant() {
  const [query, setQuery] = useState<string>(
    'What is the maximum allowable DTI ratio and what compensating factors apply?'
  );
  const [audience, setAudience] = useState<PolicyAudience>('all');
  const [topK, setTopK] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PolicyQueryResponse | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const handleSearch = useCallback(
    async (searchQuery: string, searchAudience: PolicyAudience = audience) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setError('Please enter a policy search query');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/api/policy-assistant/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmed,
            audience: searchAudience,
            topK
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to retrieve policy`);
        }

        const data: PolicyQueryResponse = await res.json();
        setResponse(data);
        // Expand top citation by default for immediate inspectability
        const topCitation = data.citations?.[0];
        if (topCitation) {
          setExpandedCitations({ [topCitation.policyId]: true });
        } else {
          setExpandedCitations({});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Policy search request failed');
      } finally {
        setLoading(false);
      }
    },
    [audience, topK]
  );

  // Run initial search on mount so the user immediately sees a live demonstration
  useEffect(() => {
    handleSearch(query, 'all');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch(query, audience);
  };

  const toggleCitation = (policyId: string) => {
    setExpandedCitations((prev) => ({
      ...prev,
      [policyId]: !prev[policyId]
    }));
  };

  const selectSample = (sample: (typeof DEFAULT_SAMPLE_QUESTIONS)[0]) => {
    setQuery(sample.query);
    setAudience(sample.audience);
    handleSearch(sample.query, sample.audience);
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
      {/* Module Header */}
      <div className="p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-sky-950/20 to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <FileSearch className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-white">
                2. Grounded Policy Assistant
              </h2>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Phase 3 Active
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Deterministic Lexical RAG
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Grounded policy retrieval with strict audience isolation, superseded policy exclusion, and verifiable citations.
            </p>
          </div>
        </div>

        {/* Regulatory & Synthetic Disclaimer Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium text-[11px]">Synthetic Demonstration Material</span>
        </div>
      </div>

      {/* Synthetic Corpus Notice Banner */}
      <div className="bg-amber-950/30 border-b border-amber-500/20 px-6 py-2.5 text-[11px] text-amber-200/90 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-amber-300 font-semibold">Audit Notice:</strong> {SYNTHETIC_POLICY_DISCLAIMER}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Search & Filter Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input Bar */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about DTI, LTV, documentation, or manual reviews..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition"
              />
            </div>

            {/* Audience Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <span className="text-slate-500 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span className="hidden sm:inline">Audience:</span>
              </span>
              {(['all', 'borrower', 'underwriter'] as PolicyAudience[]).map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => {
                    setAudience(aud);
                    handleSearch(query, aud);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium capitalize transition cursor-pointer ${
                    audience === aud
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {aud}
                </button>
              ))}
            </div>

            {/* Top-K Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <span className="text-slate-500 text-[11px]">Top-K:</span>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value={2} className="bg-slate-900">2</option>
                <option value={3} className="bg-slate-900">3</option>
                <option value={5} className="bg-slate-900">5</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs tracking-wide uppercase transition shadow-lg shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Retrieving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Assistant</span>
                </>
              )}
            </button>
          </div>

          {/* Sample Preset Questions */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Suggested Verification Inquiries:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SAMPLE_QUESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSample(s)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    query === s.query
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 font-medium'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                    {s.audience}
                  </span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">Retrieval Error</p>
              <p className="text-xs text-rose-200/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-800/80 rounded w-full"></div>
              <div className="h-3 bg-slate-800/80 rounded w-5/6"></div>
              <div className="h-3 bg-slate-800/80 rounded w-4/6"></div>
            </div>
            <div className="h-8 bg-slate-800/60 rounded w-1/4"></div>
          </div>
        )}

        {/* Response View */}
        {!loading && response && (
          <div className="space-y-6">
            {/* Grounded Answer Card */}
            <div
              className={`p-6 rounded-2xl border ${
                response.hasSufficientEvidence
                  ? 'bg-gradient-to-b from-sky-950/30 via-slate-950 to-slate-950 border-sky-500/30 shadow-lg shadow-sky-950/50'
                  : 'bg-gradient-to-b from-amber-950/20 via-slate-950 to-slate-950 border-amber-500/30 shadow-lg shadow-amber-950/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  {response.hasSufficientEvidence ? (
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {response.hasSufficientEvidence
                        ? 'Grounded Policy Response'
                        : 'No Verified Policy Evidence Found'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {response.hasSufficientEvidence
                        ? 'Claims strictly anchored in the institutional credit policy documents below.'
                        : 'Query terms fell below matching confidence thresholds or lacked institutional precedent.'}
                    </p>
                  </div>
                </div>

                {/* Evidence Status Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                      response.hasSufficientEvidence
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}
                  >
                    {response.hasSufficientEvidence
                      ? '✓ Verified Evidence'
                      : '⚠ Insufficient Grounding'}
                  </span>
                </div>
              </div>

              {/* Synthesized Answer Body */}
              <div className="py-4 text-sm text-slate-200 leading-relaxed font-sans space-y-3">
                {response.answer.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx}>
                    {paragraph.split(/(\[[A-Z0-9-]+ v[\d.]+ - [^\]]+\])/g).map((chunk, cIdx) => {
                      if (chunk.startsWith('[') && chunk.endsWith(']')) {
                        return (
                          <span
                            key={cIdx}
                            className="inline-flex items-center font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 mx-1 select-all"
                            title="Verified Policy Citation"
                          >
                            {chunk}
                          </span>
                        );
                      }
                      return chunk;
                    })}
                  </p>
                ))}
              </div>

              {/* Metadata Footer */}
              <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Latency: {response.retrievalLatencyMs ?? '<5'}ms</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="capitalize">Audience: {response.audience}</span>
                  </span>
                  <span>Matched Sources: {response.citations.length}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Retrieval Method: Lexical BM25-Aligned Scorer
                </div>
              </div>
            </div>

            {/* Citations & Evidence Section */}
            {response.citations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Grounded Source Policies &amp; Audit Excerpts ({response.citations.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Superseded &amp; Future-dated policies strictly excluded
                  </span>
                </div>

                <div className="space-y-3">
                  {response.citations.map((citation: PolicyCitation) => {
                    const isExpanded = !!expandedCitations[citation.policyId];
                    const relevancePercent = Math.min(
                      Math.round(citation.relevanceScore * 100),
                      100
                    );

                    return (
                      <div
                        key={citation.policyId}
                        className="rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition overflow-hidden"
                      >
                        {/* Citation Card Header */}
                        <div
                          onClick={() => toggleCitation(citation.policyId)}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-slate-900/40 hover:bg-slate-900/70 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                                {citation.policyId}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                {citation.version}
                              </span>
                              <span className="text-xs font-semibold text-slate-200">
                                {citation.title}
                              </span>
                              <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 uppercase">
                                {citation.section}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>Effective: {citation.effectiveDate}</span>
                              <span>&bull;</span>
                              <span className="capitalize">Audience: {citation.audience}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Score Indicator */}
                            <div className="text-right">
                              <div className="text-[11px] text-slate-400 font-mono">
                                Score: {citation.relevanceScore.toFixed(2)}
                              </div>
                              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-sky-500 rounded-full"
                                  style={{ width: `${relevancePercent}%` }}
                                ></div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-200 p-1"
                              aria-label={isExpanded ? 'Collapse excerpt' : 'Expand excerpt'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-sky-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Matched Excerpt Box */}
                        <div className="p-4 pt-0 space-y-3">
                          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed">
                            <span className="text-sky-400 font-semibold uppercase text-[10px] block mb-1">
                              Matched Excerpt:
                            </span>
                            &ldquo;{citation.matchedExcerpt}&rdquo;
                          </div>

                          {/* Expanded Full Content Details */}
                          {isExpanded && (
                            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/50 space-y-2 text-xs text-slate-300">
                              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                                <span className="font-semibold text-slate-200">
                                  Full Policy Section Content
                                </span>
                                <span className="text-[11px] font-mono text-emerald-400">
                                  Status: CURRENT
                                </span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap text-slate-300">
                                {citation.fullContent || citation.matchedExcerpt}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
