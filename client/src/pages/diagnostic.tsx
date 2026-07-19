import { useState } from "react";
import { Brain, CheckCircle, XCircle, Clock, Play, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface CheckResult {
  status: "ok" | "error";
  message: string;
  latency?: number;
}

interface SystemChecks {
  timestamp: string;
  checks: Record<string, CheckResult>;
}

interface E2EStep {
  step: string;
  status: "ok" | "error" | "skip";
  detail: string;
}

interface E2EResult {
  steps: E2EStep[];
  passed: boolean;
  analysisId?: string;
}

const CHECK_LABELS: Record<string, string> = {
  database: "Database (PostgreSQL)",
  zhi1_openai: "ZHI 1 — OpenAI",
  zhi2_anthropic: "ZHI 2 — Anthropic",
  zhi3_deepseek: "ZHI 3 — DeepSeek",
  zhi4_perplexity: "ZHI 4 — Perplexity",
  zhi5_venice: "ZHI 5 — Venice (adult content)",
  stripe: "Stripe (payments)",
  file_upload: "File Upload endpoint",
  sse_stream: "SSE Stream endpoint",
};

function StatusIcon({ status }: { status: "ok" | "error" | "skip" | "pending" }) {
  if (status === "ok") return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />;
  if (status === "error") return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
  if (status === "skip") return <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />;
  return <Loader2 className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />;
}

export default function Diagnostic() {
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemResult, setSystemResult] = useState<SystemChecks | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);

  const [e2eLoading, setE2eLoading] = useState(false);
  const [e2eResult, setE2eResult] = useState<E2EResult | null>(null);
  const [e2eError, setE2eError] = useState<string | null>(null);

  const runSystemCheck = async () => {
    setSystemLoading(true);
    setSystemResult(null);
    setSystemError(null);
    try {
      const res = await fetch("/api/diagnostic/system");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setSystemResult(await res.json());
    } catch (e: any) {
      setSystemError(e.message);
    } finally {
      setSystemLoading(false);
    }
  };

  const runE2E = async () => {
    setE2eLoading(true);
    setE2eResult(null);
    setE2eError(null);
    try {
      const res = await fetch("/api/diagnostic/e2e", { method: "POST" });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setE2eResult(await res.json());
    } catch (e: any) {
      setE2eError(e.message);
    } finally {
      setE2eLoading(false);
    }
  };

  const systemOk = systemResult
    ? Object.values(systemResult.checks).every(c => c.status === "ok")
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Mind Probe</span>
            <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
              Diagnostic Centre
            </span>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to App
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ── SYSTEM CHECK ─────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Check</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Verifies all API connections and the database are reachable.
              </p>
            </div>
            <Button
              onClick={runSystemCheck}
              disabled={systemLoading}
              data-testid="button-run-system-check"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {systemLoading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running…</>
                : <><Play className="h-4 w-4 mr-2" />Run System Check</>}
            </Button>
          </div>

          {/* Results */}
          {(systemResult || systemError) && (
            <div className="px-6 py-4 space-y-2">
              {systemError && (
                <p className="text-red-600 text-sm font-medium">Error: {systemError}</p>
              )}
              {systemResult && (
                <>
                  <div className={`text-sm font-semibold mb-3 ${systemOk ? "text-green-600" : "text-red-600"}`}>
                    {systemOk ? "✅ All systems operational" : "❌ One or more systems failing"}
                    <span className="text-gray-400 font-normal ml-3">
                      {new Date(systemResult.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                    {Object.entries(systemResult.checks).map(([key, check]) => (
                      <div key={key} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <StatusIcon status={check.status} />
                          <span className="text-sm font-medium text-gray-800">
                            {CHECK_LABELS[key] ?? key}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-right">
                          <span className={`text-sm ${check.status === "ok" ? "text-gray-500" : "text-red-500"}`}>
                            {check.status === "error" ? check.message : check.message}
                          </span>
                          {check.latency != null && (
                            <span className="text-xs text-gray-400 w-14 text-right">
                              {check.latency}ms
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {!systemResult && !systemError && !systemLoading && (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Press "Run System Check" to probe all services.
            </div>
          )}
        </section>

        {/* ── END-TO-END TEST ──────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">End-to-End Test</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Submits a sample text through the full pipeline and verifies every formal step completes.
                Does not test answer quality — only that the machinery works.
              </p>
            </div>
            <Button
              onClick={runE2E}
              disabled={e2eLoading}
              data-testid="button-run-e2e"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {e2eLoading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running… (up to 60s)</>
                : <><Play className="h-4 w-4 mr-2" />Run End-to-End Test</>}
            </Button>
          </div>

          {/* Sample text indicator */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Sample input:</span>{" "}
              "Dogs are loyal companions that have lived alongside humans for thousands of years…"
              &nbsp;·&nbsp; Analysis type: <span className="font-medium">Micro-Cognitive</span>
              &nbsp;·&nbsp; Provider: <span className="font-medium">ZHI 1</span>
            </p>
          </div>

          {/* Steps */}
          {(e2eResult || e2eError) && (
            <div className="px-6 py-4 space-y-2">
              {e2eError && (
                <p className="text-red-600 text-sm font-medium">Error: {e2eError}</p>
              )}
              {e2eResult && (
                <>
                  <div className={`text-sm font-semibold mb-3 ${e2eResult.passed ? "text-green-600" : "text-red-600"}`}>
                    {e2eResult.passed ? "✅ End-to-end test passed" : "❌ End-to-end test failed"}
                    {e2eResult.analysisId && (
                      <span className="text-gray-400 font-normal ml-3">Analysis ID: {e2eResult.analysisId}</span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                    {e2eResult.steps.map((step, i) => (
                      <div key={i} className="flex items-start justify-between px-4 py-3 bg-white hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <StatusIcon status={step.status} />
                          <span className="text-sm font-medium text-gray-800">{step.step}</span>
                        </div>
                        <span className={`text-sm text-right max-w-xs ${step.status === "error" ? "text-red-500" : "text-gray-500"}`}>
                          {step.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {!e2eResult && !e2eError && !e2eLoading && (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Press "Run End-to-End Test" to verify the full analysis pipeline.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
