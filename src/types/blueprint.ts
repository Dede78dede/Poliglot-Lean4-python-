/**
 * Phase 7: Blueprint Workspaces & Collaborative Proof Engineering Types
 * Governs the Archon Horizon-inspired mathematical DAG, shared task ledger,
 * kernel verification seals, and multi-user presence protocol.
 */

export type DeclarationKind =
  | 'theorem'
  | 'lemma'
  | 'definition'
  | 'axiom'
  | 'inductive'
  | 'python_witness'
  | 'hypothesis';

export type NodeLanguage = 'lean4' | 'python' | 'hybrid';

export type VerificationStatus =
  | 'unproven'
  | 'claimed'
  | 'kernel_verified'
  | 'empirically_validated'
  | 'disproven'
  | 'blocked';

export type EdgeRole =
  | 'type_dependency'      // Target type expression references source declaration
  | 'value_dependency'     // Target proof body or implementation uses source declaration
  | 'theorem_dependency'   // Target theorem applies source lemma in proof
  | 'witness_dependency'   // Python empirical witness tests/asserts invariant of Lean theorem
  | 'specializes'          // Target is a corollary or instance specialization of source
  | 'refines';             // Target refines source abstract specification

export type AgentType = 'human' | 'claude' | 'leanstral' | 'axle' | 'heuristic' | 'pyfixer';

export interface NodeClaim {
  readonly userId: string;
  readonly userName: string;
  readonly userColor: string;
  readonly claimedAt: number;
  readonly expiresAt?: number;
  readonly agentType: AgentType;
  readonly notes?: string;
}

export interface KernelVerificationCertificate {
  readonly verifiedAt: number;
  readonly contentHash: string; // SHA-256 seal of declaration and proof
  readonly kernelTermsChecked: number;
  readonly durationMs: number;
  readonly toolchain: string;
  readonly zeroSorryVerified: boolean;
  readonly strictGoalsTerm: boolean;
  readonly signatureSeal: string;
}

export interface EmpiricalValidationCertificate {
  readonly validatedAt: number;
  readonly passedTests: number;
  readonly totalTests: number;
  readonly durationMs: number;
  readonly oracleType: 'pyodide_numpy' | 'sage_oracle' | 'property_tests' | 'smt_solver';
  readonly testWitnessHash: string;
}

export interface BlueprintNode {
  readonly id: string;               // Canonical declaration ID (e.g. "Nat.Prime.infinite")
  readonly name: string;             // Short display name (e.g. "infinite")
  readonly kind: DeclarationKind;
  readonly language: NodeLanguage;
  readonly filePath: string;
  readonly lineRange: {
    readonly start: number;
    readonly end: number;
  };
  readonly signature: string;        // e.g. "theorem infinite (p : Nat) : ∃ q > p, q.Prime"
  readonly statement?: string;       // Informal explanation or docstring
  readonly status: VerificationStatus;
  readonly code: string;             // Full source code of declaration
  readonly contentHash: string;      // Current content SHA-256 hash
  readonly claim?: NodeClaim;
  readonly kernelCertificate?: KernelVerificationCertificate;
  readonly empiricalCertificate?: EmpiricalValidationCertificate;
  readonly openGoals?: readonly string[];
  readonly complexityWeight: number; // 1-10 heuristic estimation of proof difficulty
  readonly layer: number;            // Topological level: 0 = axioms/defs, 1+ = lemmas/theorems
}

export interface BlueprintEdge {
  readonly id: string;               // "${from}->${to}:${role}"
  readonly from: string;             // Source node ID
  readonly to: string;               // Target node ID
  readonly role: EdgeRole;
  readonly description?: string;
}

export type LedgerEntryType =
  | 'node_claimed'
  | 'node_released'
  | 'node_verified'
  | 'node_added'
  | 'node_updated'
  | 'witness_validated'
  | 'task_created'
  | 'budget_allocated'
  | 'milestone_reached'
  | 'artifact_sealed';

export interface LedgerEntry {
  readonly seq: number;              // Strictly monotonic sequence number
  readonly id: string;
  readonly timestamp: number;
  readonly author: {
    readonly id: string;
    readonly name: string;
    readonly role: 'mathematician' | 'developer' | 'agent' | 'verifier';
  };
  readonly type: LedgerEntryType;
  readonly nodeId?: string;
  readonly payload: Record<string, unknown>;
  readonly prevHash: string;         // Cryptographic hash chain link to previous entry
  readonly integrityHash: string;    // SHA-256(seq + prevHash + timestamp + author + type + payload)
}

export interface RoadmapMilestone {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly targetNodeIds: readonly string[];
  readonly completed: boolean;
  readonly order: number;
}

export interface WorkspaceBudget {
  readonly computeSecondsUsed: number;
  readonly computeSecondsLimit: number;
  readonly tokensUsed: number;
  readonly proofsCompleted: number;
  readonly totalProofObligations: number;
  readonly hybridComplexityScore: number;
}

export interface CollaboratorPresence {
  readonly userId: string;
  readonly userName: string;
  readonly userColor: string;
  readonly status: 'active' | 'idle' | 'offline';
  readonly activeNodeId?: string;
  readonly lastSeen: number;
  readonly clientType: 'browser' | 'vscode' | 'archon_cli' | 'agent_harness';
}

export interface ArchonWorkspace {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rootPath: string;
  readonly toolchain: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly budget: WorkspaceBudget;
  readonly nodes: readonly BlueprintNode[];
  readonly edges: readonly BlueprintEdge[];
  readonly ledger: readonly LedgerEntry[];
  readonly roadmap: readonly RoadmapMilestone[];
  readonly collaborators: readonly CollaboratorPresence[];
}

export interface WorkspaceSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly toolchain: string;
  readonly totalNodes: number;
  readonly verifiedNodes: number;
  readonly claimedNodes: number;
  readonly completionPercent: number;
  readonly activeCollaborators: number;
  readonly updatedAt: number;
}
