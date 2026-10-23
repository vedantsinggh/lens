import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  FileSearch,
  ShieldAlert,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { HealthResponse, AppInfoResponse } from '@loanlens/shared';
import { LoanAdvisor } from './components/LoanAdvisor.tsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfoResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const checkBackendStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();

    try {
      const [healthRes, infoRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/health`),
        fetch(`${API_BASE_URL}/api`)
      ]);

      if (!healthRes.ok) {
        throw new Error(`Health check returned status HTTP ${healthRes.status}`);
      }
      if (!infoRes.ok) {
        throw new Error(`App info endpoint returned status HTTP ${infoRes.status}`);
      }

      const healthData: HealthResponse = await healthRes.json();
      const infoData: AppInfoResponse = await infoRes.json();

      setLatencyMs(Math.round(performance.now() - start));
      setHealth(healthData);
      setAppInfo(infoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend service');
      setHealth(null);
      setAppInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkBackendStatus();
  }, [checkBackendStatus]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  LoanLens AI
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Phase 2
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Intelligent Lending Platform</p>
            </div>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Checking backend...</span>
              </div>
            ) : health ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 shadow-sm shadow-emerald-950">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium">Backend Connected</span>
                {latencyMs !== null && (
                  <span className="text-[11px] text-emerald-500/80 font-mono">({latencyMs}ms)</span>
                )}
              </div>
            ) : (
              <button
                onClick={checkBackendStatus}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                title="Click to retry connection"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-medium">Backend Offline</span>
                <RefreshCw className="w-3 h-3 ml-1" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Runnable Foundation Initialized</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white max-w-2xl">
            Lending Platform &amp; Underwriting Decision Support
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-3xl leading-relaxed">
            LoanLens AI unites deterministic financial calculations, RAG-powered credit policy retrieval,
            and agentic pre-screening recommendations under strict human-in-the-loop governance.
          </p>
        </div>

        {/* System & Connection Status Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-300">Backend Communication Error</p>
                <p className="text-xs text-rose-200/80 mt-0.5 font-mono">{error}</p>
                <p className="text-xs text-rose-300/70 mt-1">
                  Ensure the backend service is running on port 5000 (<code className="text-rose-200">npm run dev:backend</code>).
                </p>
              </div>
            </div>
            <button
              onClick={checkBackendStatus}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-xs font-semibold text-rose-100 transition shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Infrastructure & Environment Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Backend API</p>
                <p className="text-sm font-semibold text-slate-200">
                  {health ? `v${appInfo?.version || '0.1.0'} (${health.environment})` : 'Connecting...'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Port 5000</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">PostgreSQL 16 + pgvector</p>
                <p className="text-sm font-semibold text-slate-200">Dockerized Instance</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Port 5433</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Shared Types</p>
                <p className="text-sm font-semibold text-slate-200">@loanlens/shared</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">Active</span>
          </div>
        </div>

        {/* Module 1: Functional Loan Advisor */}
        <section id="loan-advisor-section" className="space-y-4">
          <LoanAdvisor />
        </section>

        {/* Next Modules: Labelled Placeholders */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Upcoming System Modules</h3>
              <p className="text-xs text-slate-400">
                Scheduled for subsequent phases. Strictly non-functional placeholders in Phase 2.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">2 Placeholders</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Module 2: Policy Assistant */}
            <div className="group rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition duration-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <FileSearch className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Phase 2 Placeholder
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-sky-300 transition">
                    2. Policy Assistant
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Semantic vector search over credit underwriting guidelines and institutional lending policies
                    using PostgreSQL pgvector and local sentence embeddings.
                  </p>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled:</span>
                    <span className="text-slate-300 font-mono">Phase 2 Next</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Retrieval:</span>
                    <span className="text-slate-300">pgvector + RAG</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-800/60">
                <div className="w-full py-2.5 px-3 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 flex items-center justify-center gap-2 cursor-not-allowed select-none">
                  <span>Placeholder Ready for Phase 2 Next</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                </div>
              </div>
            </div>

            {/* Module 3: Agentic Pre-Screening */}
            <div className="group rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition duration-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Phase 3 Placeholder
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                    3. Agentic Pre-Screening
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    AI-assisted loan underwriting recommendation engine with human-in-the-loop decisioning.
                    Advisory recommendations only; human underwriter authority strictly enforced.
                  </p>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled:</span>
                    <span className="text-slate-300 font-mono">Phase 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Governance:</span>
                    <span className="text-slate-300">Human Decision Bound</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-800/60">
                <div className="w-full py-2.5 px-3 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 flex items-center justify-center gap-2 cursor-not-allowed select-none">
                  <span>Placeholder Ready for Phase 3</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Raw API Response Preview Widget */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">Raw Endpoint Responses</h3>
            </div>
            <button
              onClick={checkBackendStatus}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 overflow-x-auto">
              <div className="text-slate-500 pb-2 border-b border-slate-800/60 mb-2 flex justify-between">
                <span>GET /api/health</span>
                <span className={health ? 'text-emerald-400' : 'text-slate-600'}>
                  {health ? '200 OK' : 'No Response'}
                </span>
              </div>
              <pre className="text-slate-300">
                {health ? JSON.stringify(health, null, 2) : error ? `// ${error}` : '// Loading...'}
              </pre>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 overflow-x-auto">
              <div className="text-slate-500 pb-2 border-b border-slate-800/60 mb-2 flex justify-between">
                <span>GET /api</span>
                <span className={appInfo ? 'text-emerald-400' : 'text-slate-600'}>
                  {appInfo ? '200 OK' : 'No Response'}
                </span>
              </div>
              <pre className="text-slate-300">
                {appInfo ? JSON.stringify(appInfo, null, 2) : error ? `// ${error}` : '// Loading...'}
              </pre>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>LoanLens AI &bull; Autonomous Lending Platform &amp; Underwriting Decision Support System</p>
          <p className="text-[11px] text-slate-600">
            Advisory Guardrail: AI models may recommend underwriting actions, but must never independently approve or reject loans. Human-in-the-loop authority is enforced.
          </p>
        </div>
      </footer>
    </div>
  );
}
