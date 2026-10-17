import { tinykeys } from 'tinykeys';
import type { KeybindingRegistration, Disposable } from '../../types/navigation';
import { evaluateWhenClause } from './when-clause';
import { contextKeyService } from './context-key-service';
import { commandRegistry } from './command-registry';

export class KeybindingResolver {
  private bindings: KeybindingRegistration[] = [];
  private unsubscribeTinykeys: (() => void) | null = null;
  private isAttached = false;

  public registerKeybinding(binding: KeybindingRegistration): Disposable {
    this.bindings.push(binding);
    this.rebuildListener();

    return {
      dispose: () => {
        const idx = this.bindings.indexOf(binding);
        if (idx !== -1) {
          this.bindings.splice(idx, 1);
          this.rebuildListener();
        }
      },
    };
  }

  public registerKeybindings(bindings: readonly KeybindingRegistration[]): Disposable {
    this.bindings.push(...bindings);
    this.rebuildListener();

    return {
      dispose: () => {
        this.bindings = this.bindings.filter((b) => !bindings.includes(b));
        this.rebuildListener();
      },
    };
  }

  public getKeybindingForCommand(commandId: string): string | undefined {
    // Find active binding for command with highest weight
    const matches = this.bindings.filter((b) => b.commandId === commandId);
    if (matches.length === 0) return undefined;

    // Filter by when clause if present
    const active = matches.filter((b) => evaluateWhenClause(b.when, contextKeyService));
    const target = active.length > 0 ? active[active.length - 1] : matches[matches.length - 1];

    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    return isMac && target.mac ? target.mac : target.key;
  }

  public getAllBindings(): readonly KeybindingRegistration[] {
    return this.bindings;
  }

  public attach(target: Window | HTMLElement = typeof window !== 'undefined' ? window : ({} as Window)): void {
    if (typeof window === 'undefined') return;
    this.isAttached = true;
    this.rebuildListener(target);
  }

  public detach(): void {
    if (this.unsubscribeTinykeys) {
      this.unsubscribeTinykeys();
      this.unsubscribeTinykeys = null;
    }
    this.isAttached = false;
  }

  private rebuildListener(target: Window | HTMLElement = typeof window !== 'undefined' ? window : ({} as Window)): void {
    if (typeof window === 'undefined' || !this.isAttached) return;

    if (this.unsubscribeTinykeys) {
      this.unsubscribeTinykeys();
      this.unsubscribeTinykeys = null;
    }

    // Group bindings by normalized key sequence
    const keyMap: Record<string, (event: KeyboardEvent) => void> = {};

    for (const binding of this.bindings) {
      const keyStr = binding.key;

      keyMap[keyStr] = (event: KeyboardEvent) => {
        // Do not intercept if inside a regular text input or textarea, UNLESS command is global (e.g. palette or find)
        const targetEl = event.target as HTMLElement | null;
        const isInputField =
          targetEl &&
          (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA' || targetEl.isContentEditable);

        const allowInInput =
          binding.commandId === 'tools.commandPalette' ||
          binding.commandId === 'editor.find' ||
          binding.commandId === 'editor.replace' ||
          binding.key.includes('$mod+k') ||
          binding.key.includes('Control+k');

        if (isInputField && !allowInInput) {
          return;
        }

        // Evaluate when-clause
        if (binding.when && !evaluateWhenClause(binding.when, contextKeyService)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        void commandRegistry.executeCommand(binding.commandId);
      };
    }

    if (Object.keys(keyMap).length > 0 && typeof (target as any).addEventListener === 'function') {
      this.unsubscribeTinykeys = tinykeys(target as Window, keyMap);
    }
  }

  /**
   * Formats tinykeys shortcut string for visual presentation in menus and palette
   */
  public formatKeybindingDisplay(key: string): string {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    return key
      .split(' ')
      .map((chord) => {
        return chord
          .replace(/\$mod/g, isMac ? '⌘' : 'Ctrl')
          .replace(/Control/gi, isMac ? '⌃' : 'Ctrl')
          .replace(/Alt/gi, isMac ? '⌥' : 'Alt')
          .replace(/Shift/gi, isMac ? '⇧' : 'Shift')
          .replace(/\+/g, isMac ? '' : '+')
          .toUpperCase();
      })
      .join(' ');
  }

  public reset(): void {
    this.detach();
    this.bindings = [];
  }
}

export const keybindingResolver = new KeybindingResolver();
