import React from 'react';
import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  Tab as AriaTab,
  TabPanel as AriaTabPanel,
  type Key,
} from 'react-aria-components';
import { cn } from '../lib/cn';

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: React.ReactNode;
  readonly badge?: React.ReactNode;
}

export interface TabsProps {
  readonly items: readonly TabItem[];
  readonly selectedKey?: Key;
  readonly onSelectionChange?: (key: Key) => void;
  readonly className?: string;
  readonly defaultSelectedKey?: Key;
}

export function Tabs({
  items,
  selectedKey,
  onSelectionChange,
  className,
  defaultSelectedKey,
}: TabsProps): React.JSX.Element {
  return (
    <AriaTabs
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
      defaultSelectedKey={defaultSelectedKey ?? items[0]?.id}
      className={cn('flex flex-col h-full w-full', className)}
    >
      <AriaTabList
        aria-label="Navigation tabs"
        className="flex items-center gap-1 border-b border-slate-800 px-3 bg-slate-900/50"
      >
        {items.map((item) => (
          <AriaTab
            key={item.id}
            id={item.id}
            className={({ isSelected, isFocused }) =>
              cn(
                'flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer select-none outline-hidden',
                isSelected
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700',
                isFocused && 'ring-2 ring-blue-500/50 rounded-t'
              )
            }
          >
            <span>{item.label}</span>
            {item.badge}
          </AriaTab>
        ))}
      </AriaTabList>

      {items.map((item) => (
        <AriaTabPanel
          key={item.id}
          id={item.id}
          className="flex-1 overflow-auto outline-hidden p-2"
        >
          {item.content}
        </AriaTabPanel>
      ))}
    </AriaTabs>
  );
}
