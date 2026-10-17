# Phase 7 Gap Closure & Toolchain Ecosystem Deprecation Report

**Date**: October 15, 2026  
**Auditor**: Senior Verification & Infrastructure Engineer  
**Scope**: Verification and closure of Phase 7 flags (V7-1 to V7-5) for Polyglot Code Studio.

---

## 1. Task V7-1 — WebSocket Port Conflict & Unified Upgrade Resolution

### Problem Diagnosis
In early multi-process configurations, separate WebSocket servers (e.g. port 3000 vs 3001 vs 3002) produced race conditions, CORS/proxy boundary complications in Cloud Run, and collisions with Vite development servers.

### Architectural Resolution
We standardized on a **Unified HTTP Upgrade** architecture:
- In both development and production, the WebSocket Server (`BlueprintRelay` in `server/src/services/collaboration/blueprint-relay.ts`) attaches directly to the unified Node.js `http.Server` via:
  ```typescript
  const server = http.createServer(app);
  new BlueprintRelay(server, workspaceStore);
  ```
- **Endpoint**: `/ws/collaboration`
- **Port**: Port 3000 in dev (proxied seamlessly by AI Studio ingress), and `process.env.PORT` (8080) in production Cloud Run.
- **Topology in `docker-compose.yml`**:
  ```yaml
  services:
    studio:
      ports:
        - "3000:3000"
      environment:
        - WS_PORT=3000
  ```
- **Client Binding in `src/services/collaboration/blueprint-workspace-client.ts`**:
  ```typescript
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/collaboration`;
  ```
- **Verification**: Verified via HTTP upgrade handshake unit test (Subtest 24.1). Zero port collisions.

---

## 2. Task V7-2 — Configurable Claim TTL

### Specification
- Environmental parameter: `CLAIM_TTL_MS` (Default: `1800000` = 30 minutes).
- `WorkspaceStore` exposes `getClaimTtlMs()`, `setClaimTtlMs(ms: number)`, and `reconcileExpiredClaims(workspaceId?, currentTime?)`.
- **Validation**:
  - In `scripts/verify-all.ts` (Subtest 24.2), time is mocked using simulated timestamps.
  - A claim made at `t = now` with TTL = 1,000ms expires when evaluated at `t = now + 1500ms`.
  - The node automatically reverts from `'claimed'` to `'unproven'`, with its lease released and logged to the ledger.

---

## 3. Task V7-3 — Post-Crash Active Claim Reconciliation

### Specification
- On server startup or recovery after an unexpected process termination, in-flight leases must not remain orphaned in `'claimed'` state.
- `WorkspaceStore.reconcilePostCrashState()` runs on store instantiation:
  ```typescript
  public reconcilePostCrashState(): { releasedClaimsCount: number; releasedNodeIds: string[] }
  ```
- It inspects all nodes across all registered Archon workspaces. Any node with `status === 'claimed'` that lacks a finalized `kernelCertificate` is immediately freed:
  - `status` reset to `'unproven'`
  - `claim` payload cleared
- **Validation**:
  - In `scripts/verify-all.ts` (Subtest 24.3), a crashed workspace containing active claims is fed to `reconcilePostCrashState()`. 100% of unverified claims are freed; existing kernel-verified nodes remain untouched.

---

## 4. Task V7-4 — Cryptographic Ledger Hash Chain Integrity

### Specification
- Every ledger event incorporates:
  - `seq`: Strictly monotonic sequence number ($seq_{i} = seq_{i-1} + 1$).
  - `prevHash`: SHA-256 integrity hash of the preceding entry ($entry_{0}.prevHash = 0^{64}$).
  - `integrityHash`: $H(seq \parallel prevHash \parallel timestamp \parallel author \parallel type \parallel nodeId \parallel payload)$.
- `WorkspaceStore.verifyLedgerChain(workspaceId)` traverses the chain from genesis to tail:
  - Validates genesis $prevHash$.
  - Validates sequence monotonicity.
  - Verifies $prevHash = prev.integrityHash$.
  - Recomputes SHA-256 and asserts exact equality with $integrityHash$.
- **Validation**:
  - In `scripts/verify-all.ts` (Subtest 24.4), an untampered ledger returns `{ valid: true }`.
  - An entry is mutated (tampering with payload), and `verifyLedgerChain` instantly halts with `{ valid: false, brokenSeq: k, error: 'INTEGRITY_HASH_MISMATCH' }`.

---

## 5. Task V7-5 — Toolchain Ecosystem Deprecation Review

We audited all components integrated in Phase 5.5 and verified their active upstream status as of October 15, 2026:

| Tool / Dependency | Integrated Version | Upstream Status (Oct 2026) | Compatibility with Pinned Toolchains | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| **Leanstral** | 1.5 (MoE 7B) | Active, Stable | Compatible with v4.28.0 - v4.35.0-rc4 | Maintained as Tier 3 primary local proof repair |
| **gAPRIL** | v0.4.1 | Active, Stable | Mathlib v4.33.1, v4.35.0-rc4 | Maintained as VRAM fallback #1 |
| **AXLE Cloud** | API v1 | Active, Production | Toolchain agnostic (abstract syntax tree) | Maintained with mandatory User Consent Gate (L4 & Phase 8) |
| **Veriphy** | 2026-10-12 (PyPI) | Active, Production | Lean 4.x standard axioms (ring/linarith) | **Extended in Phase 8** with polynomial factoring & coefficients |
| **LeanProbe** | 2026.04 | Active, Stable | Compatible with all Lean 4 server protocols | Maintained for L2 compiler diagnostic feedback |
| **Ruff** | 0.9.x | Active, De facto standard | Python 3.10 - 3.14 WASM | Maintained as Tier 1 deterministic fixer |

**Conclusion**: No components are deprecated. All integrations remain current, secure, and compatible with the pinned Lean toolchain baseline (`v4.35.0-rc4`).
