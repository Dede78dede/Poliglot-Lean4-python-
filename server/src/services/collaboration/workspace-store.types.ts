import type {
  ArchonWorkspace,
  BlueprintNode,
  BlueprintEdge,
  CollaboratorPresence,
  LedgerEntry,
  WorkspaceSummary,
  KernelVerificationCertificate,
  RoadmapMilestone,
} from '../../types/blueprint';
import { computeContentHash } from './blueprint-extractor';

export const DEFAULT_CLAIM_TTL_MS = 1_800_000; // 30 minutes
export const GENESIS_PREV_HASH = '0'.repeat(64);

export function computeLedgerEntryHash(
  seq: number,
  prevHash: string,
  timestamp: number,
  authorId: string,
  type: string,
  nodeId: string | undefined,
  payload: Record<string, unknown>
): string {
  const serialized = `${seq}|${prevHash}|${timestamp}|${authorId}|${type}|${nodeId || ''}|${JSON.stringify(payload)}`;
  return computeContentHash(serialized);
}

export interface ClaimResult {
  readonly success: boolean;
  readonly code?: 'OK' | 'CONFLICT_ALREADY_CLAIMED' | 'NODE_NOT_FOUND' | 'WORKSPACE_NOT_FOUND';
  readonly message?: string;
  readonly node?: BlueprintNode;
}

export interface VerifyNodeResult {
  readonly success: boolean;
  readonly code?: 'OK' | 'VERIFICATION_FAILED' | 'HAS_SORRY' | 'NODE_NOT_FOUND' | 'WORKSPACE_NOT_FOUND';
  readonly message?: string;
  readonly certificate?: KernelVerificationCertificate;
  readonly node?: BlueprintNode;
}

export interface WorkspaceStoreOptions {
  readonly claimTtlMs?: number;
  readonly autoRecoverCrash?: boolean;
}

export function buildDefaultWorkspace(): {
  workspace: ArchonWorkspace;
  presences: CollaboratorPresence[];
} {
  const now = Date.now();

  const ws1Nodes: BlueprintNode[] = [
    {
      id: 'CondensedSet',
      name: 'CondensedSet',
      kind: 'definition',
      language: 'lean4',
      filePath: 'Liquid/Condensed/Basic.lean',
      lineRange: { start: 12, end: 28 },
      signature: 'def CondensedSet (C : Type*) [Category C] := Sheaf Profinite C',
      statement: 'Foundational definition of condensed sets as sheaves on the site of stonean profinite spaces',
      status: 'kernel_verified',
      code: 'def CondensedSet (C : Type*) [Category C] := Sheaf Profinite C',
      contentHash: computeContentHash('def CondensedSet (C : Type*) [Category C] := Sheaf Profinite C'),
      complexityWeight: 2,
      layer: 0,
      kernelCertificate: {
        verifiedAt: now - 7200000,
        contentHash: 'sha256-a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        kernelTermsChecked: 5,
        durationMs: 45,
        toolchain: 'v4.35.0-rc4',
        zeroSorryVerified: true,
        strictGoalsTerm: true,
        signatureSeal: 'LEAN4_KERNEL_SEAL_COND_SET_01',
      },
    },
    {
      id: 'ProfiniteSpace',
      name: 'ProfiniteSpace',
      kind: 'inductive',
      language: 'lean4',
      filePath: 'Liquid/Condensed/Profinite.lean',
      lineRange: { start: 5, end: 18 },
      signature: 'inductive ProfiniteSpace : Type (u + 1) where | mk (X : Type u) [CompactSpace X] [TotallyDisconnectedSpace X] : ProfiniteSpace',
      statement: 'Compact Hausdorff totally disconnected topological space',
      status: 'kernel_verified',
      code: 'inductive ProfiniteSpace : Type (u + 1) where | mk (X : Type u) [CompactSpace X] [TotallyDisconnectedSpace X] : ProfiniteSpace',
      contentHash: computeContentHash('inductive ProfiniteSpace'),
      complexityWeight: 2,
      layer: 0,
      kernelCertificate: {
        verifiedAt: now - 7100000,
        contentHash: 'sha256-b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
        kernelTermsChecked: 5,
        durationMs: 38,
        toolchain: 'v4.35.0-rc4',
        zeroSorryVerified: true,
        strictGoalsTerm: true,
        signatureSeal: 'LEAN4_KERNEL_SEAL_PROFINITE_02',
      },
    },
    {
      id: 'Ext_R_finite',
      name: 'Ext_R_finite',
      kind: 'lemma',
      language: 'lean4',
      filePath: 'Liquid/Condensed/Homology.lean',
      lineRange: { start: 40, end: 62 },
      signature: 'lemma Ext_R_finite (M : CondensedAbelianGroup) [FiniteFree M] : Ext 1 M ℝ = 0',
      statement: 'Ext group with coefficients in real numbers vanishes on finite free condensed modules',
      status: 'kernel_verified',
      code: 'lemma Ext_R_finite (M : CondensedAbelianGroup) [FiniteFree M] : Ext 1 M ℝ = 0 := by\n  intro M hM\n  apply Ext_projective_vanishing\n  exact hM.projective',
      contentHash: computeContentHash('lemma Ext_R_finite'),
      complexityWeight: 4,
      layer: 1,
      kernelCertificate: {
        verifiedAt: now - 3600000,
        contentHash: 'sha256-c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
        kernelTermsChecked: 5,
        durationMs: 92,
        toolchain: 'v4.35.0-rc4',
        zeroSorryVerified: true,
        strictGoalsTerm: true,
        signatureSeal: 'LEAN4_KERNEL_SEAL_EXT_R_03',
      },
    },
    {
      id: 'witness_betti_numbers',
      name: 'betti_numbers',
      kind: 'python_witness',
      language: 'python',
      filePath: 'verification/test_betti.py',
      lineRange: { start: 1, end: 24 },
      signature: 'def test_betti_ext_zero_witness():',
      statement: 'Validates invariant for Ext_R_finite via NumPy simplicial cohomology computation',
      status: 'empirically_validated',
      code: 'def test_betti_ext_zero_witness():\n    # Witness for: Ext_R_finite\n    import numpy as np\n    coboundary = np.array([[1, -1, 0], [0, 1, -1]])\n    rank = np.linalg.matrix_rank(coboundary)\n    assert rank == 2, "Betti coboundary rank must equal 2"',
      contentHash: computeContentHash('witness_betti_numbers'),
      complexityWeight: 2,
      layer: 1,
      empiricalCertificate: {
        validatedAt: now - 1800000,
        passedTests: 15,
        totalTests: 15,
        durationMs: 34,
        oracleType: 'pyodide_numpy',
        testWitnessHash: 'sha256-d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3',
      },
    },
    {
      id: 'LiquidTensor_vanishes',
      name: 'LiquidTensor_vanishes',
      kind: 'theorem',
      language: 'lean4',
      filePath: 'Liquid/Main/Vanishing.lean',
      lineRange: { start: 70, end: 110 },
      signature: 'theorem LiquidTensor_vanishes (S : ProfiniteSpace) (p : ℝ≥0) (hp : p < 1) : Ext 1 (CondensedSet.ofProfinite S) (ℳ_p S) = 0',
      statement: 'Core vanishing theorem for liquid measure modules over profinite generators',
      status: 'kernel_verified',
      code: 'theorem LiquidTensor_vanishes (S : ProfiniteSpace) (p : ℝ≥0) (hp : p < 1) : Ext 1 (CondensedSet.ofProfinite S) (ℳ_p S) = 0 := by\n  intros S p hp\n  apply exact_sequence_limit\n  · exact Ext_R_finite _\n  · exact hp',
      contentHash: computeContentHash('theorem LiquidTensor_vanishes'),
      complexityWeight: 7,
      layer: 2,
      kernelCertificate: {
        verifiedAt: now - 900000,
        contentHash: 'sha256-e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
        kernelTermsChecked: 5,
        durationMs: 142,
        toolchain: 'v4.35.0-rc4',
        zeroSorryVerified: true,
        strictGoalsTerm: true,
        signatureSeal: 'LEAN4_KERNEL_SEAL_LIQUID_VANISH_04',
      },
    },
    {
      id: 'Condensed_exact_seq',
      name: 'Condensed_exact_seq',
      kind: 'lemma',
      language: 'lean4',
      filePath: 'Liquid/Main/Sequences.lean',
      lineRange: { start: 15, end: 42 },
      signature: 'lemma Condensed_exact_seq (A B C : CondensedAbelianGroup) (f : A ⟶ B) (g : B ⟶ C) : Exact f g ↔ Ker g = Im f',
      statement: 'Categorical exact sequence criterion in the abelian category of condensed abelian groups',
      status: 'claimed',
      code: 'lemma Condensed_exact_seq (A B C : CondensedAbelianGroup) (f : A ⟶ B) (g : B ⟶ C) : Exact f g ↔ Ker g = Im f := by\n  constructor\n  · intro h; exact h.ker_eq_im\n  · intro h; sorry',
      contentHash: computeContentHash('lemma Condensed_exact_seq'),
      claim: {
        userId: 'user-scholze',
        userName: 'Peter Scholze',
        userColor: '#3b82f6',
        claimedAt: now - 1200000,
        agentType: 'human',
        notes: 'Formalizing reverse implication using standard categorical snake lemma',
      },
      openGoals: ['⊢ Ker g = Im f → Exact f g'],
      complexityWeight: 5,
      layer: 2,
    },
    {
      id: 'MainTheorem_liquid',
      name: 'MainTheorem_liquid',
      kind: 'theorem',
      language: 'lean4',
      filePath: 'Liquid/Main/Theorem.lean',
      lineRange: { start: 105, end: 145 },
      signature: 'theorem MainTheorem_liquid (S : ProfiniteSpace) : CompleteLiquidArchitecture S',
      statement: 'Liquid Tensor Experiment Master Theorem (Challenge 9.1 by Scholze)',
      status: 'unproven',
      code: 'theorem MainTheorem_liquid (S : ProfiniteSpace) : CompleteLiquidArchitecture S := by\n  intro S\n  have h1 := LiquidTensor_vanishes S\n  have h2 := Condensed_exact_seq\n  sorry',
      contentHash: computeContentHash('theorem MainTheorem_liquid'),
      openGoals: ['⊢ CompleteLiquidArchitecture S'],
      complexityWeight: 9,
      layer: 3,
    },
  ];

  const ws1Edges: BlueprintEdge[] = [
    { id: 'CondensedSet->Ext_R_finite:type_dependency', from: 'CondensedSet', to: 'Ext_R_finite', role: 'type_dependency', description: 'Ext uses CondensedSet' },
    { id: 'ProfiniteSpace->CondensedSet:type_dependency', from: 'ProfiniteSpace', to: 'CondensedSet', role: 'type_dependency', description: 'CondensedSet is sheaf on Profinite' },
    { id: 'witness_betti_numbers->Ext_R_finite:witness_dependency', from: 'witness_betti_numbers', to: 'Ext_R_finite', role: 'witness_dependency', description: 'NumPy cohomology witness validates Ext_R_finite' },
    { id: 'Ext_R_finite->LiquidTensor_vanishes:theorem_dependency', from: 'Ext_R_finite', to: 'LiquidTensor_vanishes', role: 'theorem_dependency', description: 'LiquidTensor_vanishes applies Ext_R_finite' },
    { id: 'ProfiniteSpace->LiquidTensor_vanishes:type_dependency', from: 'ProfiniteSpace', to: 'LiquidTensor_vanishes', role: 'type_dependency', description: 'LiquidTensor_vanishes operates on ProfiniteSpace' },
    { id: 'CondensedSet->Condensed_exact_seq:type_dependency', from: 'CondensedSet', to: 'Condensed_exact_seq', role: 'type_dependency', description: 'Condensed_exact_seq operates on condensed groups' },
    { id: 'LiquidTensor_vanishes->MainTheorem_liquid:theorem_dependency', from: 'LiquidTensor_vanishes', to: 'MainTheorem_liquid', role: 'theorem_dependency', description: 'Master theorem invokes vanishing theorem' },
    { id: 'Condensed_exact_seq->MainTheorem_liquid:theorem_dependency', from: 'Condensed_exact_seq', to: 'MainTheorem_liquid', role: 'theorem_dependency', description: 'Master theorem invokes exact sequence lemma' },
  ];

  const h1 = computeLedgerEntryHash(1, GENESIS_PREV_HASH, now - 7200000, 'admin', 'node_added', 'CondensedSet', { name: 'CondensedSet', kind: 'definition' });
  const h2 = computeLedgerEntryHash(2, h1, now - 3600000, 'user-clausen', 'node_verified', 'Ext_R_finite', { durationMs: 92, verifiedTerms: 5 });
  const h3 = computeLedgerEntryHash(3, h2, now - 1800000, 'dev-python', 'witness_validated', 'witness_betti_numbers', { passedTests: 15, oracle: 'pyodide_numpy' });
  const h4 = computeLedgerEntryHash(4, h3, now - 1200000, 'user-scholze', 'node_claimed', 'Condensed_exact_seq', { claimer: 'Peter Scholze', agent: 'human' });

  const ws1Ledger: LedgerEntry[] = [
    { seq: 1, id: 'ledg-101', timestamp: now - 7200000, author: { id: 'admin', name: 'Johan Commelin', role: 'mathematician' }, type: 'node_added', nodeId: 'CondensedSet', payload: { name: 'CondensedSet', kind: 'definition' }, prevHash: GENESIS_PREV_HASH, integrityHash: h1 },
    { seq: 2, id: 'ledg-102', timestamp: now - 3600000, author: { id: 'user-clausen', name: 'Dustin Clausen', role: 'mathematician' }, type: 'node_verified', nodeId: 'Ext_R_finite', payload: { durationMs: 92, verifiedTerms: 5 }, prevHash: h1, integrityHash: h2 },
    { seq: 3, id: 'ledg-103', timestamp: now - 1800000, author: { id: 'dev-python', name: 'Scientific Python Harness', role: 'developer' }, type: 'witness_validated', nodeId: 'witness_betti_numbers', payload: { passedTests: 15, oracle: 'pyodide_numpy' }, prevHash: h2, integrityHash: h3 },
    { seq: 4, id: 'ledg-104', timestamp: now - 1200000, author: { id: 'user-scholze', name: 'Peter Scholze', role: 'mathematician' }, type: 'node_claimed', nodeId: 'Condensed_exact_seq', payload: { claimer: 'Peter Scholze', agent: 'human' }, prevHash: h3, integrityHash: h4 },
  ];

  const ws1Presences: CollaboratorPresence[] = [
    { userId: 'user-scholze', userName: 'Peter Scholze', userColor: '#3b82f6', status: 'active', activeNodeId: 'Condensed_exact_seq', lastSeen: now, clientType: 'browser' },
    { userId: 'user-commelin', userName: 'Johan Commelin', userColor: '#10b981', status: 'active', activeNodeId: 'MainTheorem_liquid', lastSeen: now - 15000, clientType: 'browser' },
    { userId: 'agent-leanstral', userName: 'Leanstral 1.5 (MoE Agent)', userColor: '#8b5cf6', status: 'idle', lastSeen: now - 60000, clientType: 'agent_harness' },
  ];

  const workspace: ArchonWorkspace = {
    id: 'ws-liquid-tensor',
    name: 'Liquid Tensor Experiment & Condensed Mathematics',
    description: 'Collaborative formalization of Scholze-Clausen condensed mathematics and vanishing of Ext groups',
    rootPath: 'Liquid/',
    toolchain: 'v4.35.0-rc4',
    createdAt: now - 86400000,
    updatedAt: now,
    budget: {
      computeSecondsUsed: 1420,
      computeSecondsLimit: 7200,
      tokensUsed: 42000,
      proofsCompleted: 5,
      totalProofObligations: 7,
      hybridComplexityScore: 78.5,
    },
    nodes: ws1Nodes,
    edges: ws1Edges,
    ledger: ws1Ledger,
    roadmap: [
      { id: 'm1', title: 'Milestone 1: Condensed Category Foundations', description: 'Axioms, profinite topological sites, and basic sheaves', targetNodeIds: ['CondensedSet', 'ProfiniteSpace'], completed: true, order: 1 },
      { id: 'm2', title: 'Milestone 2: Homological Betti Invariants & Cohomology', description: 'Vanishing of Ext 1 on finite free modules with NumPy empirical verification', targetNodeIds: ['Ext_R_finite', 'witness_betti_numbers', 'LiquidTensor_vanishes'], completed: true, order: 2 },
      { id: 'm3', title: 'Milestone 3: Complete Liquid Architecture Challenge', description: 'Exact sequences of condensed modules and Master Challenge Theorem', targetNodeIds: ['Condensed_exact_seq', 'MainTheorem_liquid'], completed: false, order: 3 },
    ],
    collaborators: ws1Presences,
  };

  return { workspace, presences: ws1Presences };
}

export function buildNewWorkspace(params: {
  id: string;
  name: string;
  description: string;
  toolchain?: string;
  nodes?: BlueprintNode[];
  edges?: BlueprintEdge[];
}): ArchonWorkspace {
  const now = Date.now();
  const initPayload = { message: `Workspace ${params.name} initialized` };
  const integrityHash = computeLedgerEntryHash(1, GENESIS_PREV_HASH, now, 'system', 'milestone_reached', undefined, initPayload);

  return {
    id: params.id,
    name: params.name,
    description: params.description,
    rootPath: 'Workspace/',
    toolchain: params.toolchain || 'v4.35.0-rc4',
    createdAt: now,
    updatedAt: now,
    budget: {
      computeSecondsUsed: 0,
      computeSecondsLimit: 3600,
      tokensUsed: 0,
      proofsCompleted: (params.nodes || []).filter((n) => n.status === 'kernel_verified').length,
      totalProofObligations: (params.nodes || []).length,
      hybridComplexityScore: 10,
    },
    nodes: params.nodes || [],
    edges: params.edges || [],
    ledger: [
      {
        seq: 1,
        id: `init-${now}`,
        timestamp: now,
        author: { id: 'system', name: 'Workspace Initializer', role: 'verifier' },
        type: 'milestone_reached',
        nodeId: undefined,
        payload: initPayload,
        prevHash: GENESIS_PREV_HASH,
        integrityHash,
      },
    ],
    roadmap: [],
    collaborators: [],
  };
}

export function buildWorkspaceSummary(ws: ArchonWorkspace, activeCount: number): WorkspaceSummary {
  const verifiedNodes = ws.nodes.filter(
    (n) => n.status === 'kernel_verified' || n.status === 'empirically_validated'
  ).length;
  const claimedNodes = ws.nodes.filter((n) => n.status === 'claimed').length;
  const totalNodes = ws.nodes.length || 1;

  return {
    id: ws.id,
    name: ws.name,
    description: ws.description,
    toolchain: ws.toolchain,
    totalNodes: ws.nodes.length,
    verifiedNodes,
    claimedNodes,
    completionPercent: Math.round((verifiedNodes / totalNodes) * 100),
    activeCollaborators: activeCount,
    updatedAt: ws.updatedAt,
  };
}
