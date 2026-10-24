import { defaultLeanLspClient, type McpClientInterface } from './lean-lsp-client';
import { ExternalStoreBase } from '../stores/external-store-base';

export interface Disposable {
  dispose(): void;
}

export interface McpClientSnapshot {
  readonly clientIds: readonly string[];
  readonly clientsCount: number;
  readonly activeClientId: string | null;
}

export class McpClientRegistry extends ExternalStoreBase<McpClientSnapshot> {
  private readonly clients = new Map<string, McpClientInterface>();
  private activeClientId: string | null = null;

  constructor() {
    super({ id: 'mcpClientRegistry', multiTabSync: true });
    // Automatically register default lean-lsp-mcp client as initial client
    this.register(defaultLeanLspClient);
    this.activeClientId = defaultLeanLspClient.id;
  }

  public register(client: McpClientInterface): Disposable {
    this.clients.set(client.id, client);
    if (!this.activeClientId) {
      this.activeClientId = client.id;
    }
    this.notify();

    return {
      dispose: () => {
        this.clients.delete(client.id);
        if (this.activeClientId === client.id) {
          const next = this.clients.keys().next();
          this.activeClientId = next.done ? null : next.value;
        }
        this.notify();
      },
    };
  }

  public list(): readonly McpClientInterface[] {
    return Array.from(this.clients.values());
  }

  public getById(id: string): McpClientInterface | undefined {
    return this.clients.get(id);
  }

  public getActiveClient(): McpClientInterface | undefined {
    return this.activeClientId ? this.clients.get(this.activeClientId) : undefined;
  }

  public setActiveClient(id: string): void {
    if (this.clients.has(id)) {
      this.activeClientId = id;
      this.notify();
    }
  }

  protected computeSnapshot(): McpClientSnapshot {
    return Object.freeze({
      clientIds: Object.freeze(Array.from(this.clients.keys())),
      clientsCount: this.clients.size,
      activeClientId: this.activeClientId,
    });
  }
}

export const mcpClientRegistry = new McpClientRegistry();
