import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Badge } from './badge';
import { Skeleton } from './skeleton';
import { Dialog } from './dialog';
import { Tabs } from './tabs';
import { Menu } from './menu';
import { Tooltip } from './tooltip';
import { VirtualizedContainer } from './virtualized-container';

export function DesignSystemShowcase(): React.JSX.Element {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputText, setInputText] = useState('Sample verification lemma');

  const sampleItems = Array.from({ length: 250 }, (_, i) => ({
    id: `lemma-${i}`,
    title: `Lemma 11.${i}: Formal continuity of spectral projections`,
    status: i % 3 === 0 ? 'verified' : i % 3 === 1 ? 'warning' : 'neutral',
  }));

  const tabItems = [
    {
      id: 'primitives',
      label: 'UI Primitives',
      content: (
        <div className="space-y-6 p-4">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Buttons (React 19 Ref & Variants)
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
              <Button variant="ghost">Ghost Action</Button>
              <Button variant="danger">Danger Action</Button>
              <Button variant="secondary" size="sm">Small (32px)</Button>
              <Button variant="secondary" size="lg">Large (44px)</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Form Controls (Aria-Invalid & Focus Rings)
            </h3>
            <div className="max-w-md space-y-3">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter Lean 4 statement..."
              />
              <Input
                defaultValue="Malformed input with error"
                hasError
                placeholder="Errored input..."
              />
              <Textarea
                placeholder="Enter proof tactics block (by intros, induction)..."
                defaultValue="theorem spectral_real (A : Matrix n n ℝ) : IsSelfAdjoint A := by"
              />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Badges & Metadata (Zero-Pill Discipline)
            </h3>
            <div className="flex items-center gap-4">
              <Badge variant="verified">SEAL_KERNEL_VERIFIED</Badge>
              <Badge variant="warning">LEANSCORER_UNCONFIRMED</Badge>
              <Badge variant="error">TACTIC_FAILED</Badge>
              <Badge variant="neutral">PYTHON_3.14</Badge>
              <Badge variant="verified" unboxed>· Formalized (unboxed)</Badge>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overlays (Dialog, Menu & Tooltip)
            </h3>
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsDialogOpen(true)} variant="primary">
                Open Accessible Dialog
              </Button>
              <Menu
                trigger={
                  <Button variant="secondary">
                    Export Options ▾
                  </Button>
                }
                items={[
                  { id: 'polyglot', label: 'Export .polyglot archive', shortcut: '⌘E' },
                  { id: 'lean', label: 'Export Lean 4 bundle' },
                  { id: 'crdt', label: 'Export Yjs snapshot' },
                  { id: 'reset', label: 'Reset workspace state', destructive: true },
                ]}
              />
              <Tooltip content="WCAG 2.2 AA compliant focus & hover tooltip">
                <Button variant="ghost">Hover or focus me</Button>
              </Tooltip>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Skeleton Loaders (Geometry delta &le; 2px)
            </h3>
            <div className="space-y-2 max-w-sm">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </section>
        </div>
      ),
    },
    {
      id: 'virtualization',
      label: 'Virtualization (>100 Threshold)',
      content: (
        <div className="p-4 space-y-3">
          <div className="text-xs text-slate-400">
            Rendering 250 items using threshold-gated react-window v2.3.0 List (threshold: 100).
          </div>
          <div className="border border-slate-800 rounded bg-slate-900/40 p-2">
            <VirtualizedContainer
              items={sampleItems}
              threshold={100}
              rowHeight={36}
              height={320}
              keyExtractor={(item) => item.id}
              renderItem={(item) => (
                <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-slate-800/40 hover:bg-slate-800/50">
                  <span className="font-mono text-slate-300">{item.title}</span>
                  <Badge variant={item.status as any}>{item.status.toUpperCase()}</Badge>
                </div>
              )}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">
          Polyglot Design System Showcase
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Phase 11.3: React Architecture, Performance & Accessibility Excellence
        </p>
      </header>

      <Tabs items={tabItems} />

      <Dialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Export Workspace Archive"
        description="Pack active Lean 4 definitions, proofs, and Yjs collaboration states into a deterministic .polyglot archive."
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Archive packaging uses normalized epoch timestamps, SHA-256 integrity verification, and compression level 6.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
              Confirm Export
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
