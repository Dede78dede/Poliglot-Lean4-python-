# Phase 6 Collaboration Architecture Assessment: Mathematical & Polyglot Workspaces

**Polyglot Code Studio — Architectural Assessment Report**  
**Target Audience**: Mathematicians, Formal Verification Engineers, Scientific Python Developers  
**Core Distribution Model**: Self-Hosted, Offline-First, Zero Unconsented Telemetry  

---

## 1. Executive Summary

As Polyglot Code Studio moves beyond single-user formal and empirical proof engineering, Phase 6 must establish a multi-user collaborative framework. Traditional collaborative development paradigms in software engineering (e.g., standard Git branching or Google Docs-style character-level operational transformation) break down in proof engineering due to:
1. **Compilation Latency**: Lean 4 elaboration of deep mathematical hierarchies (e.g. Mathlib 4) requires seconds to minutes; per-character compiler re-runs freeze user interfaces and saturate server compute.
2. **Mathematical Invariant Preservation**: Partial, broken intermediate keystrokes destroy the type-correctness of surrounding theorems and dependent proofs across the project.
3. **Hardware Constraints in Self-Hosting**: Spinning up heavy isolated Linux VMs or VS Code server instances for each concurrent user scales poorly on self-hosted departmental servers.

This report evaluates three architectural models:
1. **Model A: `lean-workbench`** (Sandboxed Code Server per user)
2. **Model B: `ReasLab IDE`** (Browser-based real-time CRDT/OT co-editing)
3. **Model C: `Archon Horizon`** (Workspace Blueprints, Shared Ledger DAGs, and Kernel-Checked Artifacts)

---

## 2. Deep Comparative Matrix

| Evaluation Dimension | Model A: `lean-workbench` (Code-Server per User) | Model B: `ReasLab IDE` (Browser CRDT/OT Realtime) | Model C: `Archon Horizon` (Blueprint DAG + Shared Ledger) |
|---|---|---|---|
| **Resource Footprint** | **Extremely Heavy**: 1 Linux container/pod per user (~4–8 GB RAM, separate Mathlib build cache). Fails on self-hosted departmental hardware. | **Medium**: Single shared backend node; memory scales with open WebSockets and client ASTs. | **Ultra-Lightweight**: Stateless clients sharing a content-addressed ledger (~500 MB base RAM). Mathlib build cache shared read-only (:ro). |
| **Elaboration & Cache Invalidation** | **Isolated**: Redundant compilation across users; user A's completed lemma cannot be imported by user B until committed and rebuilt. | **Thrashing**: Keystroke-by-keystroke synchronization triggers constant compiler re-elaboration, causing CPU saturation and visual error jitter. | **Deterministic & Granular**: Elaboration occurs at declaration/node granularity. Verified nodes are frozen as content-addressed artifacts in Tier 5 storage. |
| **Mathematical Soundness & Invariants** | **Branch-Oriented**: Soundness checked only on pull request / commit. High merge conflict rate on tactic scripts. | **Fragile**: Collaborative edits in theorem headers break downstream proofs in real-time for all active collaborators. | **Rigorous Proof DAG**: Dependencies tracked via theorem dependency DAG. Unproven steps are explicitly isolated as typed obligations (`sorry` or subgoals). |
| **Collaboration Metaphor** | Siloed development + Git pull requests. | Collaborative text pad (Google Docs / Figma for code). | **Mathematical Blueprint**: Directed Acyclic Graph of definitions, lemmas, theorems, and empirical Python certificates. |
| **Offline-First & Resilience** | Poor: Disconnect drops active web session; requires continuous SSH/tunnel connectivity. | Complex: CRDT merges text, but semantically incompatible Lean tactics create invalid mathematical terms on reconnect. | **Native**: Client maintains local OPFS buffer; ledger updates are cryptographically signed delta DAGs with 3-way semantic reconciliation. |
| **Hardware Fit (Self-Hosted)** | Requires Kubernetes cluster or beefy multi-core server with 64+ GB RAM. | Single VPS with Node.js/WebSocket cluster. | **Single workstation or small server** (runs comfortably in Docker with 8–16 GB RAM). |

---

## 3. Analysis of Competing Paradigms

### Model A: `lean-workbench` (Containerized Code-Server per User)
* **Mechanics**: Each collaborator gets an isolated container running `code-server` or an SSH environment with Lake, elan, and Lean.
* **Why it fails Polyglot Code Studio's goals**:
  - Pushing Mathlib 4 (~20 GB uncompressed build artifacts) to each user container exhausts disk space rapidly.
  - Multi-user collaboration reduces to traditional Git push/pull, with high friction for collaborative proof sprints or educational classrooms.
  - Does not solve collaborative interactive proof state sharing.

### Model B: `ReasLab IDE` (Character-Level CRDT/OT Co-Editing)
* **Mechanics**: Yjs / Automerge synchronizing Monaco Editor text buffers in real time over WebSockets.
* **Why it fails in Formal Verification**:
  - Text-level convergence does NOT equal mathematical convergence.
  - If Alice edits `def Ring (R : Type)` while Bob is writing a proof using `Ring.add_comm`, Bob's language server immediately crashes or flashes red type-mismatch errors on every key Alice presses.
  - Compiler REPLs (like Pantograph or LeanProbe) cannot handle high-frequency character streaming without debouncing that destroys real-time responsiveness.

### Model C: `Archon Horizon` (Workspace Blueprints & Shared Ledger DAGs)
* **Mechanics**:
  1. The project is modeled as a **Mathematical Blueprint DAG** (definitions, theorems, lemmas, empirical test benches).
  2. Each node in the DAG represents an atomic mathematical declaration with an explicit verification state:
     - `UNPROVEN` (contains `sorry` or open goal)
     - `IN_PROGRESS` (claimed by a collaborator or agent)
     - `KERNEL_VERIFIED` (certified by Lean 4 kernel, immutable content hash)
     - `EMPIRICALLY_VALIDATED` (certified by Python Pyodide/NumPy test witness)
  3. Edits occur inside declaration boundaries without invalidating upstream or parallel branches.
  4. Once a theorem passes the 5-term verification formula, its compiled `.olean` artifact is sealed into Tier 5 content-addressed storage and instantly available to all peers.

---

## 4. Phased Implementation Roadmap for Phase 6

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                    Phase 6 Implementation Phases (Roadmap)                        │
│                                                                                   │
│  Phase 6.1: Blueprint DAG Engine & Task Ledger (Sprint 6.1)                       │
│  ├── Declaration-granularity dependency parser (Lean & Python AST)               │
│  ├── Local CRDT Ledger for task assignments, claim states, and proof obligations │
│  └── Blueprint Graph Viewer (interactive DAG showing verified vs open lemmas)    │
│                                                                                   │
│  Phase 6.2: Shared Artifact Cache & Kernel Seal (Sprint 6.2)                      │
│  ├── Tier 5 Content-Addressed `.olean` artifact registry                          │
│  ├── Multi-user read-only Mathlib volume sharing (`/root/.cache/mathlib`)         │
│  └── Instant import of peer-verified lemmas without local re-compilation          │
│                                                                                   │
│  Phase 6.3: Peer-to-Peer & Relay Synchronization (Sprint 6.3)                     │
│  ├── Local-first WebRTC / WebSocket relay synchronization                         │
│  ├── Web Crypto signatures on verified mathematical artifacts                    │
│  └── Conflict-free semantic ledger merge with zero telemetry phone-home          │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Sprint 6.1: Blueprint DAG Engine & Task Ledger
1. **Declaration Extraction**: Parse `.lean` and `.py` files into isolated declaration nodes with clear input/output types and proof bounds.
2. **Ledger Schema**: Define the shared task ledger:
   ```typescript
   interface BlueprintNode {
     readonly id: string; // e.g. "Nat.Prime.infinite"
     readonly type: 'definition' | 'theorem' | 'lemma' | 'python_witness';
     readonly dependencies: readonly string[];
     readonly status: 'unproven' | 'claimed' | 'kernel_verified';
     readonly claimedBy?: string;
     readonly contentHash: string;
     readonly verificationProof?: string;
   }
   ```
3. **Interactive Workspace Blueprint UI**: Visual node graph rendering real-time progress of complex multi-author proof projects (e.g. Fermat-like collaborative projects or polynomial factoring suites).

### Sprint 6.2: Shared Artifact Cache & Kernel Seal
1. **Seal on Verification**: When a user proves a lemma, the Lean 4 kernel verifies it via the 5-term formula. The verified declaration and its elaborated proof term are hashed with SHA-256 and committed to the workspace ledger.
2. **Zero-Rebuild Dependency Ingestion**: Collaborator clients instantly link the pre-compiled lemma into their environment without triggering Lake recompilation.

### Sprint 6.3: Decentralized Sync & Privacy Preservation
1. **Offline Ledger Accumulation**: Contributors can work completely offline in remote trains or flights; changes are accumulated in the local OPFS ledger.
2. **Semantic 3-Way Reconciliation**: When reconnecting to the departmental relay, the ledger merges nodes based on mathematical proof state rather than raw line diffs.
3. **Zero Phone-Home Compliance**: All collaborative relays run directly on the self-hosted instance with zero external cloud dependencies.

---

## 5. Architectural Recommendation

**Decision**: Adopt **Model C (`Archon Horizon` Blueprint DAG & Shared Ledger)** as the authoritative architecture for Phase 6.

**Rationale**:
- Fits the mental model of mathematicians and scientific developers who structure proofs as dependency trees (the standard established by the Liquid Tensor Experiment and Sphere Eversion Project).
- Scales efficiently on self-hosted single-node hardware.
- Eliminates the devastating compilation thrashing inherent in character-level CRDTs like ReasLab.
- Preserves absolute offline-first autonomy and cryptographic content-addressing across all 5 tiers of the memory architecture.
