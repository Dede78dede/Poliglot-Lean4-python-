import React from 'react';
import { Tabs } from '../../shared/ui/tabs';
import { ProposalLoopPanel } from './ProposalLoopPanel';
import { TranslationPanel } from './TranslationPanel';
import { EvidenceTimelinePanel } from './EvidenceTimelinePanel';
import { MathesisPanel } from './MathesisPanel';
import { PaperproofPanel } from './PaperproofPanel';
import { FlaskConical } from 'lucide-react';

export interface FEMEVViewProps {
  readonly leanCode?: string;
  readonly theoremName?: string;
  readonly onInsertCode?: (code: string) => void;
  readonly onOpenFullDrawer?: () => void;
}

export function FEMEVView({
  leanCode = 'theorem add_comm_polyglot (n m : Nat) : n + m = m + n := by omega',
  theoremName = 'add_comm_polyglot',
  onInsertCode,
  onOpenFullDrawer,
}: FEMEVViewProps): React.JSX.Element {
  return (
    <div className="h-full p-3 sm:p-4 max-w-6xl mx-auto flex flex-col w-full overflow-y-auto gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-900/50">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">FEMEV Epistemic Workspace</h2>
          <p className="text-[11px] text-slate-400">
            Proposal Loop · Translation Fidelity · Evidence Timeline · Mathesis · Paperproof
          </p>
        </div>
        {onOpenFullDrawer && (
          <button
            type="button"
            onClick={onOpenFullDrawer}
            className="min-h-[40px] px-3 py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-700/60 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Apri Drawer Completo (LeanFlow / PastaLean / Lungo)</span>
          </button>
        )}
      </div>

      <Tabs
        items={[
          {
            id: 'proposal-loop',
            label: 'AX-PROVER Proposal Loop',
            content: <ProposalLoopPanel />,
          },
          {
            id: 'translation-gate',
            label: 'Translation Fidelity Gate',
            content: <TranslationPanel />,
          },
          {
            id: 'evidence-timeline',
            label: 'Evidence Timeline',
            content: <EvidenceTimelinePanel declarationId="thm-pythagorean-lattice-1" />,
          },
          {
            id: 'mathesis',
            label: 'Mathesis Autoformalize',
            content: <MathesisPanel onInsertCode={onInsertCode} />,
          },
          {
            id: 'paperproof',
            label: 'Paperproof Playback',
            content: <PaperproofPanel leanCode={leanCode} theoremName={theoremName} />,
          },
        ]}
      />
    </div>
  );
}
