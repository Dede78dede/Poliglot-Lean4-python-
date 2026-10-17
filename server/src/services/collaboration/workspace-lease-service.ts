import type {
  ArchonWorkspace,
  BlueprintNode,
  AgentType,
} from '../../types/blueprint';
import type { ClaimResult } from './workspace-store.types';
import { WorkspaceLedgerService } from './workspace-ledger-service';

export class WorkspaceLeaseService {
  constructor(
    private claimTtlMs: number,
    private readonly ledgerService: WorkspaceLedgerService
  ) {}

  public getClaimTtlMs(): number {
    return this.claimTtlMs;
  }

  public setClaimTtlMs(ms: number): void {
    this.claimTtlMs = ms;
  }

  public claimNode(
    ws: ArchonWorkspace | undefined,
    nodeId: string,
    user: { id: string; name: string; color?: string },
    agentType: AgentType = 'human',
    notes?: string
  ): { updatedWs?: ArchonWorkspace; result: ClaimResult } {
    if (!ws) {
      return { result: { success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace does not exist' } };
    }

    const nodeIndex = ws.nodes.findIndex((n: BlueprintNode) => n.id === nodeId);
    if (nodeIndex === -1) {
      return { result: { success: false, code: 'NODE_NOT_FOUND', message: 'Node not found in workspace' } };
    }

    const existingNode = ws.nodes[nodeIndex];
    const now = Date.now();

    if (existingNode.status === 'kernel_verified') {
      return {
        result: {
          success: false,
          code: 'CONFLICT_ALREADY_CLAIMED',
          message: 'Node is already kernel-verified and sealed',
        },
      };
    }

    if (existingNode.claim && existingNode.claim.userId !== user.id) {
      const claimAgeMs = now - existingNode.claim.claimedAt;
      if (claimAgeMs < this.claimTtlMs) {
        return {
          result: {
            success: false,
            code: 'CONFLICT_ALREADY_CLAIMED',
            message: `Node is currently claimed by ${existingNode.claim.userName}`,
          },
        };
      }
    }

    const claim = {
      userId: user.id,
      userName: user.name,
      userColor: user.color || '#3b82f6',
      claimedAt: now,
      expiresAt: now + this.claimTtlMs,
      agentType,
      notes,
    };

    const updatedNode: BlueprintNode = {
      ...existingNode,
      status: 'claimed',
      claim,
    };

    const updatedNodes = [...ws.nodes];
    updatedNodes[nodeIndex] = updatedNode;

    const { updatedWs } = this.ledgerService.appendEntry(
      { ...ws, nodes: updatedNodes },
      {
        id: `claim-${now}-${(ws.ledger[ws.ledger.length - 1]?.seq || 0) + 1}`,
        timestamp: now,
        author: {
          id: user.id,
          name: user.name,
          role: agentType === 'human' ? 'mathematician' : 'agent',
        },
        type: 'node_claimed',
        nodeId,
        payload: { claimer: user.name, agentType, notes },
      }
    );

    return {
      updatedWs,
      result: { success: true, code: 'OK', node: updatedNode },
    };
  }

  public releaseNode(
    ws: ArchonWorkspace | undefined,
    nodeId: string,
    userId: string
  ): { updatedWs?: ArchonWorkspace; result: ClaimResult } {
    if (!ws) {
      return { result: { success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace does not exist' } };
    }

    const nodeIndex = ws.nodes.findIndex((n: BlueprintNode) => n.id === nodeId);
    if (nodeIndex === -1) {
      return { result: { success: false, code: 'NODE_NOT_FOUND', message: 'Node not found' } };
    }

    const existingNode = ws.nodes[nodeIndex];
    if (existingNode.status === 'kernel_verified') {
      return { result: { success: false, code: 'CONFLICT_ALREADY_CLAIMED', message: 'Cannot release verified node' } };
    }

    const now = Date.now();
    const updatedNode: BlueprintNode = {
      ...existingNode,
      status: 'unproven',
      claim: undefined,
    };

    const updatedNodes = [...ws.nodes];
    updatedNodes[nodeIndex] = updatedNode;

    const { updatedWs } = this.ledgerService.appendEntry(
      { ...ws, nodes: updatedNodes },
      {
        id: `rel-${now}-${(ws.ledger[ws.ledger.length - 1]?.seq || 0) + 1}`,
        timestamp: now,
        author: { id: userId, name: 'Collaborator', role: 'mathematician' },
        type: 'node_released',
        nodeId,
        payload: { previousClaimer: existingNode.claim?.userName },
      }
    );

    return {
      updatedWs,
      result: { success: true, code: 'OK', node: updatedNode },
    };
  }

  public reconcileExpiredClaims(
    workspaces: Map<string, ArchonWorkspace>,
    workspaceId?: string,
    currentTime?: number
  ): string[] {
    const now = currentTime ?? Date.now();
    const expiredNodeIds: string[] = [];
    const targetWorkspaces = workspaceId
      ? ([workspaces.get(workspaceId)].filter(Boolean) as ArchonWorkspace[])
      : Array.from(workspaces.values());

    for (const ws of targetWorkspaces) {
      let modified = false;
      const updatedNodes = ws.nodes.map((node: BlueprintNode) => {
        if (node.status === 'claimed' && node.claim) {
          const claimAge = now - node.claim.claimedAt;
          if (claimAge >= this.claimTtlMs) {
            expiredNodeIds.push(`${ws.id}:${node.id}`);
            modified = true;
            return {
              ...node,
              status: 'unproven' as const,
              claim: undefined,
            };
          }
        }
        return node;
      });

      if (modified) {
        workspaces.set(ws.id, {
          ...ws,
          nodes: updatedNodes,
          updatedAt: now,
        });
      }
    }
    return expiredNodeIds;
  }

  public reconcilePostCrashState(workspaces: Map<string, ArchonWorkspace>): {
    releasedClaimsCount: number;
    releasedNodeIds: string[]
  } {
    const releasedNodeIds: string[] = [];
    for (const [wsId, ws] of workspaces.entries()) {
      let modified = false;
      const updatedNodes = ws.nodes.map((node: BlueprintNode) => {
        if (node.status === 'claimed' && !node.kernelCertificate) {
          releasedNodeIds.push(`${wsId}:${node.id}`);
          modified = true;
          return {
            ...node,
            status: 'unproven' as const,
            claim: undefined,
          };
        }
        return node;
      });

      if (modified) {
        workspaces.set(wsId, {
          ...ws,
          nodes: updatedNodes,
          updatedAt: Date.now(),
        });
      }
    }
    return { releasedClaimsCount: releasedNodeIds.length, releasedNodeIds };
  }
}
