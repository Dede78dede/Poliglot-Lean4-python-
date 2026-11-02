import React from 'react';
import { List } from 'react-window';

export interface VirtualizedContainerProps<T> {
  readonly items: readonly T[];
  readonly threshold?: number;
  readonly rowHeight?: number;
  readonly height?: number;
  readonly className?: string;
  readonly keyExtractor?: (item: T, index: number) => string | number;
  readonly renderItem: (item: T, index: number) => React.ReactNode;
}

interface ExtraRowProps<T> {
  readonly items: readonly T[];
  readonly renderItem: (item: T, index: number) => React.ReactNode;
}

function VirtualRow<T>(props: { index: number; style: React.CSSProperties } & ExtraRowProps<T>): React.JSX.Element | null {
  const item = props.items[props.index];
  if (!item) return null;
  return (
    <div style={props.style} className="overflow-hidden">
      {props.renderItem(item, props.index)}
    </div>
  );
}

export function VirtualizedContainer<T>({
  items,
  threshold = 100,
  rowHeight = 36,
  height = 400,
  className = '',
  keyExtractor,
  renderItem,
}: VirtualizedContainerProps<T>): React.JSX.Element {
  const shouldVirtualize = items.length > threshold;

  if (!shouldVirtualize) {
    return (
      <div className={`overflow-y-auto ${className}`} style={{ maxHeight: height }}>
        {items.map((item, index) => {
          const key = keyExtractor ? keyExtractor(item, index) : index;
          return (
            <div key={key} style={{ minHeight: rowHeight }}>
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    );
  }

  // Type-cast rowComponent for react-window v2 generic variance
  const AnyList = List as unknown as React.ComponentType<any>;

  return (
    <div className={`virtualized-list-host ${className}`}>
      <AnyList
        rowCount={items.length}
        rowHeight={rowHeight}
        rowComponent={VirtualRow}
        rowProps={{ items, renderItem }}
        style={{ height, width: '100%' }}
      />
    </div>
  );
}
