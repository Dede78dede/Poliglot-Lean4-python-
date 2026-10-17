# Phase 7: Collaborative Proof Engineering & Blueprint Workspaces

**Polyglot Code Studio — Architectural Specification & User Guide**  
**Target Users**: Mathematicians, Formal Verification Engineers, Scientific Python Developers  
**Distribution Model**: Self-Hosted, Offline-First, Zero Unconsented Telemetry  

---

## 1. Executive Summary

Phase 7 delivers a workspace-first collaborative proof engineering environment inspired by **Archon Horizon** (frenzymath/Archon-Horizon), **leanblueprint-mcp**, and **Lean Atlas**. While traditional software engineering collaboration relies on raw character streams or Git line diffs, interactive theorem proving in deep hierarchies (such as Mathlib 4) requires a fundamentally different paradigm.

Character-level CRDTs (like ReasLab or Google Docs) fail in interactive proof engineering because intermediate broken keystrokes invalidate type dependencies, crash language servers, and cause devastating compiler cache thrashing. Polyglot Code Studio resolves this through:

1. **Declaration-Level Blueprint DAG**: Mathematical declarations (`theorem`, `lemma`, `definition`, `axiom`, `python_witness`) form an explicit Directed Acyclic Graph with typed dependency edges.
2. **Atomic Proof Claiming**: Mathematicians and AI agents claim open proof obligations atomically with TTL guards, preventing redundant work.
3. **5-Term Formal Kernel Seal**: Completed proofs are certified by the Lean 4 kernel, hashed via SHA-256, sealed into Tier 5 Content-Addressed Storage, and broadcast to all peers without re-compilation.
4. **Hybrid Lean-Python Verification**: Empirical Python test witnesses validate conjectures on hardware before formal inductive proof, connected via `witness_dependency` edges.
5. **Real-Time WebSocket Relay**: Built directly into the self-hosted Express server on port 3000 with zero external cloud dependencies.

---

## 2. Mathematical Blueprint DAG Architecture

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    Mathematical Blueprint DAG                          │
 │                                                                        │
 │   [ProfiniteSpace] (Def) ───────┐                                      │
 │          │ (type_dep)           │ (type_dep)                           │
 │          ▼                      ▼                                      │
 │   [CondensedSet] (Def) ──► [Ext_R_finite] (Lemma: Verified)            │
 │          │                      ▲                                      │
 │          │ (type_dep)           │ (witness_dep)                        │
 │          ▼               [witness_betti] (Python Empirical)            │
 │   [Condensed_exact_seq]         │                                      │
 │      (Claimed: Scholze)         │ (theorem_dep)                        │
 │          │                      ▼                                      │
 │          │ (theorem_dep)  [LiquidTensor_vanishes] (Theorem: Verified)  │
 │          │                      │                                      │
 │          └───────────┬──────────┘                                      │
 │                      ▼                                                 │
 │             [MainTheorem_liquid]                                       │
 │           (Unproven: Open Obligation)                                  │
 └────────────────────────────────────────────────────────────────────────┘
```

### The Six-Role Edge Schema
Dependencies in the blueprint are strictly categorized according to elaboration semantics:

| Edge Role | Description | Invalidation Behavior |
|---|---|---|
| `type_dependency` | Target type signature references source declaration. | Modifying source requires re-checking target signature. |
| `value_dependency` | Target proof body or implementation invokes source. | Modifying source only requires re-checking target proof. |
| `theorem_dependency` | Target theorem applies source lemma in a tactic step. | If source lemma statement is unchanged, target proof remains valid. |
| `witness_dependency` | Python empirical test harness asserts invariant of Lean theorem. | Cross-runtime validation linking Pyodide test to Lean obligation. |
| `specializes` | Target is an instance or corollary specialization of source. | Inherits structural properties from general theorem. |
| `refines` | Concrete implementation refines higher-level specification. | Formal refinement relationship. |

---

## 3. Real-Time Collaboration & Relay Protocol

Following the system guidelines, collaboration runs on native WebSockets attached to the Node.js HTTP server at `/ws/collaboration` on port 3000:

### Event Specification

| Message Type | Direction | Payload | Semantics |
|---|---|---|---|
| `join_workspace` | Client → Server | `{ workspaceId, userId, userName, userColor, sinceSeq }` | Enters workspace room; server responds with full snapshot or delta ledger. |
| `workspace_snapshot` | Server → Client | `{ workspace, presences, deltaLedger }` | Authoritative state synchronization on initial connect or reconnect. |
| `cursor_move` | Client → Server | `{ activeNodeId }` | Broadcasts collaborator focus to peers (throttled). |
| `claim_node` | Client → Server | `{ nodeId, agentType, notes }` | Atomically claims unproven declaration obligation. |
| `node_claimed` | Server → Room | `{ node, claim }` | Broadcasts claim state to all collaborators. |
| `release_node` | Client → Server | `{ nodeId }` | Releases claim back to open status. |
| `verify_node` | Client → Server | `{ nodeId, proofCode }` | Submits proof for Lean 4 kernel check and Tier 5 seal. |
| `node_verified` | Server → Room | `{ node, certificate }` | Broadcasts kernel certification and SHA-256 seal. |
| `chat_message` | Client → Room | `{ text, nodeId }` | Real-time discussion thread attached to specific theorem. |

### Concurrency & Conflict Prevention
1. **Atomic Locks**: Only one collaborator (human or AI) may claim a declaration node at a time.
2. **Claim TTL**: Claims expire after 30 minutes of inactivity to prevent abandoned locks.
3. **Immutability of Verified Nodes**: Once a node passes the 5-term verification formula and receives a Tier 5 kernel seal, it is permanently locked against non-consented edits.

---

## 4. Five-Term Formal Kernel Verification Seal

Every proof submitted to the workspace ledger must pass the 5-term verification formula:

$$\text{Verified} = T_{\text{code}} \land T_{\text{sorry}} \land T_{\text{syntax}} \land T_{\text{toolchain}} \land T_{\text{goals}}$$

1. **$T_{\text{code}}$ (Non-empty code)**: Proof buffer cannot be empty or whitespace only.
2. **$T_{\text{sorry}}$ (Zero sorry ban)**: Explicit check rejecting `sorry`, `admit`, or synthetic hole macros.
3. **$T_{\text{syntax}}$ (Formal obligation)**: Declaration contains valid mathematical header (`theorem`, `lemma`, `example`).
4. **$T_{\text{toolchain}}$ (Toolchain alignment)**: Environment matches workspace toolchain (e.g., `v4.35.0-rc4`).
5. **$T_{\text{goals}}$ (Strict closed goals)**: Prover kernel reports 0 open goals and clean elaboration.

Upon verification:
- A `KernelVerificationCertificate` is generated containing execution time, toolchain version, and cryptographic seal.
- The declaration is stored in Tier 5 Content-Addressed Storage under `sha256-<hash>`.
- A monotonic ledger entry is recorded and broadcast to all peers.

---

## 5. Archon Shared Ledger & Roadmap

The workspace ledger operates as a strictly monotonic, append-only event stream:
- Every entry has a sequential integer `seq: 1, 2, 3, ...`
- Every entry contains an integrity hash computed as `SHA-256(seq:type:id:timestamp)`.
- When reconnecting after an offline session, the client sends `sinceSeq` to receive an exact delta stream (3-way semantic reconciliation).
- High-level milestones track target node groups (e.g., "M1: Foundations", "M2: Vanishing Theorem", "M3: Challenge Problem").

---

## 6. Verification & Test Coverage

Phase 7 is validated across automated test suites:
- **Test Suite 23 in `scripts/verify-all.ts`**:
  - `23.1` Blueprint DAG Extraction (Lean 4 AST & Python Test Witnesses).
  - `23.2` Six-Role Edge Schema & Topological Layering.
  - `23.3` Atomic Node Claiming & Race Condition Protection.
  - `23.4` Kernel Seal & Content-Addressed Storage Integration.
  - `23.5` Shared Ledger Monotonic Sequencing & Roadmap Accounting.
  - `23.6` Multi-User WebSocket Relay Protocol & Room Multiplexing.
  - `23.7` Semantic 3-Way Reconciliation on Reconnect.
  - `23.8` Hybrid Verification (Python Empirical Witness + Lean Formal Theorem).
- **E2E Playwright Suite**: `tests/e2e/blueprint-workspaces.spec.ts`.
