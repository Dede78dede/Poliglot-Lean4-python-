import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  FileText,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Sparkles,
  GitBranch,
  Clock,
  Layers,
} from 'lucide-react';
import {
  LSpecRunnerService,
  type LSpecResult,
} from '../../services/lean-tooling/lspec-runner';
import {
  lspecCiTemplateGenerator,
  type LSpecCiTemplateResult,
} from '../../services/lean-tooling/lspec-ci-template-generator';
import { featureFlagRegistry } from '../../services/flags/feature-flag-registry';

export interface LSpecPanelProps {
  readonly projectPath?: string;
  readonly projectName?: string;
  readonly onAddToProject?: (filePath: string, content: string) => void;
}

export function LSpecPanel({
  projectPath = '/workspace/projects/current',
  projectName = 'my-lean-project',
  onAddToProject,
}: LSpecPanelProps): React.JSX.Element {
  const runner = new LSpecRunnerService();
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<LSpecResult | null>(null);

  const [isGeneratingCi, setIsGeneratingCi] = useState(false);
  const [ciResult, setCiResult] = useState<LSpecCiTemplateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const isCiEnabled = featureFlagRegistry.isEnabled('ENABLE_LSPEC_CI_TEMPLATE');

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await runner.runTests(projectPath);
      setTestResult(res);
    } catch (err) {
      console.error('Failed to run LSpec tests:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleGenerateCi = async () => {
    setIsGeneratingCi(true);
    try {
      const res = await lspecCiTemplateGenerator.generateTemplate(projectPath, {
        projectName,
        leanVersion: 'v4.35.0',
        includeCache: true,
      });
      setCiResult(res);
    } catch (err) {
      console.error('Failed to generate LSpec CI template:', err);
    } finally {
      setIsGeneratingCi(false);
    }
  };

  const handleCopy = async () => {
    if (!ciResult) return;
    await navigator.clipboard.writeText(ciResult.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!ciResult) return;
    const blob = new Blob([ciResult.content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lspec.yml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    if (!ciResult || !onAddToProject) return;
    onAddToProject(ciResult.fileName, ciResult.content);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide">
            LSpec v2.0.0 Testing Engine & CI
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Running Suites...' : 'Run LSpec Tests'}</span>
          </button>

          <button
            onClick={handleGenerateCi}
            disabled={isGeneratingCi}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{isGeneratingCi ? 'Generating CI...' : 'Generate LSpec CI'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Test Results Section */}
        {testResult && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Test Execution Summary
              </span>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-emerald-400">
                  {testResult.passedCount} passed
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-rose-400">
                  {testResult.failedCount} failed
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500 tabular-nums">
                  {testResult.durationMs}ms
                </span>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {testResult.tests.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/80 border border-slate-800/80 rounded"
                >
                  <div className="flex items-center gap-2">
                    {t.status === 'passed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className="text-slate-200 font-medium">
                      {t.declarationName}
                    </span>
                    <span className="text-slate-500 font-sans text-[11px]">
                      {t.testDescription}
                    </span>
                  </div>
                  <span className="text-slate-500 tabular-nums text-[11px]">
                    {t.durationMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated CI Workflow Preview */}
        {ciResult && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden space-y-0">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-mono font-medium">{ciResult.fileName}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>

                {onAddToProject && (
                  <button
                    onClick={handleApply}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{applied ? 'Added' : 'Add to Project'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Warnings notice if any */}
            {ciResult.warnings.length > 0 && (
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Notice: {ciResult.warnings.join(', ')}. Ensure argumentcomputer/LSpec is added to your Lake manifest.
                </span>
              </div>
            )}

            <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              <pre>{ciResult.content}</pre>
            </div>
          </div>
        )}

        {!testResult && !ciResult && (
          <div className="py-16 text-center text-xs text-slate-500">
            Click "Run LSpec Tests" to evaluate test declarations or "Generate LSpec CI" to export a GitHub Actions workflow.
          </div>
        )}
      </div>
    </div>
  );
}
