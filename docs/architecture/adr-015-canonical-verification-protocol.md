# ADR 015: Canonical Verification Protocol, Hybrid Consensus, and Transitive Axiom Policy

**Status**: APPROVED  
**Date**: 2026-11-05  
**Author**: Lead Python/Lean 4 Engineer & Senior Software Architect  
**Deciders**: Polyglot Code Studio Architecture Council  

---

## 1. Context & Problem Statement

In formal mathematical proof assistant systems, correctness and epistemic truthfulness are existential invariants. Polyglot Code Studio must never falsely certify an unverified statement or synthesize fictitious seals. 

Prior to Phase 14 / Master Plan implementation, three systemic architectural fragilities were identified:
1. **F-01**: `src/App.tsx` simulated Lean 4 execution via `setTimeout(..., 400)` and emitted `verified: true` with a synthetic `SEAL_KERNEL_VERIFIED_TIER5` badge without live execution.
2. **F-02**: `server/src/services/proof/proof-coordinator.ts` emitted synthetic kernel seals (`DUPER_KERNEL_SEAL_...`, `AESOP_KERNEL_SEAL_...`, `PANTOGRAPH_KERNEL_SEAL_...`) based purely on heuristic string checks (`goal.includes`) rather than verifiable Lean kernel output.
3. **F-03**: Dual execution pathways (interactive snippet elaboration vs Lake project execution) lacked an authoritative, reconciled protocol (`polyglot.verification.v1`) and formal consensus rules to arbitrate between engine results.

This Architecture Decision Record (ADR) codifies the specification for the canonical verification protocol `polyglot.verification.v1`, the transitive axiom audit allowlist, and the hybrid consensus adjudication engine.

---

## 2. Canonical Verification Protocol (`polyglot.verification.v1`)

### 2.1 Protocol Request Payload

All verification dispatches submit a standardized, immutable JSON envelope:

```json
{
  "protocolVersion": "polyglot.verification.v1",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "scope": "snippet",
  "targetIds": ["theorem_main"],
  "sourceDigest": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "contextDigest": "sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
  "environment": {
    "leanToolchain": "leanprover/lean4:v4.35.0",
    "kiminaImageDigest": "sha256:d5f2a1b9c8e7...",
    "lakeRunnerImageDigest": "sha256:a1b2c3d4e5f6...",
    "manifestDigest": "sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4"
  },
  "axiomPolicyId": "polyglot.axioms.standard.v1",
  "requireConsensus": true
}
```

### 2.2 Dual Verification Pathways

The architecture decouples lightweight interactive snippet checking from heavyweight, hermetic Lake repository compilation:

1. **Snippet Elaboration Pathway (`/api/v1/lean/execute`)**:
   - Backed by an authenticated Kimina server instance (`KIMINA_SERVER_URL`).
   - Interacts via the pinned `/api/check` endpoint.
   - Parses structured `sorries` and diagnostics with strict snippet `id` correlation matching.
   - For interactive developer feedback in editor buffers with latency < 500ms.

2. **Lake Project Build Pathway (`/api/v1/projects/lean/build`)**:
   - Backed by an isolated, asynchronous `LeanProjectRunner` in a dedicated sandbox container.
   - Executes `lake build` against whole project trees, dependency manifests (`lake-manifest.json`), and custom imports.
   - Captures explicit process exit codes, stdout, stderr, and resource quotas (RAM, CPU, execution timeout).
   - Never defaults missing exit codes to 0.

---

## 3. Transitive Axiom Audit Policy (`polyglot.axioms.standard.v1`)

A theorem in Lean 4 may technically compile without errors if it relies on unproved premises declared as `axiom`. Under `polyglot.axioms.standard.v1`, proof certification inspects all transitively referenced axioms:

### 3.1 Standard Allowlist
Only the core classical foundational axioms of Lean 4 are permitted:
- `propext` (Propositional Extensionality)
- `Classical.choice` (Axiom of Choice)
- `Quot.sound` (Soundness of Quotient Types)

### 3.2 Axiom Policy Adjudication Rules
1. Any theorem transitively referencing `sorryAx` is strictly rejected (`outcome: "rejected"`, `sorriesCount > 0`).
2. Any theorem transitively referencing user-defined or unapproved axioms (e.g., `axiom RiemannHypothesis : ...` or `axiom false_axiom : False`) causes `axiomAudit.status = "failed"` and forbids certification.
3. If axiom extraction is not available or inconclusive, `axiomAudit.status = "not_run"` and consensus verdict cannot exceed `unconfirmed`.

---

## 4. Hybrid Consensus Adjudication Matrix

When hybrid consensus mode is requested (`requireConsensus: true`), the adjudicator compares evidence from both the Kimina snippet checker and the Lake project runner:

### 4.1 Comparability Predicate
Two engine results are comparable if and only if:
1. `sourceDigest` is identical across both evaluations.
2. `contextDigest` is identical (or provably equivalent).
3. `environment.leanToolchain` matches exactly.
4. `targetIds` evaluated are identical.

If any comparability invariant fails, the comparison returns `comparable: false` and the hybrid verdict defaults to `unconfirmed`.

### 4.2 Decision Table

| Kimina Outcome | Lake Outcome | Comparability Check | Transitive Axiom Audit | Hybrid Verdict | UI Display & Badge |
|---|---|---|---|---|---|
| `accepted` | `accepted` | Exact match on source, context, toolchain, and manifest | Passed allowlist (`propext`, `Classical.choice`, `Quot.sound`) | `confirmed_valid` | "Verified — Kimina and Lake agree" + Tier 5 Badge |
| `rejected` | `rejected` | Exact match | Evaluated under same policy | `confirmed_invalid` | "Rejected — Proof obligation failed" (Red border, diagnostics listed) |
| `accepted` | `rejected` | Exact match | Any | `unconfirmed` | "Verdict not confirmed — Engines disagree" (Amber badge, no Tier 5) |
| `rejected` | `accepted` | Exact match | Any | `unconfirmed` | "Verdict not confirmed — Engines disagree" (Amber badge, no Tier 5) |
| `accepted` | `accepted` | Digest, context, toolchain, or target mismatch | Any | `unconfirmed` | "Verdict not confirmed — Context not comparable" |
| Any | `unavailable` / `timeout` | Any | Any | `unconfirmed` | "Verdict not confirmed — Lake runner unavailable or timed out" |
| `unavailable` / `timeout` | Any | Any | Any | `unconfirmed` | "Verdict not confirmed — Kimina server unavailable or timed out" |
| `simulated` | Any | Any | Any | `unconfirmed` | "⚠ SIMULATED — NON-CERTIFYING" (Amber warning, consensus strictly blocked) |

### 4.3 Backward-Compatible Field Derivation
The legacy boolean `verified: boolean` field is strictly derived as:
$$\text{verified} \iff (\text{verdict} == \text{"confirmed\_valid"})$$
No client component, mock harness, or speculative tactic generator may assert `verified: true`.

---

## 5. Epistemic Authority Matrix & Multi-Emitter Classification

Phase 14.9 Pre-Sign-Off audit confirmed six (6) textual references to `SEAL_KERNEL_VERIFIED_TIER5` across the codebase. In Phase 14.9.1 FIX-B, all sites were refactored to enforce that ONLY `HybridConsensusAdjudicator` can certify.

### 5.1 Epistemic Authority Matrix

| File & Line | Operational Role | Epistemic Authority | Description & Enforcement |
|:---|:---:|:---:|:---|
| `server/src/services/verification/hybrid-adjudicator.ts:264` | **CERTIFYING** | **SOLE AUTHORITY** | The only component authorized to mint a verifiable kernel seal badge. Emitted exclusively upon dual-engine consensus (`confirmed_valid`: Kimina and Lake agreement + strict allowlisted axioms). |
| `server/src/services/lungo/lungo-bridge.ts:111` | **TRANSPORTING / METADATA** | NON-CERTIFYING | Attaches `proofCarried: 'SEAL_KERNEL_VERIFIED_TIER5'` to ingested Lungo BIR claim records. Transports proof metadata; does not certify live proof execution. |
| `src/services/mcp/mcp-server.ts:147` | **METADATA** | NON-CERTIFYING | Static capability metadata attribute in `polyglot_get_engine_status` describing server capability tier (`{ kernelVerification: { available: true, seal: 'SEAL_KERNEL_VERIFIED_TIER5' } }`). |
| `server/src/services/mcp/lean-lsp-mcp-client.ts:162` | **TRANSPORTING / PREFLIGHT** | NON-CERTIFYING | Refactored in FIX-B to delegate to `hybridAdjudicator.adjudicate()`. Maps to `ProofOutcome` (`transport`, `preflight`, or `unavailable`). Never independently certifies or emits `verified: true`. |
| `src/services/mcp/lean-lsp-client.ts:193` | **UNAVAILABLE STUB** | NON-CERTIFYING | Refactored in FIX-B to return `{ kind: 'unavailable', reason: 'client_stub' }`. Client stub never simulates verification or asserts truth. |
| `src/services/mcp/mcp-server.ts:418` | **CONDITIONAL TRANSPORT** | NON-CERTIFYING | Refactored in FIX-B to invoke `hybridAdjudicator.adjudicate()`. Sets `kernelSeal: 'SEAL_KERNEL_VERIFIED_TIER5'` only if adjudicator returns `confirmed_valid`; otherwise `null`. Proposal commitment (`committed: true`) is decoupled from proof certification. |

### 5.2 Certification Invariants & Governance Rule
1. **Single Certifying Authority**: Only `HybridConsensusAdjudicator` is legally permitted to certify user theorems as `SEAL_KERNEL_VERIFIED_TIER5`.
2. **Non-Certifying Transports**: All other occurrences are strictly transport wrappers or metadata schemas. They do not constitute an independent verification pathway.
3. **No Simulation Bypass**: Neither client stubs nor heuristic tactic engines may synthesize or emit `SEAL_KERNEL_VERIFIED_TIER5` outside of live execution.
4. **Governance Rule on New Emitters**: Adding a new emitter requires an ADR and a test that asserts the new site does not certify.

---

## 6. Security & Isolation Invariants

1. **Hermetic Execution**: Lake runner builds must execute with no network access (`network_mode: none` in container configurations).
2. **Resource Boundaries**: Strict memory ceiling (max 4GB per Lake process, 1GB per Kimina check) and process timeout (max 30s for snippet, 120s for full Lake build).
3. **No Synthetic Seals**: Generation of synthetic kernel seal tokens (`SEAL_KERNEL_...`) outside of live process verification is forbidden.

