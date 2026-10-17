import type {
  ArchonWorkspace,
  BlueprintNode,
  CollaboratorPresence,
  LedgerEntry,
  WorkspaceSummary,
  KernelVerificationCertificate,
} from '../../types/blueprint';

export type WorkspaceClientListener = (event: {
  type: string;
  payload: Record<string, unknown>;
}) => void;

export class BlueprintWorkspaceClient {
  private ws: WebSocket | null = null;
  private currentWorkspaceId: string | null = null;
  private userId: string;
  private userName: string;
  private userColor: string;
  private listeners = new Set<WorkspaceClientListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private isConnected = false;
  private lastSeenSeq = 0;

  constructor() {
    // Generate or restore anonymous session identity
    const savedUserId = typeof localStorage !== 'undefined' ? localStorage.getItem('polyglot_user_id') : null;
    const savedUserName = typeof localStorage !== 'undefined' ? localStorage.getItem('polyglot_user_name') : null;
    const savedColor = typeof localStorage !== 'undefined' ? localStorage.getItem('polyglot_user_color') : null;

    this.userId = savedUserId || `user-${Math.random().toString(36).slice(2, 9)}`;
    this.userName = savedUserName || 'Mathematician';
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
    this.userColor = savedColor || colors[Math.floor(Math.random() * colors.length)];

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('polyglot_user_id', this.userId);
      localStorage.setItem('polyglot_user_name', this.userName);
      localStorage.setItem('polyglot_user_color', this.userColor);
    }
  }

  public getIdentity(): { userId: string; userName: string; userColor: string } {
    return { userId: this.userId, userName: this.userName, userColor: this.userColor };
  }

  public setIdentity(name: string, color?: string): void {
    this.userName = name;
    if (color) this.userColor = color;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('polyglot_user_name', this.userName);
      if (color) localStorage.setItem('polyglot_user_color', this.userColor);
    }
  }

  public subscribe(listener: WorkspaceClientListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(type: string, payload: Record<string, unknown>): void {
    for (const listener of this.listeners) {
      listener({ type, payload });
    }
  }

  public connect(workspaceId: string): void {
    this.currentWorkspaceId = workspaceId;
    if (typeof window === 'undefined') return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.isConnected) {
        this.send({
          type: 'join_workspace',
          workspaceId,
          payload: {
            userId: this.userId,
            userName: this.userName,
            userColor: this.userColor,
            sinceSeq: this.lastSeenSeq,
          },
        });
      }
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/collaboration`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.notify('connection_status', { status: 'connected' });

        if (this.currentWorkspaceId) {
          this.send({
            type: 'join_workspace',
            workspaceId: this.currentWorkspaceId,
            payload: {
              userId: this.userId,
              userName: this.userName,
              userColor: this.userColor,
              sinceSeq: this.lastSeenSeq,
            },
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'workspace_snapshot') {
            const ws = data.workspace as ArchonWorkspace;
            if (ws && ws.ledger && ws.ledger.length > 0) {
              this.lastSeenSeq = ws.ledger[ws.ledger.length - 1].seq;
            }
          }
          this.notify(data.type, data);
        } catch (err) {
          console.error('[BlueprintWorkspaceClient] Parse error', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notify('connection_status', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[BlueprintWorkspaceClient] Socket error', err);
        this.isConnected = false;
      };
    } catch (err) {
      console.warn('[BlueprintWorkspaceClient] WebSocket initialization error', err);
      this.isConnected = false;
      this.isConnecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.currentWorkspaceId) {
        this.connect(this.currentWorkspaceId);
      }
    }, 3000);
  }

  public send(msg: { type: string; workspaceId: string; payload: Record<string, unknown> }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  // REST API Helpers with Dual Transport Fallback
  public async fetchWorkspaces(): Promise<WorkspaceSummary[]> {
    try {
      const res = await fetch('/api/v1/workspaces');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.workspaces || [];
    } catch {
      return [];
    }
  }

  public async fetchWorkspace(id: string): Promise<ArchonWorkspace | null> {
    try {
      const res = await fetch(`/api/v1/workspaces/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.workspace || null;
    } catch {
      return null;
    }
  }

  public async claimNode(
    workspaceId: string,
    nodeId: string,
    agentType: 'human' | 'claude' | 'leanstral' | 'axle' | 'heuristic' = 'human',
    notes?: string
  ): Promise<{ success: boolean; node?: BlueprintNode; message?: string }> {
    // Send over WebSocket for lowest latency
    if (this.isConnected) {
      this.send({
        type: 'claim_node',
        workspaceId,
        payload: { nodeId, agentType, notes },
      });
    }

    // Also execute via REST for reliable confirmation
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/blueprint/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          userId: this.userId,
          userName: this.userName,
          userColor: this.userColor,
          agentType,
          notes,
        }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }

  public async releaseNode(
    workspaceId: string,
    nodeId: string
  ): Promise<{ success: boolean; node?: BlueprintNode; message?: string }> {
    if (this.isConnected) {
      this.send({
        type: 'release_node',
        workspaceId,
        payload: { nodeId },
      });
    }

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/blueprint/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          userId: this.userId,
        }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }

  public async verifyNode(
    workspaceId: string,
    nodeId: string,
    proofCode?: string
  ): Promise<{ success: boolean; certificate?: KernelVerificationCertificate; node?: BlueprintNode; message?: string }> {
    if (this.isConnected) {
      this.send({
        type: 'verify_node',
        workspaceId,
        payload: { nodeId, proofCode },
      });
    }

    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/blueprint/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          proofCode,
          userId: this.userId,
          userName: this.userName,
        }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }

  public updateCursor(workspaceId: string, activeNodeId?: string): void {
    if (this.isConnected) {
      this.send({
        type: 'cursor_move',
        workspaceId,
        payload: { activeNodeId },
      });
    }
  }

  public sendChatMessage(workspaceId: string, text: string, nodeId?: string): void {
    if (this.isConnected) {
      this.send({
        type: 'chat_message',
        workspaceId,
        payload: { text, nodeId },
      });
    }
  }
}

export const sharedWorkspaceClient = new BlueprintWorkspaceClient();
