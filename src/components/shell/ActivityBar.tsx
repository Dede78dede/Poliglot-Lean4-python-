import React, { useSyncExternalStore, useState, useRef, useEffect } from 'react';
import {
  Files,
  Search,
  GitBranch,
  FlaskConical,
  Network,
  Database,
  MessageSquare,
  Settings,
  MoreVertical,
  Maximize2,
  Minimize2,
  ArrowLeftRight,
} from 'lucide-react';
import {
  activityBarStore,
  CANONICAL_ACTIVITIES,
  type ActivityId,
} from '../../services/shell/activity-bar-store';
import { sidePanelStore } from '../../services/shell/side-panel-store';

export interface ActivityBarProps {
  readonly onOpenCommandPalette?: () => void;
  readonly onOpenSettings?: () => void;
}

export function ActivityBar({
  onOpenCommandPalette,
  onOpenSettings,
}: ActivityBarProps): React.JSX.Element | null {
  const snapshot = useSyncExternalStore(
    activityBarStore.subscribe,
    activityBarStore.getSnapshot,
  );
  const sidePanelSnapshot = useSyncExternalStore(
    sidePanelStore.subscribe,
    sidePanelStore.getSnapshot,
  );

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // If Zen mode is active, Activity Bar is hidden
  if (snapshot.isZenMode) {
    return null;
  }

  const isCompact = snapshot.size === 'compact';
  const widthClass = isCompact ? 'w-10' : 'w-12';

  const handleActivityClick = (id: ActivityId) => {
    if (id === 'settings') {
      if (onOpenSettings) {
        onOpenSettings();
        return;
      }
    }

    if (snapshot.activeActivity === id) {
      // Toggle collapse on side panel
      sidePanelStore.toggleCollapsed();
    } else {
      activityBarStore.setActiveActivity(id);
      if (sidePanelSnapshot.collapsed) {
        sidePanelStore.setCollapsed(false);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenuPos) return;
    const handleOutside = () => setContextMenuPos(null);
    window.addEventListener('click', handleOutside);
    window.addEventListener('contextmenu', handleOutside);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('contextmenu', handleOutside);
    };
  }, [contextMenuPos]);

  // Roving tabindex navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const total = CANONICAL_ACTIVITIES.length;
    let nextIndex = index;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % total;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + total) % total;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = total - 1;
    } else {
      return;
    }

    setFocusedIndex(nextIndex);
    itemRefs.current[nextIndex]?.focus();
  };

  const renderIcon = (id: ActivityId, isSelected: boolean) => {
    const iconClass = `w-5 h-5 transition-transform duration-100 ${
      isSelected ? 'text-white scale-105' : 'text-slate-400 group-hover:text-slate-200'
    }`;

    switch (id) {
      case 'explorer':
        return <Files className={iconClass} />;
      case 'search':
        return <Search className={iconClass} />;
      case 'git':
        return <GitBranch className={iconClass} />;
      case 'proof':
        return <FlaskConical className={iconClass} />;
      case 'blueprint':
        return <Network className={iconClass} />;
      case 'memory':
        return <Database className={iconClass} />;
      case 'chat':
        return <MessageSquare className={iconClass} />;
      case 'settings':
        return <Settings className={iconClass} />;
      default:
        return <Files className={iconClass} />;
    }
  };

  return (
    <nav
      role="tablist"
      aria-orientation="vertical"
      aria-label="Activity Bar"
      onContextMenu={handleContextMenu}
      className={`h-full ${widthClass} bg-[#06090e] border-neutral-800 flex flex-col justify-between items-center py-2 shrink-0 z-20 select-none ${
        snapshot.position === 'left' ? 'border-r' : 'border-l'
      }`}
    >
      {/* Top activities */}
      <div className="flex flex-col items-center gap-1 w-full">
        {CANONICAL_ACTIVITIES.slice(0, 7).map((activity, idx) => {
          const isSelected =
            snapshot.activeActivity === activity.id && !sidePanelSnapshot.collapsed;
          const badge = snapshot.badges[activity.id];
          const isCurrentFocus = focusedIndex === idx;

          return (
            <button
              key={activity.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              role="tab"
              aria-selected={isSelected}
              aria-label={activity.label}
              title={`${activity.label} (${idx + 1})`}
              tabIndex={isCurrentFocus ? 0 : -1}
              onClick={() => handleActivityClick(activity.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`group relative flex items-center justify-center w-full aspect-square py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
                isSelected
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-850'
              }`}
            >
              {/* Left/Right active indicator border */}
              {isSelected && (
                <div
                  className={`absolute top-0 bottom-0 w-0.5 bg-blue-500 ${
                    snapshot.position === 'left' ? 'left-0' : 'right-0'
                  }`}
                />
              )}

              {renderIcon(activity.id, isSelected)}

              {/* Badge indicator */}
              {badge !== null && badge !== undefined && (
                <span
                  role="status"
                  aria-label={`Badge: ${badge}`}
                  className="absolute bottom-1 right-1 px-1 min-w-[14px] h-3.5 bg-blue-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center pointer-events-none shadow-xs"
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom activities: Settings & Context action */}
      <div className="flex flex-col items-center gap-1 w-full border-t border-neutral-850 pt-2">
        {CANONICAL_ACTIVITIES.slice(7).map((activity, idx) => {
          const actualIdx = idx + 7;
          const isSelected =
            snapshot.activeActivity === activity.id && !sidePanelSnapshot.collapsed;
          const isCurrentFocus = focusedIndex === actualIdx;

          return (
            <button
              key={activity.id}
              ref={(el) => { itemRefs.current[actualIdx] = el; }}
              role="tab"
              aria-selected={isSelected}
              aria-label={activity.label}
              title={activity.label}
              tabIndex={isCurrentFocus ? 0 : -1}
              onClick={() => handleActivityClick(activity.id)}
              onKeyDown={(e) => handleKeyDown(e, actualIdx)}
              className="group relative flex items-center justify-center w-full aspect-square py-2.5 text-slate-400 hover:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
            >
              {renderIcon(activity.id, isSelected)}
            </button>
          );
        })}

        {/* Overflow / Layout Menu Trigger */}
        <button
          type="button"
          aria-label="Configure Activity Bar"
          title="Activity Bar Options"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setContextMenuPos({ x: rect.right, y: rect.bottom - 100 });
          }}
          className="flex items-center justify-center w-full py-2 text-slate-500 hover:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Context Menu Modal / Dropdown */}
      {contextMenuPos && (
        <div
          role="menu"
          aria-label="Activity Bar Context Menu"
          style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
          className="fixed z-50 min-w-[200px] bg-[#111827] border border-neutral-700 rounded-md shadow-2xl p-1 text-xs text-slate-200 font-sans"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              activityBarStore.togglePosition();
              setContextMenuPos(null);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {snapshot.position === 'left'
                ? 'Move Primary Side Bar Right'
                : 'Move Primary Side Bar Left'}
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              activityBarStore.toggleSize();
              setContextMenuPos(null);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            {isCompact ? (
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {isCompact ? 'Expand Activity Bar (48px)' : 'Compact Activity Bar (40px)'}
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              activityBarStore.toggleZenMode();
              setContextMenuPos(null);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            <span>Toggle Zen Mode (Ctrl+K Ctrl+X)</span>
          </button>

          <div className="my-1 border-t border-neutral-800" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              activityBarStore.reset();
              sidePanelStore.reset();
              setContextMenuPos(null);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-rose-950 text-rose-300 text-left transition-colors"
          >
            <span>Reset Layout to Default</span>
          </button>
        </div>
      )}
    </nav>
  );
}
