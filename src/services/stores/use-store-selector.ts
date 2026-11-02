import { useSyncExternalStore, useRef, useCallback } from 'react';

export function useStoreSelector<TState, TSelected>(
  store: { subscribe(listener: () => void): () => void; getSnapshot(): TState },
  selector: (state: TState) => TSelected,
  isEqual: (a: TSelected, b: TSelected) => boolean = Object.is
): TSelected {
  const lastSelectedRef = useRef<TSelected | undefined>(undefined);

  const getSelection = useCallback(() => {
    const nextSelected = selector(store.getSnapshot());
    if (lastSelectedRef.current !== undefined && isEqual(lastSelectedRef.current, nextSelected)) {
      return lastSelectedRef.current;
    }
    lastSelectedRef.current = nextSelected;
    return nextSelected;
  }, [store, selector, isEqual]);

  return useSyncExternalStore(store.subscribe.bind(store), getSelection, getSelection);
}
