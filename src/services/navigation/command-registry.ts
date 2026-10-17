import type {
  CommandRegistration,
  CommandCategory,
  Disposable,
  ContextSnapshot,
  ContextKey,
  ContextValue,
} from '../../types/navigation';
import { evaluateWhenClause } from './when-clause';
import { contextKeyService, type ContextKeyService } from './context-key-service';

export class CommandRegistry {
  private commands = new Map<string, CommandRegistration>();
  private listeners = new Set<() => void>();

  public registerCommand(command: CommandRegistration): Disposable {
    this.commands.set(command.id, command);
    this.notify();

    return {
      dispose: () => {
        if (this.commands.get(command.id) === command) {
          this.commands.delete(command.id);
          this.notify();
        }
      },
    };
  }

  public registerCommands(commandList: readonly CommandRegistration[]): Disposable {
    const disposables = commandList.map((c) => this.registerCommand(c));
    return {
      dispose: () => {
        for (const d of disposables) {
          d.dispose();
        }
      },
    };
  }

  public getCommand(id: string): CommandRegistration | undefined {
    return this.commands.get(id);
  }

  public getAllCommands(): readonly CommandRegistration[] {
    return Array.from(this.commands.values());
  }

  public getCommandsForCategory(category: CommandCategory): readonly CommandRegistration[] {
    return this.getAllCommands().filter((c) => c.category === category);
  }

  public isCommandVisible(
    id: string,
    context:
      | ContextKeyService
      | ContextSnapshot
      | Partial<Record<ContextKey, ContextValue>>
      | Record<string, unknown> = contextKeyService
  ): boolean {
    const cmd = this.commands.get(id);
    if (!cmd) return false;
    if (!cmd.when) return true;
    return evaluateWhenClause(cmd.when, context);
  }

  public isCommandEnabled(
    id: string,
    context:
      | ContextKeyService
      | ContextSnapshot
      | Partial<Record<ContextKey, ContextValue>>
      | Record<string, unknown> = contextKeyService
  ): boolean {
    const cmd = this.commands.get(id);
    if (!cmd) return false;
    if (cmd.precondition && !evaluateWhenClause(cmd.precondition, context)) {
      return false;
    }
    return this.isCommandVisible(id, context);
  }

  public async executeCommand(id: string, ...args: readonly any[]): Promise<any> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      throw new Error(`Command not found: "${id}"`);
    }

    if (!this.isCommandEnabled(id)) {
      console.warn(`[CommandRegistry] Command "${id}" executed while disabled by condition`);
    }

    try {
      return await cmd.handler(...args);
    } catch (err) {
      console.error(`[CommandRegistry] Error executing command "${id}"`, err);
      throw err;
    }
  }

  public subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  public reset(): void {
    this.commands.clear();
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[CommandRegistry] Listener error', err);
      }
    }
  }
}

export const commandRegistry = new CommandRegistry();
