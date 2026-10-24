import React, { useSyncExternalStore } from 'react';
import { Menu, MenuItem, MenuDivider } from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';
import { DEFAULT_MENUS } from '../../services/navigation/default-commands';
import { commandRegistry } from '../../services/navigation/command-registry';
import { contextKeyService } from '../../services/navigation/context-key-service';
import { keybindingResolver } from '../../services/navigation/keybinding-resolver';
import { evaluateWhenClause } from '../../services/navigation/when-clause';
import type { MenuItemDescriptor } from '../../types/navigation';
import { Search } from 'lucide-react';

export interface MenuBarProps {
  readonly onOpenCommandPalette?: () => void;
}

export function MenuBar({ onOpenCommandPalette }: MenuBarProps): React.JSX.Element {
  // Subscribe to context updates so disabled states and when clauses update reactively
  const contextSnapshot = useSyncExternalStore(
    contextKeyService.subscribe,
    contextKeyService.getSnapshot
  );

  const handleItemClick = (item: MenuItemDescriptor): void => {
    if (item.commandId) {
      void commandRegistry.executeCommand(item.commandId);
    }
  };

  return (
    <header
      role="menubar"
      aria-label="Application Main Menu"
      className="flex items-center justify-between px-2 sm:px-3 h-8 bg-[#0B0F17] border-b border-[#1E293B] select-none text-[12px] font-sans z-30 overflow-x-auto shrink-0 max-w-full"
    >
      {/* Left: Brand Identity & Menu Bar Dropdowns */}
      <div className="flex items-center gap-1">
        {/* Brand Name */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#1E293B] mr-1">
          <div className="w-2.5 h-2.5 bg-gradient-to-tr from-cyan-500 to-emerald-400 rotate-45 rounded-[1px]" />
          <span className="font-semibold tracking-tight text-slate-100 text-[12px] font-mono">
            POLYGLOT<span className="text-[#06b6d4]">_</span>
          </span>
        </div>

        {/* Dropdown Menus */}
        <nav className="flex items-center" aria-label="Menu Bar Items">
          {DEFAULT_MENUS.map((menu) => (
            <Menu
              key={menu.id}
              menuButton={
                <button
                  type="button"
                  className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-[#1E293B]/70 active:bg-[#1E293B] text-[12px] rounded-none transition-colors focus:outline-none focus:bg-[#1E293B] focus:text-[#06b6d4]"
                  aria-haspopup="true"
                >
                  {menu.label}
                </button>
              }
              menuClassName="!bg-[#111827] !border !border-[#1E293B] !rounded-none !shadow-2xl !py-1 !min-w-[220px] !z-50"
              transition
            >
              {menu.items.map((item) => {
                if (item.separator) {
                  return (
                    <MenuDivider
                      key={item.id}
                      className="!bg-[#1E293B] !my-1"
                    />
                  );
                }

                // Check visibility when-clause
                const isVisible = item.when
                  ? evaluateWhenClause(item.when, contextSnapshot)
                  : true;

                if (!isVisible) return null;

                // Check enabled state
                const isEnabled = item.commandId
                  ? commandRegistry.isCommandEnabled(item.commandId, contextSnapshot)
                  : true;

                // Format keybinding badge
                const kb = item.commandId
                  ? keybindingResolver.getKeybindingForCommand(item.commandId)
                  : item.keybinding;
                const formattedKb = kb
                  ? keybindingResolver.formatKeybindingDisplay(kb)
                  : item.keybinding;

                return (
                  <MenuItem
                    key={item.id}
                    disabled={!isEnabled}
                    onClick={() => handleItemClick(item)}
                    className="!px-3 !py-1.5 !text-[12px] !flex !items-center !justify-between !text-slate-300 hover:!text-white hover:!bg-[#1E293B] !cursor-pointer focus:!bg-[#1E293B] focus:!text-[#06b6d4] disabled:!opacity-40 disabled:!cursor-not-allowed !transition-colors"
                  >
                    <span>{item.label}</span>
                    {formattedKb && (
                      <span className="font-mono text-[10px] text-slate-500 pl-4 tracking-wider uppercase">
                        {formattedKb}
                      </span>
                    )}
                  </MenuItem>
                );
              })}
            </Menu>
          ))}
        </nav>
      </div>

      {/* Right: Quick Command Palette Trigger (Ctrl+K) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (onOpenCommandPalette) {
              onOpenCommandPalette();
            } else {
              void commandRegistry.executeCommand('tools.commandPalette');
            }
          }}
          className="flex items-center gap-2 px-2.5 py-0.5 text-xs text-slate-400 bg-[#111827] border border-[#1E293B] hover:border-slate-700 hover:text-slate-200 transition-colors focus:outline-none focus:border-[#06b6d4]"
          title="Open Command Palette (Ctrl+K)"
          aria-label="Open Command Palette"
        >
          <Search className="w-3 h-3 text-slate-500" />
          <span className="text-[11px] text-slate-400">Search commands...</span>
          <kbd className="font-mono text-[10px] px-1 bg-[#1E293B] text-slate-400 ml-2">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </header>
  );
}
