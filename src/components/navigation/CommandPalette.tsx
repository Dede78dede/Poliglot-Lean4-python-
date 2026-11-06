import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Command } from 'cmdk';
import { commandRegistry } from '../../services/navigation/command-registry';
import { keybindingResolver } from '../../services/navigation/keybinding-resolver';
import { contextKeyService } from '../../services/navigation/context-key-service';
import type { CommandRegistration, CommandCategory } from '../../types/navigation';
import { COMMAND_CATEGORIES } from '../../types/navigation';
import { Search, CornerDownLeft, Sparkles, Clock } from 'lucide-react';

export interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const RECENT_COMMANDS_KEY = 'polyglot_recent_commands';

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps): React.JSX.Element | null {
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Subscribe to context updates so visible commands are re-evaluated
  const contextSnapshot = useSyncExternalStore(
    contextKeyService.subscribe,
    contextKeyService.getSnapshot,
    contextKeyService.getSnapshot
  );

  // Sync contextKeyService UI state
  useEffect(() => {
    contextKeyService.setKey('commandPaletteOpen', isOpen);
  }, [isOpen]);

  // Reset search when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  // All visible commands
  const visibleCommands = useMemo(() => {
    return commandRegistry
      .getAllCommands()
      .filter((cmd) => commandRegistry.isCommandVisible(cmd.id, contextSnapshot));
  }, [contextSnapshot]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const map = new Map<CommandCategory, CommandRegistration[]>();
    for (const cat of COMMAND_CATEGORIES) {
      map.set(cat, []);
    }

    for (const cmd of visibleCommands) {
      const list = map.get(cmd.category);
      if (list) {
        list.push(cmd);
      }
    }

    return map;
  }, [visibleCommands]);

  // Recent commands resolved
  const recentCommands = useMemo(() => {
    return recentIds
      .map((id) => visibleCommands.find((c) => c.id === id))
      .filter((c): c is CommandRegistration => Boolean(c))
      .slice(0, 5);
  }, [recentIds, visibleCommands]);

  const handleSelect = (cmd: CommandRegistration): void => {
    // Record in recents
    const nextRecents = [cmd.id, ...recentIds.filter((id) => id !== cmd.id)].slice(0, 10);
    setRecentIds(nextRecents);
    try {
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(nextRecents));
    } catch {
      // ignore storage errors
    }

    onClose();
    // Execute after closing modal
    setTimeout(() => {
      void commandRegistry.executeCommand(cmd.id);
    }, 10);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-100"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl bg-[#0B0F17] border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <Command
          filter={(value, searchStr) => {
            if (!searchStr) return 1;
            const target = value.toLowerCase();
            const query = searchStr.toLowerCase();
            return target.includes(query) ? 1 : 0;
          }}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Header & Search Input */}
          <div className="flex items-center px-3.5 border-b border-[#1E293B] bg-[#111827]">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search actions..."
              autoFocus
              className="w-full py-3 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 font-sans outline-none"
              aria-label="Search workbench commands"
            />
            <kbd className="hidden sm:inline-block font-mono text-[10px] text-slate-400 border border-[#1E293B] bg-[#0B0F17] px-1.5 py-0.5">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <Command.List
            className="overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-[#1E293B] flex-1 max-h-[50vh]"
            aria-live="polite"
          >
            <Command.Empty className="py-8 text-center text-xs text-slate-500">
              No matching commands found.
            </Command.Empty>

            {/* Recents section when query is empty */}
            {!search && recentCommands.length > 0 && (
              <Command.Group
                heading={
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    <Clock className="w-3 h-3 text-[#06b6d4]" />
                    <span>Recent Commands</span>
                  </div>
                }
              >
                {recentCommands.map((cmd) => (
                  <CommandItemRow
                    key={`recent-${cmd.id}`}
                    cmd={cmd}
                    onSelect={() => handleSelect(cmd)}
                  />
                ))}
              </Command.Group>
            )}

            {/* Grouped Categories */}
            {COMMAND_CATEGORIES.map((category) => {
              const items = groupedCommands.get(category) || [];
              if (items.length === 0) return null;

              return (
                <Command.Group
                  key={category}
                  heading={
                    <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                      {category}
                    </div>
                  }
                >
                  {items.map((cmd) => (
                    <CommandItemRow
                      key={cmd.id}
                      cmd={cmd}
                      onSelect={() => handleSelect(cmd)}
                    />
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e141f] border-t border-[#1E293B] text-[11px] text-slate-500 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-[#1E293B] px-1 text-slate-400 text-[10px]">↑</kbd>
                <kbd className="bg-[#1E293B] px-1 text-slate-400 text-[10px]">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-[#1E293B] px-1 text-slate-400 text-[10px]">↵</kbd>
                <span>Execute</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#06b6d4]">
              <Sparkles className="w-3 h-3" />
              <span>{visibleCommands.length} commands available</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}

interface CommandItemRowProps {
  readonly cmd: CommandRegistration;
  readonly onSelect: () => void;
}

function CommandItemRow({ cmd, onSelect }: CommandItemRowProps): React.JSX.Element {
  const kb = keybindingResolver.getKeybindingForCommand(cmd.id) || cmd.keybinding;
  const formattedKb = kb ? keybindingResolver.formatKeybindingDisplay(kb) : undefined;

  return (
    <Command.Item
      value={`${cmd.category}: ${cmd.title} ${cmd.description || ''}`}
      onSelect={onSelect}
      className="flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-300 data-[selected=true]:bg-[#1E293B] data-[selected=true]:text-white cursor-pointer rounded-none group transition-colors"
    >
      <div className="flex items-center gap-2 overflow-hidden pr-2">
        <span className="text-slate-400 font-mono text-[11px] shrink-0">
          {cmd.category} &gt;
        </span>
        <span className="truncate font-medium text-slate-200 group-data-[selected=true]:text-white">
          {cmd.title}
        </span>
        {cmd.description && (
          <span className="hidden md:inline truncate text-[11px] text-slate-400">
            — {cmd.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {formattedKb && (
          <kbd className="font-mono text-[10px] bg-[#111827] border border-[#1E293B] text-slate-400 px-1.5 py-0.5 tracking-wider uppercase group-data-[selected=true]:border-slate-600 group-data-[selected=true]:text-slate-200">
            {formattedKb}
          </kbd>
        )}
        <CornerDownLeft className="w-3 h-3 text-slate-600 group-data-[selected=true]:text-[#06b6d4] opacity-0 group-data-[selected=true]:opacity-100" />
      </div>
    </Command.Item>
  );
}
