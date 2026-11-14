/**
 * Lightweight Runtime Monaco API Shim for y-monaco (Phase 15 Wave 4)
 *
 * Avoids bundling the full monaco-editor package (~646 KB gzip) into client assets
 * since @monaco-editor/react already loads Monaco dynamically at runtime and
 * attaches the active instance to globalThis.monaco on mount.
 */

export const SelectionDirection = {
  LTR: 0,
  RTL: 1,
} as const;

export class Range {
  public readonly startLineNumber: number = 0;
  public readonly startColumn: number = 0;
  public readonly endLineNumber: number = 0;
  public readonly endColumn: number = 0;

  constructor(
    startLineNumber: number,
    startColumn: number,
    endLineNumber: number,
    endColumn: number
  ) {
    const runtime = (globalThis as { monaco?: { Range?: typeof Range } }).monaco;
    if (runtime?.Range && runtime.Range !== Range) {
      return new runtime.Range(startLineNumber, startColumn, endLineNumber, endColumn);
    }
    this.startLineNumber = startLineNumber;
    this.startColumn = startColumn;
    this.endLineNumber = endLineNumber;
    this.endColumn = endColumn;
  }
}

export class Selection {
  public readonly selectionStartLineNumber: number = 0;
  public readonly selectionStartColumn: number = 0;
  public readonly positionLineNumber: number = 0;
  public readonly positionColumn: number = 0;
  public readonly startLineNumber: number = 0;
  public readonly startColumn: number = 0;
  public readonly endLineNumber: number = 0;
  public readonly endColumn: number = 0;

  constructor(
    selectionStartLineNumber: number,
    selectionStartColumn: number,
    positionLineNumber: number,
    positionColumn: number
  ) {
    const runtime = (globalThis as { monaco?: { Selection?: typeof Selection } }).monaco;
    if (runtime?.Selection && runtime.Selection !== Selection) {
      return new runtime.Selection(
        selectionStartLineNumber,
        selectionStartColumn,
        positionLineNumber,
        positionColumn
      );
    }
    this.selectionStartLineNumber = selectionStartLineNumber;
    this.selectionStartColumn = selectionStartColumn;
    this.positionLineNumber = positionLineNumber;
    this.positionColumn = positionColumn;
    const isForward =
      selectionStartLineNumber < positionLineNumber ||
      (selectionStartLineNumber === positionLineNumber &&
        selectionStartColumn <= positionColumn);
    this.startLineNumber = isForward ? selectionStartLineNumber : positionLineNumber;
    this.startColumn = isForward ? selectionStartColumn : positionColumn;
    this.endLineNumber = isForward ? positionLineNumber : selectionStartLineNumber;
    this.endColumn = isForward ? positionColumn : selectionStartColumn;
  }

  public static createWithDirection(
    startLineNumber: number,
    startColumn: number,
    endLineNumber: number,
    endColumn: number,
    direction: number
  ): Selection {
    const runtime = (
      globalThis as {
        monaco?: {
          Selection?: {
            createWithDirection?: (
              sl: number,
              sc: number,
              el: number,
              ec: number,
              dir: number
            ) => Selection;
          };
        };
      }
    ).monaco;
    if (runtime?.Selection?.createWithDirection) {
      return runtime.Selection.createWithDirection(
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn,
        direction
      );
    }
    if (direction === SelectionDirection.RTL) {
      return new Selection(endLineNumber, endColumn, startLineNumber, startColumn);
    }
    return new Selection(startLineNumber, startColumn, endLineNumber, endColumn);
  }
}
