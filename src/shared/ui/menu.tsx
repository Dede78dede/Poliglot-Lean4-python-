import React from 'react';
import {
  MenuTrigger,
  Popover,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  type Key,
} from 'react-aria-components';
import { cn } from '../lib/cn';

export interface MenuItemData {
  readonly id: string;
  readonly label: string;
  readonly onAction?: () => void;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
  readonly shortcut?: string;
}

export interface MenuProps {
  readonly trigger: React.ReactNode;
  readonly items: readonly MenuItemData[];
  readonly onAction?: (key: Key) => void;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function Menu({
  trigger,
  items,
  onAction,
  ariaLabel = 'Menu options',
  className,
}: MenuProps): React.JSX.Element {
  return (
    <MenuTrigger>
      {trigger}
      <Popover
        className={({ isEntering, isExiting }) =>
          cn(
            'min-w-[180px] rounded-md border border-slate-700 bg-slate-900 p-1 shadow-lg text-slate-100 z-50',
            isEntering && 'animate-in fade-in zoom-in-95 duration-100',
            isExiting && 'animate-out fade-out zoom-out-95 duration-75',
            className
          )
        }
      >
        <AriaMenu
          aria-label={ariaLabel}
          onAction={(key) => {
            const item = items.find((i) => i.id === key);
            item?.onAction?.();
            onAction?.(key);
          }}
          className="outline-hidden flex flex-col gap-0.5"
        >
          {items.map((item) => (
            <AriaMenuItem
              key={item.id}
              id={item.id}
              isDisabled={item.disabled}
              className={({ isFocused, isDisabled }) =>
                cn(
                  'flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer outline-hidden select-none',
                  isFocused && 'bg-blue-600 text-white',
                  !isFocused && 'text-slate-300 hover:text-white',
                  item.destructive && !isFocused && 'text-rose-400 hover:text-rose-300',
                  item.destructive && isFocused && 'bg-rose-600 text-white',
                  isDisabled && 'opacity-40 cursor-not-allowed'
                )
              }
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <span className="text-[10px] text-slate-400 font-mono tracking-wider ml-3">
                  {item.shortcut}
                </span>
              )}
            </AriaMenuItem>
          ))}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}
