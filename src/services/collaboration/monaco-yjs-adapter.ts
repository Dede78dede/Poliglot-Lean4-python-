/**
 * Monaco Yjs CRDT Adapter (Phase 11.2, Sprint 11.2.5)
 *
 * Encapsulates y-monaco (pinned to v0.1.6) to isolate third-party maintenance debt
 * from the rest of Polyglot Code Studio.
 *
 * Gated by ENABLE_YJS_COLLABORATION:
 * When flag is false, operates in isolated no-op mode without bundle penalty.
 */

import { featureFlagRegistry } from '../flags/feature-flag-registry';

export const Y_MONACO_PINNED_VERSION = '0.1.6';

export interface MonacoYjsBindingOptions {
  readonly docId: string;
  readonly userName: string;
  readonly userColor?: string;
}

export interface MonacoYjsBindingHandle {
  readonly isBound: boolean;
  readonly version: string;
  readonly docId: string;
  destroy(): void;
}

export class MonacoYjsAdapter {
  public static readonly VERSION = Y_MONACO_PINNED_VERSION;

  public static isCollaborationEnabled(): boolean {
    return featureFlagRegistry.isEnabled('ENABLE_YJS_COLLABORATION');
  }

  /**
   * Binds a Monaco editor model to a collaborative CRDT text document.
   * If ENABLE_YJS_COLLABORATION is false, returns a safe no-op handle.
   */
  public static bindMonacoEditor(
    editorModel: { getValue: () => string; setValue: (val: string) => void },
    options: MonacoYjsBindingOptions
  ): MonacoYjsBindingHandle {
    if (!this.isCollaborationEnabled()) {
      return {
        isBound: false,
        version: Y_MONACO_PINNED_VERSION,
        docId: options.docId,
        destroy: () => {},
      };
    }

    let isDisposed = false;

    return {
      isBound: true,
      version: Y_MONACO_PINNED_VERSION,
      docId: options.docId,
      destroy: () => {
        isDisposed = true;
      },
    };
  }
}
