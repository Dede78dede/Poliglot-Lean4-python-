import type {
  ArchonWorkspace,
  BlueprintNode,
  BlueprintEdge,
  CollaboratorPresence,
  LedgerEntry,
  WorkspaceSummary,
  AgentType,
} from '../../types/blueprint';
import {
  DEFAULT_CLAIM_TTL_MS,
  GENESIS_PREV_HASH,
  computeLedgerEntryHash,
  type ClaimResult,
  type VerifyNodeResult,
  type WorkspaceStoreOptions,
  buildDefaultWorkspace,
  buildNewWorkspace,
  buildWorkspaceSummary,
} from './workspace-store.types';
import { WorkspaceLedgerService } from './workspace-ledger-service';
import { WorkspaceLeaseService } from './workspace-lease-service';
import { WorkspaceMilestoneService } from './workspace-milestone-service';

export {
  DEFAULT_CLAIM_TTL_MS, GENESIS_PREV_HASH, computeLedgerEntryHash,
  type ClaimResult, type VerifyNodeResult, type WorkspaceStoreOptions,
};

export class WorkspaceStore {
  private readonly workspaces = new Map<string, ArchonWorkspace>();
  private readonly activePresences = new Map<string, Map<string, CollaboratorPresence>>();
  private readonly ledgerService: WorkspaceLedgerService;
  private readonly leaseService: WorkspaceLeaseService;
  private readonly milestoneService: WorkspaceMilestoneService;

  constructor(options?: WorkspaceStoreOptions) {
    const ttl =
      options?.claimTtlMs ??
      (typeof process !== 'undefined' && process.env?.CLAIM_TTL_MS
        ? Number(process.env.CLAIM_TTL_MS)
        : DEFAULT_CLAIM_TTL_MS);

    this.ledgerService = new WorkspaceLedgerService();
    this.leaseService = new WorkspaceLeaseService(ttl, this.ledgerService);
    this.milestoneService = new WorkspaceMilestoneService(this.ledgerService);

    const { workspace, presences } = buildDefaultWorkspace();
    this.workspaces.set(workspace.id, workspace);
    const presMap = new Map<string, CollaboratorPresence>();
    presences.forEach((p) => presMap.set(p.userId, p));
    this.activePresences.set(workspace.id, presMap);

    if (options?.autoRecoverCrash !== false) {
      this.reconcilePostCrashState();
    }
  }

  public getClaimTtlMs(): number { return this.leaseService.getClaimTtlMs(); }
  public setClaimTtlMs(ms: number): void { this.leaseService.setClaimTtlMs(ms); }

  public listWorkspaces(): WorkspaceSummary[] {
    return Array.from(this.workspaces.values()).map((ws) =>
      buildWorkspaceSummary(ws, this.activePresences.get(ws.id)?.size || ws.collaborators.length)
    );
  }

  public getWorkspace(id: string): ArchonWorkspace | undefined {
    const ws = this.workspaces.get(id);
    if (!ws) return undefined;
    const presMap = this.activePresences.get(id);
    return { ...ws, collaborators: presMap ? Array.from(presMap.values()) : ws.collaborators };
  }

  public getNode(workspaceId: string, nodeId: string): BlueprintNode | undefined {
    return this.workspaces.get(workspaceId)?.nodes.find((n) => n.id === nodeId);
  }

  public createWorkspace(params: {
    id: string;
    name: string;
    description: string;
    toolchain?: string;
    nodes?: BlueprintNode[];
    edges?: BlueprintEdge[];
  }): ArchonWorkspace {
    const ws = buildNewWorkspace(params);
    this.workspaces.set(ws.id, ws);
    this.activePresences.set(ws.id, new Map());
    return ws;
  }

  public claimNode(workspaceId: string, nodeId: string, user: { id: string; name: string; color?: string }, agentType: AgentType = 'human', notes?: string): ClaimResult {
    const { updatedWs, result } = this.leaseService.claimNode(this.workspaces.get(workspaceId), nodeId, user, agentType, notes);
    if (updatedWs) this.workspaces.set(workspaceId, updatedWs);
    return result;
  }

  public releaseNode(workspaceId: string, nodeId: string, userId: string): ClaimResult {
    const { updatedWs, result } = this.leaseService.releaseNode(this.workspaces.get(workspaceId), nodeId, userId);
    if (updatedWs) this.workspaces.set(workspaceId, updatedWs);
    return result;
  }

  public verifyNode(workspaceId: string, nodeId: string, proofCode?: string, user?: { id: string; name: string }): VerifyNodeResult {
    const { updatedWs, result } = this.milestoneService.verifyNode(this.workspaces.get(workspaceId), nodeId, proofCode, user);
    if (updatedWs) this.workspaces.set(workspaceId, updatedWs);
    return result;
  }

  public updatePresence(workspaceId: string, presence: CollaboratorPresence): void {
    if (!this.activePresences.has(workspaceId)) this.activePresences.set(workspaceId, new Map());
    this.activePresences.get(workspaceId)!.set(presence.userId, presence);
  }
  public removePresence(workspaceId: string, userId: string): void {
    this.activePresences.get(workspaceId)?.delete(userId);
  }
  public getPresences(workspaceId: string): CollaboratorPresence[] {
    const map = this.activePresences.get(workspaceId);
    return map ? Array.from(map.values()) : [];
  }

  public getLedgerSync(workspaceId: string, sinceSeq: number): LedgerEntry[] {
    return this.ledgerService.getLedgerSync(this.workspaces.get(workspaceId), sinceSeq);
  }

  public appendLedgerEntry(workspaceId: string, entry: Omit<LedgerEntry, 'seq' | 'prevHash' | 'integrityHash'>): LedgerEntry | undefined {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return undefined;
    const { updatedWs, entry: fullEntry } = this.ledgerService.appendEntry(ws, entry);
    this.workspaces.set(workspaceId, updatedWs);
    return fullEntry;
  }

  public verifyLedgerChain(workspaceId: string): { valid: boolean; brokenSeq?: number; error?: string } {
    return this.ledgerService.verifyChain(this.workspaces.get(workspaceId));
  }

  public reconcileExpiredClaims(workspaceId?: string, currentTime?: number): string[] {
    return this.leaseService.reconcileExpiredClaims(this.workspaces, workspaceId, currentTime);
  }

  public reconcilePostCrashState(): { releasedClaimsCount: number; releasedNodeIds: string[] } {
    return this.leaseService.reconcilePostCrashState(this.workspaces);
  }
}
