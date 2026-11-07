import React from 'react';
import { Tabs } from '../../shared/ui/tabs';
import { ProposalLoopPanel } from './ProposalLoopPanel';
import { TranslationPanel } from './TranslationPanel';

export function FEMEVView(): React.JSX.Element {
  return (
    <div className="h-full p-3 sm:p-4 max-w-6xl mx-auto flex flex-col w-full overflow-y-auto">
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
        ]}
      />
    </div>
  );
}
