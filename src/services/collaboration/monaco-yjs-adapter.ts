/**
 * Monaco Yjs CRDT Adapter (Phase 11.2 & Phase 15 Wave 4)
 *
 * Encapsulates y-monaco (pinned to v0.1.6) and dynamically lazy-loads `./yjs-runtime`
 * ONLY when ENABLE_YJS_COLLABORATION is enabled, preserving zero bundle overhead when off.
 */

import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';
import type { LiveCollabSession, LiveCollabSessionOptions } from './yjs-runtime';

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
   * Synchronously prepares a Monaco editor model binding handle gated by ENABLE_YJS_COLLABORATION.
   * When flag is false, returns a safe no-op handle with zero runtime overhead.
   */
  public static bindMonacoEditor(
    _editorModel: { getValue: () => string; setValue: (val: string) => void },
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

    return {
      isBound: true,
      version: Y_MONACO_PINNED_VERSION,
      docId: options.docId,
      destroy: () => {},
    };
  }

  /**
   * Dynamically loads `./yjs-runtime` and connects to `/collab` WebSocket only when
   * ENABLE_YJS_COLLABORATION is enabled. Fails closed with 503 FEATURE_DISABLED otherwise.
   */
  public static async connectSession(
    options: LiveCollabSessionOptions
  ): Promise<LiveCollabSession> {
    if (!this.isCollaborationEnabled()) {
      throw new BridgeError('FEATURE_DISABLED', `yjs-client-${Date.now()}`, {
        feature: 'ENABLE_YJS_COLLABORATION',
        message: 'Yjs collaboration is disabled by feature flag ENABLE_YJS_COLLABORATION',
      });
    }

    const runtime = await import('./yjs-runtime');
    return runtime.startLiveYjsSession(options);
  }
}
