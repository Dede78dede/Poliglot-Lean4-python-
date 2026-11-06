import React, { useSyncExternalStore } from 'react';
import { statusBarRegistry } from '../../services/status-bar/status-bar-registry';
import { commandRegistry } from '../../services/navigation/command-registry';
import type { StatusBarItemDescriptor } from '../../types/navigation';

export function StatusBar(): React.JSX.Element {
  const items = useSyncExternalStore(
    statusBarRegistry.subscribe,
    statusBarRegistry.getSnapshot,
    statusBarRegistry.getSnapshot
  );

  const leftItems = items.filter((i) => i.alignment === 'left');
  const centerItems = items.filter((i) => i.alignment === 'center');
  const rightItems = items.filter((i) => i.alignment === 'right');

  const handleItemClick = (item: StatusBarItemDescriptor): void => {
    if (item.commandId) {
      void commandRegistry.executeCommand(item.commandId);
    }
  };

  return (
    <footer
      role="status"
      aria-label="Polyglot Studio Status Bar"
      className="flex items-center justify-between px-3 h-6 bg-[#0B0F17] border-t border-[#1E293B] text-[11px] text-slate-400 select-none font-mono tabular-nums z-30 shrink-0 overflow-x-auto max-w-full"
    >
      {/* Left zone: Toolchain, Pyodide & Workspace telemetry */}
      <div className="flex items-center gap-2 overflow-hidden">
        {leftItems.map((item, idx) => (
          <React.Fragment key={item.id}>
            {idx > 0 && <span className="text-slate-600 select-none">·</span>}
            <StatusBarItemButton item={item} onClick={() => handleItemClick(item)} />
          </React.Fragment>
        ))}
      </div>

      {/* Center zone: Proof obligations & Goal metrics */}
      <div className="flex items-center gap-2">
        {centerItems.map((item, idx) => (
          <React.Fragment key={item.id}>
            {idx > 0 && <span className="text-slate-600 select-none">·</span>}
            <StatusBarItemButton item={item} onClick={() => handleItemClick(item)} />
          </React.Fragment>
        ))}
      </div>

      {/* Right zone: Collaborators, AI provider & Cursor coordinates */}
      <div className="flex items-center gap-2 overflow-hidden">
        {rightItems.map((item, idx) => (
          <React.Fragment key={item.id}>
            {idx > 0 && <span className="text-slate-600 select-none">·</span>}
            <StatusBarItemButton item={item} onClick={() => handleItemClick(item)} />
          </React.Fragment>
        ))}
      </div>
    </footer>
  );
}

interface StatusBarItemButtonProps {
  readonly item: StatusBarItemDescriptor;
  readonly onClick: () => void;
}

function StatusBarItemButton({ item, onClick }: StatusBarItemButtonProps): React.JSX.Element {
  const isClickable = Boolean(item.commandId);

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      title={item.tooltip}
      aria-label={item.tooltip || item.text}
      className={`flex items-center gap-1.5 px-1 py-0.5 transition-colors ${
        isClickable
          ? 'hover:text-slate-200 hover:bg-[#1E293B]/60 cursor-pointer focus:outline-none focus:text-[#06b6d4]'
          : 'cursor-default'
      }`}
    >
      <span
        style={{ color: item.color }}
        className={item.color ? undefined : 'text-slate-300'}
      >
        {item.text}
      </span>
    </button>
  );
}
