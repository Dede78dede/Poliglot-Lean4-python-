# Fallback Contracts & Circuit Breaker Architecture (F7)

**Document ID**: PCS-ARCH-F7-FALLBACK-CONTRACTS  
**Version**: 1.0.0  
**Status**: APPROVED & CODIFIED  
**Authority**: ADR 015 & Polyglot Verification Architecture  

---

## 1. Scope & Motivation

Polyglot Code Studio interfaces with multiple computational and formal verification engines:
- **Interactive Lean Snippet Solver**: Upstream Kimina adapter (`/api/check`)
- **Hermetic Lean Lake Runner**: Subprocess containerized lake build (`LeanProjectRunner`)
- **In-Browser Python Kernel**: Pyodide WebAssembly runtime (`notebook.worker.ts`)
- **Auxiliary Bridges**: LeanCert, Axle, ProvePy, PastaLean, NumPySpec

In distributed and high-load environments, external services or sandboxed runtimes may experience timeouts, process crashes, memory limits, or transient network partitions.

### The Antipattern: "Silent Mock Pass"
A critical architectural antipattern in verification systems is falling back to synthetic `verified: true` or mocked positive proofs when an engine is unreachable. 

### The Core Invariant
> **Epistemic Invariant**: When an engine enters a fallback or degraded state, it MUST NEVER emit `badge: 'SEAL_KERNEL_VERIFIED_TIER5'` or a certifying `verified: true`. Degraded operations MUST return an explicit `ProofOutcome` (`preflight`, `unavailable`, or `transport`) and map to RFC 9457 `SerializedBridgeError` contracts.

---

## 2. Four-Tier Degradation Hierarchy

The verification system enforces four strictly ordered operational tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tier 1: FULL_DUAL (Normal Operation)                                       │
│ Dual-engine consensus (Kimina + Lake). Foundational axioms allowlisted.    │
│ Emits: `ProofOutcome` { kind: 'certified', badge: SEAL_KERNEL_VERIFIED }   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Failover / Degrade
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tier 2: SINGLE_ENGINE_DEGRADED                                              │
│ One engine timed out or unreachable; other engine succeeded.               │
│ Emits: `ProofOutcome` { kind: 'preflight', unconfirmed: true }              │
│ Status: UNCONFIRMED (Zero Kernel Seal)                                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Failover / Degrade
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tier 3: SYNTAX_PREFLIGHT                                                    │
│ AST parsing and syntax checking only. No formal verification executed.     │
│ Emits: `ProofOutcome` { kind: 'preflight', syntaxValid: true }              │
│ Status: UNCONFIRMED (Zero Kernel Seal)                                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Failover / Degrade
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tier 4: UNAVAILABLE                                                         │
│ Circuit breaker OPEN. All solvers unreachable or timeout threshold breached.│
│ Emits: `ProofOutcome` { kind: 'unavailable', reason: string }               │
│ RFC 9457 Error Code: ENGINE_UNAVAILABLE / TIMEOUT_CIRCUIT_OPEN              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Circuit Breaker Thresholds & Recovery

Each solver bridge implements a stateful circuit breaker with 3 states: `CLOSED` (healthy), `OPEN` (degraded/tripped), and `HALF_OPEN` (probing):

| Engine / Bridge | Failure Threshold | Probe Window | Timeout Ceiling | Fallback Tier |
|:---|:---:|:---:|:---:|:---|
| **Kimina Proxy** | 3 consecutive 5xx/timeouts | 30 seconds | 8,000 ms | Tier 2 (Lake only) or Tier 3 |
| **Lake Subprocess** | 2 consecutive non-zero crash exits | 45 seconds | 15,000 ms | Tier 2 (Kimina only) or Tier 3 |
| **Pyodide Worker** | 1 OOM or Worker crash | Immediate restart | 10,000 ms | Tier 4 (Worker recycle) |
| **Auxiliary Bridges** | 3 consecutive failures | 20 seconds | 5,000 ms | Tier 3 (AST syntax only) |

---

## 4. RFC 9457 Degradation Envelopes

When a fallback occurs, all JSON API routes return standardized error envelopes conforming to RFC 9457:

```json
{
  "type": "https://polyglot.dev/errors/fallback-degraded",
  "title": "Verification Degraded to Preflight",
  "status": 503,
  "detail": "Downstream Lean 4 verification engine unreachable. Degraded to syntax preflight.",
  "instance": "/api/v1/lean/verify/req-789a-bc",
  "code": "FALLBACK_DEGRADED",
  "tier": "SYNTAX_PREFLIGHT",
  "outcome": {
    "kind": "preflight",
    "verified": false,
    "kernelSeal": null,
    "diagnostics": [
      {
        "severity": "warning",
        "message": "Formal proof uncertified: solver in fallback mode"
      }
    ]
  }
}
```

---

## 5. Security & Invariant Audit Rules

1. **Zero Mock Pass Rule**: Any fallback code path that sets `badge = 'SEAL_KERNEL_VERIFIED_TIER5'` or `verified = true` without dual-engine consensus fails CI gate Suite 171 and Suite 172.
2. **Explicit User Notification**: When in degraded state, client UI must display warning badges (`UNCONFIRMED_FALLBACK`) in `StatusBar` and diagnostic logs.
3. **Audit Trail**: Every circuit trip and fallback execution is logged to the security event logger (`securityEventLogger`) with correlation ID and reason.
