/**
 * ProposalLoopPanel (Phase 12, Sprint 12.2, Task PL3)
 *
 * Dedicated Femev Drawer view displaying AX-PROVER live telemetry:
 * - 4-node execution state (Proposer -> Builder -> Reviewer -> Memory)
 * - Budget consumption bars (iterations, wall time, cost USD)
 * - Structured Lab Notebook lessons from RetrievalMemory
 * - Stop / Run triggers with epistemic safeguards
 */

import React, { useState, useRef } from 'react';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { authorizedFetch } from '../../services/auth/api-client';
import { settingsStore } from '../../services/settings/settings-store';

interface NodeStatus {
  readonly name: 'Proposer' | 'Builder' | 'Reviewer' | 'Memory';
  readonly status: 'idle' | 'running' | 'success' | 'failure';
  readonly summary: string;
}

interface ProposalLoopLesson {
  readonly id?: string;
  readonly iteration: number;
  readonly errorClass: string;
  readonly lesson: string;
}

interface ProposalLoopApiResponse {
  readonly proved?: boolean;
  readonly terminationReason?: string;
  readonly totalIterations?: number;
  readonly totalCostUsd?: number;
  readonly totalTimeMs?: number;
  readonly lessons?: readonly ProposalLoopLesson[];
  readonly candidateProof?: string;
  readonly error?: string;
  readonly detail?: string;
  readonly title?: string;
}

export function ProposalLoopPanel(): React.JSX.Element {
  const [declarationId, setDeclarationId] = useState('add_comm_polyglot');
  const [goal, setGoal] = useState('theorem add_comm_polyglot (n m : Nat) : n + m = m + n');
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(0);
  const [costUsd, setCostUsd] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [proved, setProved] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string>('IDLE');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [lessons, setLessons] = useState<readonly ProposalLoopLesson[]>([]);
  const [candidateProof, setCandidateProof] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const nodes: NodeStatus[] = [
    {
      name: 'Proposer',
      status: isRunning ? 'running' : iterations > 0 ? 'success' : 'idle',
      summary: 'K=1 bounded sampling with targeted compiler guidance (APOLLO)',
    },
    {
      name: 'Builder',
      status: isRunning ? 'running' : iterations > 0 ? 'success' : 'idle',
      summary: 'Concurrent Lean compiler evaluation on candidate proof AST',
    },
    {
      name: 'Reviewer',
      status: isRunning ? 'running' : proved ? 'success' : iterations > 0 ? 'failure' : 'idle',
      summary: proved
        ? 'Goal closed cleanly without sorry or native_decide'
        : iterations > 0
        ? `Termination: ${terminationReason}`
        : 'Awaiting proposal execution telemetry',
    },
    {
      name: 'Memory',
      status: isRunning ? 'running' : lessons.length > 0 ? 'success' : 'idle',
      summary: 'Lessons indexed in RetrievalMemory lab notebook',
    },
  ];

  const handleStartLoop = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRunning(true);
    setStatusError(null);
    setFeatureDisabled(false);
    setProved(false);
    setTerminationReason('LOOP_RUNNING');

    const startedAt = Date.now();
    try {
      const res = await authorizedFetch('/api/v1/proof/proposal-loop', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({ declarationId: declarationId.trim(), goal: goal.trim() }),
      });

      const data = (await res.json()) as ProposalLoopApiResponse;
      if (!res.ok) {
        if (res.status === 503 && data.title === 'FEATURE_DISABLED') {
          setFeatureDisabled(true);
        }
        setStatusError(data.detail || `HTTP ${res.status}`);
        setTerminationReason(data.title || 'ERROR');
        return;
      }

      setProved(Boolean(data.proved));
      setIterations(data.totalIterations ?? 1);
      setCostUsd(data.totalCostUsd ?? 0);
      setElapsedSec(Math.max(1, Math.round((data.totalTimeMs ?? Date.now() - startedAt) / 1000)));
      setTerminationReason(data.terminationReason ?? (data.proved ? 'PROVED' : 'BUDGET_EXHAUSTED'));
      setLessons(Array.isArray(data.lessons) ? data.lessons : []);
      setCandidateProof(data.candidateProof ?? null);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') {
        setTerminationReason('ABORTED');
      } else {
        setStatusError(err instanceof Error ? err.message : String(err));
        setTerminationReason('ERROR');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopLoop = () => {
    abortRef.current?.abort();
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 text-xs text-slate-200 font-sans">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">
              AX-PROVER Proposal Loop
            </span>
            <Badge variant={proved ? 'verified' : isRunning ? 'warning' : 'neutral'}>
              {proved ? 'CANDIDATE_CLOSED' : isRunning ? 'LOOP_RUNNING' : terminationReason}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Bounded 4-node proof synthesis loop wired to <code className="font-mono">/api/v1/proof/proposal-loop</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button variant="danger" size="sm" onClick={handleStopLoop} className="min-h-[44px]">
              Stop Loop
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => void handleStartLoop()} className="min-h-[44px]">
              Run Proposal Loop
            </Button>
          )}
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Declaration ID</span>
          <input
            type="text"
            value={declarationId}
            onChange={(e) => setDeclarationId(e.target.value)}
            className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-100"
          />
        </label>
        <label className="md:col-span-2 space-y-1">
          <span className="text-[11px] text-slate-400">Formal Goal</span>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-100"
          />
        </label>
      </div>

      {statusError && (
        <div role="alert" className="p-3 rounded border border-amber-800/70 bg-amber-950/30 text-amber-200 flex items-center justify-between gap-3">
          <span>{statusError}</span>
          {featureDisabled && (
            <button
              type="button"
              onClick={() => settingsStore.openModal('flags')}
              className="px-3 py-1.5 min-h-[36px] rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shrink-0"
            >
              Apri Feature Flags
            </button>
          )}
        </div>
      )}

      {/* Budget Gauges */}
      <div className="grid grid-cols-3 gap-3 p-3 rounded border border-slate-800 bg-slate-900/60 font-mono text-[11px]">
        <div>
          <div className="text-slate-400">Iterations</div>
          <div className="text-sm font-semibold text-slate-100 tabular-nums">
            {iterations} / 50
          </div>
        </div>
        <div>
          <div className="text-slate-400">Wall Time</div>
          <div className="text-sm font-semibold text-slate-100 tabular-nums">
            00:{elapsedSec < 10 ? `0${elapsedSec}` : elapsedSec} / 10:00
          </div>
        </div>
        <div>
          <div className="text-slate-400">Cost USD</div>
          <div className="text-sm font-semibold text-slate-100 tabular-nums">
            ${costUsd.toFixed(2)} / $5.00
          </div>
        </div>
      </div>

      {/* 4-Node Live Pipeline */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Node Execution Pipeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {nodes.map((node, index) => (
            <div
              key={node.name}
              className="p-3 rounded border border-slate-800 bg-slate-900/40 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  {index + 1}. {node.name}
                </span>
                <Badge
                  variant={
                    node.status === 'success'
                      ? 'verified'
                      : node.status === 'failure'
                      ? 'error'
                      : node.status === 'running'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {node.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                {node.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {candidateProof && (
        <pre className="p-3 rounded border border-slate-800 bg-slate-950 font-mono text-[11px] text-emerald-300 overflow-x-auto">
          {candidateProof}
        </pre>
      )}

      {/* Lab Notebook / Memory Lessons */}
      <div className="space-y-2 flex-1 overflow-auto">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Experience Processor Lab Notebook (Lessons Learned)
        </h3>
        {lessons.length === 0 ? (
          <div className="p-3 rounded border border-slate-800/80 bg-slate-900/30 text-slate-500 text-[11px]">
            Avvia il Proposal Loop per raccogliere le lezioni diagnostiche reali dal backend.
          </div>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson, idx) => (
              <div
                key={lesson.id ?? `lesson-${idx}`}
                className="p-3 rounded border border-slate-800/80 bg-slate-900/30 flex items-start gap-3"
              >
                <Badge variant="warning" unboxed>
                  · Iteration {lesson.iteration}
                </Badge>
                <div className="flex-1">
                  <span className="font-mono text-amber-400 text-[11px] font-semibold mr-2">
                    [{lesson.errorClass}]
                  </span>
                  <span className="text-slate-300 text-[11px]">
                    {lesson.lesson}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Epistemic Guard Banner */}
      <div className="p-2.5 rounded bg-blue-950/20 border border-blue-900/40 text-[11px] text-blue-300">
        <span className="font-semibold">Epistemic Rule:</span> Proposal Loop generates candidate proofs; only kernel verification via <code className="font-mono text-blue-200">SEAL_KERNEL_VERIFIED_TIER5</code> provides formal certification.
      </div>
    </div>
  );
}

