import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { WorkspaceStore } from './workspace-store';
import type { CollaboratorPresence } from '../../types/blueprint';

export interface RelayMessage {
  readonly type:
    | 'join_workspace'
    | 'leave_workspace'
    | 'presence_update'
    | 'cursor_move'
    | 'claim_node'
    | 'release_node'
    | 'verify_node'
    | 'chat_message'
    | 'sync_ledger';
  readonly workspaceId: string;
  readonly payload: Record<string, unknown>;
  readonly requestId?: string;
}

interface ClientConnection {
  readonly ws: WebSocket;
  workspaceId?: string;
  userId?: string;
  userName?: string;
  userColor?: string;
  lastHeartbeat: number;
}

export class BlueprintRelay {
  private readonly wss: WebSocketServer;
  private readonly clients = new Set<ClientConnection>();
  private readonly roomClients = new Map<string, Set<ClientConnection>>();
  private readonly store: WorkspaceStore;

  constructor(server: HttpServer, store: WorkspaceStore) {
    this.store = store;
    this.wss = new WebSocketServer({ server, path: '/ws/collaboration' });
    this.setupListeners();
  }

  private setupListeners(): void {
    this.wss.on('error', (err) => {
      console.warn('[BlueprintRelay WebSocketServer error]', err);
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const conn: ClientConnection = {
        ws,
        lastHeartbeat: Date.now(),
      };
      this.clients.add(conn);

      ws.on('message', (data: Buffer | string) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          const message = JSON.parse(raw) as RelayMessage;
          this.handleMessage(conn, message);
        } catch (err) {
          console.error('[BlueprintRelay] Malformed message', err);
          ws.send(JSON.stringify({ type: 'error', error: 'MALFORMED_MESSAGE' }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(conn);
      });

      ws.on('error', (err) => {
        console.error('[BlueprintRelay] Client socket error', err);
        this.handleDisconnect(conn);
      });
    });

    // Heartbeat check every 30s
    setInterval(() => {
      const now = Date.now();
      for (const conn of this.clients) {
        if (now - conn.lastHeartbeat > 60000) {
          conn.ws.terminate();
          this.handleDisconnect(conn);
        }
      }
    }, 30000);
  }

  private handleMessage(conn: ClientConnection, msg: RelayMessage): void {
    conn.lastHeartbeat = Date.now();
    const { type, workspaceId, payload, requestId } = msg;

    if (!workspaceId) {
      conn.ws.send(JSON.stringify({ type: 'error', error: 'MISSING_WORKSPACE_ID', requestId }));
      return;
    }

    switch (type) {
      case 'join_workspace': {
        const userId = String(payload.userId || `user-${Date.now().toString(36)}`);
        const userName = String(payload.userName || 'Mathematician');
        const userColor = String(payload.userColor || '#3b82f6');
        const sinceSeq = Number(payload.sinceSeq || 0);

        conn.workspaceId = workspaceId;
        conn.userId = userId;
        conn.userName = userName;
        conn.userColor = userColor;

        if (!this.roomClients.has(workspaceId)) {
          this.roomClients.set(workspaceId, new Set());
        }
        this.roomClients.get(workspaceId)!.add(conn);

        const presence: CollaboratorPresence = {
          userId,
          userName,
          userColor,
          status: 'active',
          lastSeen: Date.now(),
          clientType: 'browser',
        };
        this.store.updatePresence(workspaceId, presence);

        const workspace = this.store.getWorkspace(workspaceId);
        const presences = this.store.getPresences(workspaceId);
        const deltaLedger = sinceSeq > 0 ? this.store.getLedgerSync(workspaceId, sinceSeq) : null;

        // Reply to joining client with full snapshot (or delta)
        conn.ws.send(
          JSON.stringify({
            type: 'workspace_snapshot',
            workspaceId,
            requestId,
            workspace,
            presences,
            deltaLedger,
          })
        );

        // Broadcast presence joined to room
        this.broadcastToRoom(
          workspaceId,
          {
            type: 'presence_joined',
            workspaceId,
            presence,
            presences,
          },
          conn
        );
        break;
      }

      case 'cursor_move': {
        if (!conn.userId) return;
        const activeNodeId = payload.activeNodeId ? String(payload.activeNodeId) : undefined;
        const presence: CollaboratorPresence = {
          userId: conn.userId,
          userName: conn.userName || 'Mathematician',
          userColor: conn.userColor || '#3b82f6',
          status: 'active',
          activeNodeId,
          lastSeen: Date.now(),
          clientType: 'browser',
        };
        this.store.updatePresence(workspaceId, presence);

        this.broadcastToRoom(
          workspaceId,
          {
            type: 'presence_cursor',
            workspaceId,
            presence,
          },
          conn
        );
        break;
      }

      case 'claim_node': {
        const nodeId = String(payload.nodeId);
        const agentType = (payload.agentType as any) || 'human';
        const notes = payload.notes ? String(payload.notes) : undefined;

        const result = this.store.claimNode(
          workspaceId,
          nodeId,
          {
            id: conn.userId || 'anonymous',
            name: conn.userName || 'Mathematician',
            color: conn.userColor || '#3b82f6',
          },
          agentType,
          notes
        );

        if (result.success && result.node) {
          this.broadcastToRoom(workspaceId, {
            type: 'node_claimed',
            workspaceId,
            node: result.node,
            claim: result.node.claim,
          });
        } else {
          conn.ws.send(
            JSON.stringify({
              type: 'claim_rejected',
              workspaceId,
              requestId,
              code: result.code,
              message: result.message,
            })
          );
        }
        break;
      }

      case 'release_node': {
        const nodeId = String(payload.nodeId);
        const result = this.store.releaseNode(workspaceId, nodeId, conn.userId || 'anonymous');

        if (result.success && result.node) {
          this.broadcastToRoom(workspaceId, {
            type: 'node_released',
            workspaceId,
            node: result.node,
          });
        }
        break;
      }

      case 'verify_node': {
        const nodeId = String(payload.nodeId);
        const proofCode = payload.proofCode ? String(payload.proofCode) : undefined;

        const result = this.store.verifyNode(workspaceId, nodeId, proofCode, {
          id: conn.userId || 'verifier',
          name: conn.userName || 'Lean 4 Kernel',
        });

        if (result.success && result.node) {
          this.broadcastToRoom(workspaceId, {
            type: 'node_verified',
            workspaceId,
            node: result.node,
            certificate: result.certificate,
          });
        } else {
          conn.ws.send(
            JSON.stringify({
              type: 'verification_failed',
              workspaceId,
              requestId,
              code: result.code,
              message: result.message,
            })
          );
        }
        break;
      }

      case 'chat_message': {
        const text = String(payload.text || '').trim();
        const nodeId = payload.nodeId ? String(payload.nodeId) : undefined;
        if (!text) return;

        const chatEntry = {
          id: `msg-${Date.now().toString(36)}`,
          timestamp: Date.now(),
          author: {
            id: conn.userId || 'anon',
            name: conn.userName || 'Mathematician',
            color: conn.userColor || '#3b82f6',
          },
          text,
          nodeId,
        };

        this.broadcastToRoom(workspaceId, {
          type: 'chat_message',
          workspaceId,
          message: chatEntry,
        });
        break;
      }

      case 'sync_ledger': {
        const sinceSeq = Number(payload.sinceSeq || 0);
        const delta = this.store.getLedgerSync(workspaceId, sinceSeq);
        conn.ws.send(
          JSON.stringify({
            type: 'ledger_sync_result',
            workspaceId,
            requestId,
            delta,
          })
        );
        break;
      }

      default:
        conn.ws.send(JSON.stringify({ type: 'warning', message: `Unknown action: ${type}` }));
    }
  }

  private handleDisconnect(conn: ClientConnection): void {
    this.clients.delete(conn);
    if (conn.workspaceId && conn.userId) {
      const room = this.roomClients.get(conn.workspaceId);
      if (room) {
        room.delete(conn);
        if (room.size === 0) {
          this.roomClients.delete(conn.workspaceId);
        }
      }

      this.store.removePresence(conn.workspaceId, conn.userId);
      const presences = this.store.getPresences(conn.workspaceId);

      this.broadcastToRoom(conn.workspaceId, {
        type: 'presence_left',
        workspaceId: conn.workspaceId,
        userId: conn.userId,
        presences,
      });
    }
  }

  private broadcastToRoom(
    workspaceId: string,
    message: Record<string, unknown>,
    excludeConn?: ClientConnection
  ): void {
    const room = this.roomClients.get(workspaceId);
    if (!room) return;

    const payload = JSON.stringify(message);
    for (const client of room) {
      if (client !== excludeConn && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }
}
