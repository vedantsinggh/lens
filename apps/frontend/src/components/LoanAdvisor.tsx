import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Calculator,
  DollarSign,
  Percent,
  Calendar,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Database,
  Table,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  SYNTHETIC_DEMO_PRESETS,
  type DemoPreset,
  type LoanCalculationResponse,
  type AmortizationRow
} from '@loanlens/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function LoanAdvisor() {
  // Input states
  const [principal, setPrincipal] = useState<number>(400000);
  const [annualRate, setAnnualRate] = useState<number>(6.5);
  const [termMonths, setTermMonths] = useState<number>(360);
  const [termUnit, setTermUnit] = useState<'months' | 'years'>('years');
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState<string>('12500');
  const [existingMonthlyDebt, setExistingMonthlyDebt] = useState<string>('650');
  const [assetValue, setAssetValue] = useState<string>('500000');
  const [selectedPreset, setSelectedPreset] = useState<string>('preset-prime-mortgage');

  // UI state
  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);
  const [amortizationView, setAmortizationView] = useState<'first12' | 'yearly' | 'all'>('first12');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LoanCalculationResponse | null>(null);

  const calculateQuote = useCallback(async (
    p: number,
    r: number,
    t: number,
    incomeStr: string,
    debtStr: string,
    assetStr: string,
    presetName?: string
  ) => {
    setLoading(true);
    setError(null);

    const income = incomeStr.trim() !== '' ? Number(incomeStr) : undefined;
    const debt = debtStr.trim() !== '' ? Number(debtStr) : undefined;
    const asset = assetStr.trim() !== '' ? Number(assetStr) : undefined;

    if (p <= 0) {
      setError('Loan principal must be greater than $0');
      setLoading(false);
      return;
    }
    if (r < 0 || r > 100) {
      setError('Annual interest rate must be between 0% and 100%');
      setLoading(false);
      return;
    }
    if (t <= 0 || !Number.isInteger(t)) {
      setError('Loan term must be a positive whole number of months');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/loan-advisor/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principal: p,
          annualRate: r,
          termMonths: t,
          grossMonthlyIncome: income && income > 0 ? income : undefined,
          existingMonthlyDebt: debt !== undefined && debt >= 0 ? debt : undefined,
          assetValue: asset && asset > 0 ? asset : undefined,
          scenarioName: presetName || 'Custom Loan Advisor Calculation'
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || `HTTP ${response.status} calculation error`);
      }

      const quote: LoanCalculationResponse = await response.json();
      setResult(quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate loan quote');
    } finally {
      setLoading(false);
    }
  }, []);

  // Run initial calculation with default prime mortgage preset on mount
  useEffect(() => {
    calculateQuote(400000, 6.5, 360, '12500', '650', '500000', 'Prime Conforming Mortgage');
  }, [calculateQuote]);

  const handleApplyPreset = (preset: DemoPreset) => {
    setSelectedPreset(preset.id);
    setPrincipal(preset.principal);
    setAnnualRate(preset.annualRate);
    setTermMonths(preset.termMonths);
    setTermUnit(preset.termMonths % 12 === 0 ? 'years' : 'months');
    setGrossMonthlyIncome(preset.grossMonthlyIncome ? String(preset.grossMonthlyIncome) : '');
    setExistingMonthlyDebt(preset.existingMonthlyDebt !== undefined ? String(preset.existingMonthlyDebt) : '');
    setAssetValue(preset.assetValue ? String(preset.assetValue) : '');

    calculateQuote(
      preset.principal,
      preset.annualRate,
      preset.termMonths,
      preset.grossMonthlyIncome ? String(preset.grossMonthlyIncome) : '',
      preset.existingMonthlyDebt !== undefined ? String(preset.existingMonthlyDebt) : '',
      preset.assetValue ? String(preset.assetValue) : '',
      preset.name
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSelectedPreset('custom');
    calculateQuote(
      principal,
      annualRate,
      termMonths,
      grossMonthlyIncome,
      existingMonthlyDebt,
      assetValue,
      'Custom User Calculation'
    );
  };

  // Filter amortization schedule based on selected view mode
  const displayedSchedule = (): AmortizationRow[] => {
    if (!result?.amortizationSchedule) return [];
    if (amortizationView === 'first12') {
      return result.amortizationSchedule.slice(0, 12);
    }
    if (amortizationView === 'yearly') {
      // Return 12th, 24th, 36th month... and final month
      return result.amortizationSchedule.filter((r) => r.month % 12 === 0 || r.month === result.termMonths);
    }
    return result.amortizationSchedule;
  };

  const principalRatio = result ? Math.round((result.principal / result.totalRepayment) * 100) : 0;
  const interestRatio = result ? 100 - principalRatio : 0;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 space-y-8 shadow-xl">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">1. Loan Advisor</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Phase 2 Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Deterministic amortization engine, repayment forecasting, and DTI/LTV underwriting eligibility.
            </p>
          </div>
        </div>

        {/* Database Sync Status Badge */}
        {result?.calculationId && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>Persisted to PostgreSQL</span>
            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[100px]" title={result.calculationId}>
              {result.calculationId.slice(0, 8)}...
            </span>
          </div>
        )}
      </div>

      {/* Synthetic Demo Presets Quick-Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>One-Click Synthetic Borrower Presets</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SYNTHETIC_DEMO_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-white ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">{preset.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 font-medium">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>${preset.principal.toLocaleString()} @ {preset.annualRate}%</span>
                  <span>{preset.termMonths} mos</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loan Form & Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Parameters Form (5 Cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 space-y-5 bg-slate-950/80 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-800">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            Loan Parameters
          </h3>

          {/* Principal */}
          <div className="space-y-1.5">
            <label htmlFor="principal-input" className="text-xs font-semibold text-slate-300 flex justify-between">
              <span>Loan Principal ($)</span>
              <span className="text-indigo-400 font-mono">${principal.toLocaleString()}</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="principal-input"
                type="number"
                min="100"
                step="1000"
                value={principal}
                onChange={(e) => {
                  setPrincipal(Number(e.target.value));
                  setSelectedPreset('custom');
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Annual Interest Rate */}
          <div className="space-y-1.5">
            <label htmlFor="rate-input" className="text-xs font-semibold text-slate-300 flex justify-between">
              <span>Annual Nominal Rate (%)</span>
              <span className="text-sky-400 font-mono">{annualRate}%</span>
            </label>
            <div className="relative">
              <Percent className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="rate-input"
                type="number"
                min="0"
                max="100"
                step="0.05"
                value={annualRate}
                onChange={(e) => {
                  setAnnualRate(Number(e.target.value));
                  setSelectedPreset('custom');
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">Supports 0.00% promotional interest with zero division errors.</p>
          </div>

          {/* Term (Months or Years Toggle) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="term-input" className="text-xs font-semibold text-slate-300">
                Loan Term
              </label>
              <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    if (termUnit === 'months') {
                      setTermUnit('years');
                      setTermMonths(Math.max(1, Math.round(termMonths / 12)) * 12);
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    termUnit === 'years' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Years
                </button>
                <button
                  type="button"
                  onClick={() => setTermUnit('months')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    termUnit === 'months' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Months
                </button>
              </div>
            </div>

            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="term-input"
                type="number"
                min="1"
                max={termUnit === 'years' ? 50 : 600}
                value={termUnit === 'years' ? termMonths / 12 : termMonths}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTermMonths(termUnit === 'years' ? val * 12 : val);
                  setSelectedPreset('custom');
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                required
              />
            </div>
            <span className="text-[11px] text-slate-500">Effective: {termMonths} monthly billing cycles</span>
          </div>

          {/* Underwriting Parameters Accordion (DTI & LTV) */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>Underwriting Inputs (DTI &amp; LTV)</span>
              </div>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-slate-800 bg-slate-950/60">
                <div className="space-y-1">
                  <label htmlFor="income-input" className="text-[11px] font-medium text-slate-400">
                    Gross Monthly Income ($)
                  </label>
                  <input
                    id="income-input"
                    type="number"
                    min="0"
                    placeholder="e.g. 10000"
                    value={grossMonthlyIncome}
                    onChange={(e) => {
                      setGrossMonthlyIncome(e.target.value);
                      setSelectedPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="debt-input" className="text-[11px] font-medium text-slate-400">
                    Existing Monthly Debt Obligations ($)
                  </label>
                  <input
                    id="debt-input"
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={existingMonthlyDebt}
                    onChange={(e) => {
                      setExistingMonthlyDebt(e.target.value);
                      setSelectedPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="asset-input" className="text-[11px] font-medium text-slate-400">
                    Collateral / Asset Value ($)
                  </label>
                  <input
                    id="asset-input"
                    type="number"
                    min="0"
                    placeholder="e.g. 500000"
                    value={assetValue}
                    onChange={(e) => {
                      setAssetValue(e.target.value);
                      setSelectedPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Calculate Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Deterministic Terms...</span>
              </>
            ) : (
              <>
                <span>Calculate Loan Terms</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Calculation Output Dashboard (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Calculation Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Primary Key Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Monthly EMI Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/60 to-slate-950 border border-indigo-500/30 shadow-lg shadow-indigo-950/50">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Monthly EMI</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
                    ${result.monthlyEMI.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Due every 30 days</p>
                </div>

                {/* Total Interest Card */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">Total Interest</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-200 mt-1 font-mono tracking-tight">
                    ${result.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">{interestRatio}% of repayment</p>
                </div>

                {/* Total Repayment Card */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Repayment</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-200 mt-1 font-mono tracking-tight">
                    ${result.totalRepayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">{result.termMonths} total payments</p>
                </div>
              </div>

              {/* Principal vs Interest Visual Composition Bar */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-indigo-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span>Principal: ${result.principal.toLocaleString()} ({principalRatio}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-sky-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                    <span>Interest: ${result.totalInterest.toLocaleString()} ({interestRatio}%)</span>
                  </div>
                </div>

                {/* Ratio Bar */}
                <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex">
                  <div style={{ width: `${principalRatio}%` }} className="bg-indigo-500 transition-all duration-300"></div>
                  <div style={{ width: `${interestRatio}%` }} className="bg-sky-400 transition-all duration-300"></div>
                </div>
              </div>

              {/* Underwriting Indicators (DTI & LTV) */}
              {(result.dti || result.ltv) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.dti && (
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Debt-to-Income (DTI)</span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            result.dti.riskTier === 'low_risk'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : result.dti.riskTier === 'moderate_risk'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {result.dti.dtiPercentage}% &bull; {result.dti.riskTier.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{result.dti.description}</p>
                    </div>
                  )}

                  {result.ltv && (
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Loan-to-Value (LTV)</span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            result.ltv.tier === 'standard'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : result.ltv.tier === 'elevated_pmi_required'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {result.ltv.ltvPercentage}% &bull; {result.ltv.tier.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{result.ltv.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Amortization Schedule Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-bold text-white">Monthly Amortization Schedule</h4>
                  </div>

                  {/* Schedule View Selector */}
                  <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setAmortizationView('first12')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        amortizationView === 'first12' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      First 12 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmortizationView('yearly')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        amortizationView === 'yearly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Yearly Milestones
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmortizationView('all')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        amortizationView === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({result.termMonths})
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Mo</th>
                        <th className="py-2.5 px-3 font-semibold">Opening</th>
                        <th className="py-2.5 px-3 font-semibold text-indigo-400">Payment</th>
                        <th className="py-2.5 px-3 font-semibold text-emerald-400">Principal</th>
                        <th className="py-2.5 px-3 font-semibold text-sky-400">Interest</th>
                        <th className="py-2.5 px-3 font-semibold">Closing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {displayedSchedule().map((row) => (
                        <tr key={row.month} className="hover:bg-slate-900/50 transition">
                          <td className="py-2 px-3 font-bold text-slate-400">{row.month}</td>
                          <td className="py-2 px-3">${row.openingBalance.toLocaleString()}</td>
                          <td className="py-2 px-3 font-medium text-indigo-300">${row.payment.toFixed(2)}</td>
                          <td className="py-2 px-3 text-emerald-400">${row.principal.toFixed(2)}</td>
                          <td className="py-2 px-3 text-sky-400">${row.interest.toFixed(2)}</td>
                          <td className="py-2 px-3 font-bold text-slate-200">
                            ${row.closingBalance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 text-right">
                  Closing balance strictly reconciles to $0.00 with zero penny leakage.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
