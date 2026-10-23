import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  FileCheck2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  Database
} from 'lucide-react';
import {
  SYNTHETIC_APPLICATION_PRESETS,
  STANDARD_REQUIRED_DOCUMENTS,
  PRELIMINARY_SCREENING_DISCLAIMER,
  type PreScreeningRequest,
  type PreScreeningResponse,
  type ScreeningCategory,
  type DocumentItem,
  type ReviewWorkflowStatus
} from '@loanlens/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function PreScreening() {
  const [activePresetId, setActivePresetId] = useState<string>('preset-case-prime');
  const [formData, setFormData] = useState<PreScreeningRequest>({
    ...SYNTHETIC_APPLICATION_PRESETS[0]!.application
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreScreeningResponse | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  // Underwriter Review Workflow State
  const [workflowStatus, setWorkflowStatus] = useState<ReviewWorkflowStatus>('pending');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

  // Load preset application
  const applyPreset = useCallback((presetId: string) => {
    const preset = SYNTHETIC_APPLICATION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActivePresetId(presetId);
    setFormData({
      ...preset.application,
      documents: preset.application.documents?.map((d) => ({ ...d })) || []
    });
    setResult(null);
    setError(null);
    setStatusSuccessMessage(null);
  }, []);

  // Run evaluation
  const handleEvaluate = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusSuccessMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/pre-screening/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to evaluate pre-screening`);
      }

      const data: PreScreeningResponse = await res.json();
      setResult(data);
      setWorkflowStatus('pending');

      // Expand first citation by default
      if (data.citations && data.citations.length > 0) {
        setExpandedCitations({ [data.citations[0]!.policyId]: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown evaluation error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle document received status
  const handleToggleDocument = (docId: string) => {
    const currentDocs = formData.documents || [];
    const updated = currentDocs.map((doc) =>
      doc.id === docId ? { ...doc, received: !doc.received } : doc
    );
    setFormData((prev) => ({ ...prev, documents: updated }));
  };

  // Bulk document actions
  const handleSetAllDocs = (received: boolean) => {
    const currentDocs = formData.documents || STANDARD_REQUIRED_DOCUMENTS;
    const updated = currentDocs.map((doc) => ({ ...doc, received }));
    setFormData((prev) => ({ ...prev, documents: updated }));
  };

  // Update Workflow Status (Reviewed / Needs More Information)
  const handleUpdateWorkflowStatus = async (newStatus: ReviewWorkflowStatus) => {
    if (!result?.recordId) {
      // Ephemeral or unpersisted evaluation: update locally only
      setWorkflowStatus(newStatus);
      setStatusSuccessMessage(`Local workflow status marked as "${newStatus}" (Record was not persisted).`);
      return;
    }

    setStatusUpdating(true);
    setStatusSuccessMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/pre-screening/${result.recordId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowStatus: newStatus,
          reviewerNotes: reviewerNotes.trim() || undefined
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update workflow status');
      }

      const data = await res.json();
      setWorkflowStatus(data.workflowStatus);
      setStatusSuccessMessage(
        `Underwriting review status successfully updated to "${newStatus.toUpperCase()}" in audit database.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Run initial evaluation on mount for default preset
  useEffect(() => {
    handleEvaluate();
  }, []);

  const getCategoryTheme = (category: ScreeningCategory) => {
    switch (category) {
      case 'READY_FOR_REVIEW':
        return {
          bg: 'bg-emerald-950/40',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/10',
          badgeBorder: 'border-emerald-500/30',
          icon: CheckCircle2,
          label: 'READY FOR UNDERWRITER REVIEW',
          subtext: 'Complete documentation & prime financial ratios verified against current policies.'
        };
      case 'NEEDS_INFORMATION':
        return {
          bg: 'bg-amber-950/40',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-500/10',
          badgeBorder: 'border-amber-500/30',
          icon: AlertTriangle,
          label: 'INFORMATION REQUIRED (CURE PERIOD)',
          subtext: 'Mandatory verification documentation missing. Granted standard 14-day cure window.'
        };
      case 'MANUAL_REVIEW':
        return {
          bg: 'bg-purple-950/40',
          border: 'border-purple-500/40',
          text: 'text-purple-400',
          badgeBg: 'bg-purple-500/10',
          badgeBorder: 'border-purple-500/30',
          icon: ShieldAlert,
          label: 'MANDATORY MANUAL UNDERWRITING ESCALATION',
          subtext: 'Financial ceiling, credit score threshold, or business tenure requires Senior Committee review.'
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Agentic Pre-Screening
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Phase 4 Active
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Human Decision Bound
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic loan application validation, policy citation audit, and explainable underwriter assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleEvaluate()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-lg shadow-purple-950 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Auditing Application...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Evaluate Application</span>
            </>
          )}
        </button>
      </div>

      {/* Synthetic Application Preset Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            Select Synthetic Case Preset
          </span>
          <span className="text-[11px] text-slate-500">Fast test scenarios</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SYNTHETIC_APPLICATION_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`text-left p-3.5 rounded-xl border transition cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-950/50'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-white leading-tight">
                    {preset.name}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 border ${
                      preset.expectedCategory === 'READY_FOR_REVIEW'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : preset.expectedCategory === 'NEEDS_INFORMATION'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Application Form (Left) & Screening Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Editable Synthetic Application Form */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleEvaluate}
            className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 space-y-5 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-purple-400" />
                Synthetic Application Data
              </h3>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {formData.applicationId}
              </span>
            </div>

            {/* Applicant Name & Credit Score */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  value={formData.applicantName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, applicantName: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Credit Score (FICO)
                </label>
                <input
                  type="number"
                  min="300"
                  max="850"
                  value={formData.creditScore ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      creditScore: e.target.value ? Number(e.target.value) : undefined
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Loan Principal, APR, Term */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Principal ($)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={formData.principal}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, principal: Number(e.target.value) }))
                  }
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  APR (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.05"
                  value={formData.annualRate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, annualRate: Number(e.target.value) }))
                  }
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Term (Mo)
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={formData.termMonths}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, termMonths: Number(e.target.value) }))
                  }
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Income, Debt, Asset Value */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Monthly Income ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.grossMonthlyIncome}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      grossMonthlyIncome: Number(e.target.value)
                    }))
                  }
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Monthly Debt ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.existingMonthlyDebt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      existingMonthlyDebt: Number(e.target.value)
                    }))
                  }
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Property Asset ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.assetValue ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assetValue: e.target.value ? Number(e.target.value) : undefined
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Employment Type & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Employment Type
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      employmentType: e.target.value as 'salaried' | 'self_employed'
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="salaried">W-2 Salaried / Employed</option>
                  <option value="self_employed">Self-Employed / 1099</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Tenure (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={formData.employmentMonths}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      employmentMonths: Number(e.target.value)
                    }))
                  }
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Document Checklist Section */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Mandatory Documentation Checklist
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Audit borrower submission package against POL-DOC-001
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleSetAllDocs(true)}
                    className="text-purple-400 hover:text-purple-300 font-medium px-1.5 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 transition cursor-pointer"
                  >
                    Check All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllDocs(false)}
                    className="text-slate-400 hover:text-slate-300 font-medium px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {(formData.documents || STANDARD_REQUIRED_DOCUMENTS).map((doc: DocumentItem) => (
                  <label
                    key={doc.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition cursor-pointer ${
                      doc.received
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={doc.received}
                      onChange={() => handleToggleDocument(doc.id)}
                      className="mt-0.5 rounded border-slate-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-slate-200">
                          {doc.name}
                        </span>
                        {doc.received ? (
                          <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                            Received
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-medium px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                            Missing
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{doc.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md shadow-purple-950 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Application...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Preliminary Screening</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Preliminary Screening Assessment Report */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-rose-300">Screening Evaluation Error</p>
                <p className="text-xs text-rose-200/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {result ? (
            <div className="space-y-6">
              {/* Screening Category Decision Card */}
              {(() => {
                const theme = getCategoryTheme(result.category);
                const CategoryIcon = theme.icon;
                return (
                  <div
                    className={`rounded-2xl ${theme.bg} border ${theme.border} p-6 shadow-lg relative overflow-hidden space-y-4`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl ${theme.badgeBg} border ${theme.badgeBorder} flex items-center justify-center ${theme.text}`}
                        >
                          <CategoryIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                              Preliminary Classification
                            </span>
                            {result.persistenceStatus === 'persisted' && (
                              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                Audit Persisted
                              </span>
                            )}
                          </div>
                          <h3 className={`text-base sm:text-lg font-extrabold ${theme.text} tracking-tight`}>
                            {theme.label}
                          </h3>
                        </div>
                      </div>

                      {/* Workflow Status Pill */}
                      <div className="sm:text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">Review Status</span>
                        <span
                          className={`inline-block mt-0.5 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            workflowStatus === 'reviewed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : workflowStatus === 'needs_more_info'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {workflowStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                      {result.summary}
                    </p>
                  </div>
                );
              })()}

              {/* Deterministic Financial Metrics Card */}
              <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-purple-400" />
                    Audited Financial Calculations (Deterministic)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    30-Year Actuarial Standard
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {/* Proposed Monthly EMI */}
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Proposed EMI
                    </span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">
                      ${result.calculation?.monthlyEMI ? result.calculation.monthlyEMI.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                    <span className="text-[10px] text-slate-400">Principal + Interest</span>
                  </div>

                  {/* Calculated DTI Ratio */}
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Back-End DTI
                    </span>
                    <span
                      className={`text-base font-bold font-mono mt-0.5 block ${
                        (result.calculation?.dti?.dtiPercentage ?? 0) <= 36
                          ? 'text-emerald-400'
                          : (result.calculation?.dti?.dtiPercentage ?? 0) <= 45
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {result.calculation?.dti ? `${result.calculation.dti.dtiPercentage.toFixed(2)}%` : 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">
                      {result.calculation?.dti?.riskTier ? result.calculation.dti.riskTier.replace('_', ' ') : 'Standard'}
                    </span>
                  </div>

                  {/* Calculated LTV Ratio */}
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Loan-to-Value
                    </span>
                    <span
                      className={`text-base font-bold font-mono mt-0.5 block ${
                        (result.calculation?.ltv?.ltvPercentage ?? 0) <= 80
                          ? 'text-emerald-400'
                          : (result.calculation?.ltv?.ltvPercentage ?? 0) <= 95
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {result.calculation?.ltv ? `${result.calculation.ltv.ltvPercentage.toFixed(1)}%` : 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">
                      {result.calculation?.ltv?.tier ? `${result.calculation.ltv.tier.replace('_', ' ')} tier` : 'Asset unassessed'}
                    </span>
                  </div>

                  {/* Total Repayment */}
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Total Cost
                    </span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">
                      ${result.calculation?.totalRepayment ? result.calculation.totalRepayment.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Interest: ${result.calculation?.totalInterest ? result.calculation.totalInterest.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Missing Documents Alert Banner (if applicable) */}
              {!result.documentAudit.allRequiredPresent && (
                <div className="rounded-2xl bg-amber-950/30 border border-amber-500/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">
                      Missing Mandatory Documents ({result.documentAudit.missingRequired.length} items flagged)
                    </span>
                  </div>
                  <ul className="text-xs text-amber-200/90 pl-6 list-disc space-y-1">
                    {result.documentAudit.missingRequired.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-300/80 pt-1">
                    Under <strong className="text-amber-200">POL-DOC-002</strong>, the file is held in "Needs More Information" status with a 14-day cure deadline before escalation.
                  </p>
                </div>
              )}

              {/* Explainable Findings List */}
              <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-400" />
                    Explainable Underwriting Findings ({result.findings.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Traced to synthetic policies
                  </span>
                </div>

                <div className="space-y-3">
                  {result.findings.map((finding, idx) => {
                    const isCritical = finding.severity === 'critical';
                    const isWarning = finding.severity === 'warning';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition ${
                          isCritical
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : isWarning
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                isCritical
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : isWarning
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {finding.severity}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {finding.title}
                            </span>
                          </div>
                          {finding.relatedPolicyId && (
                            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 shrink-0">
                              {finding.relatedPolicyId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                          {finding.message}
                        </p>
                        {finding.policySection && (
                          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                            <span className="text-slate-500">Cited Section:</span>
                            <span>{finding.policySection}</span>
                            {finding.policyVersion && (
                              <span className="text-purple-400">v{finding.policyVersion}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grounded Policy Citations (Expandable) */}
              <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Supporting Synthetic Policy Citations ({result.citations.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Lexically verified corpus
                  </span>
                </div>

                <div className="space-y-3">
                  {result.citations.map((citation) => {
                    const isExpanded = Boolean(expandedCitations[citation.policyId]);
                    return (
                      <div
                        key={citation.policyId}
                        className="rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCitations((prev) => ({
                              ...prev,
                              [citation.policyId]: !prev[citation.policyId]
                            }))
                          }
                          className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-900/50 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-mono font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {citation.policyId}
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {citation.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 hidden sm:inline-block">
                              {(citation.relevanceScore * 100).toFixed(0)}% match
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-3.5 border-t border-slate-800/60 bg-slate-900/20 space-y-3">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono">
                              <span>Section: {citation.section}</span>
                              <span>&bull;</span>
                              <span>Version: {citation.version}</span>
                              <span>&bull;</span>
                              <span>Audience: {citation.audience}</span>
                              <span>&bull;</span>
                              <span>Effective: {citation.effectiveDate}</span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                              {citation.matchedExcerpt}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviewer Workflow Controls Card */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-purple-500/30 p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-white">
                      Underwriter Review Workflow Controls
                    </h4>
                  </div>
                  <span className="text-[11px] text-purple-400 font-mono">
                    Human Authority Mandatory
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Update the preliminary workflow disposition. These actions represent human reviewer case progression, not autonomous credit approvals or rejections.
                </p>

                {statusSuccessMessage && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{statusSuccessMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Reviewer Committee Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Enter audit rationale, compensating factor observations, or document requirements..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateWorkflowStatus('reviewed')}
                    disabled={statusUpdating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Reviewed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateWorkflowStatus('needs_more_info')}
                    disabled={statusUpdating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-950 transition cursor-pointer disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Request More Information</span>
                  </button>

                  {result.recordId && (
                    <span className="text-[10px] text-slate-500 font-mono ml-auto">
                      Audit Record ID: {result.recordId.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>

              {/* Safety & Compliance Disclaimer */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                  Preliminary Screening Guardrail &amp; Underwriting Policy Notice
                </p>
                <p className="leading-relaxed">
                  {result.disclaimer || PRELIMINARY_SCREENING_DISCLAIMER}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">
                Ready to Evaluate Loan Application
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select a preset synthetic application or edit applicant inputs, then click "Evaluate Application" to run deterministic checks and policy retrieval.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
