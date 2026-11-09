# Epistemic Authority Invariant & Single Certifier Architecture

**Status**: ACTIVE & CI-ENFORCED  
**Date**: 2026-11-08  
**Codified In**: ADR-015, Suite 171, Suite 184, `scripts/check-epistemic-authority.ts`  

---

## 1. The Epistemic Invariant

Polyglot Code Studio operates on a foundational epistemological principle:
> **No mathematical claim or translated snippet can be certified as verified without strict execution through the formal proof kernel via the canonical adjudicator.**

### Single Certifying Authority
- **The Sole Certifying Authority**: `server/src/services/verification/hybrid-adjudicator.ts:264`.
- **Authorized Certifying Seal**: `SEAL_KERNEL_VERIFIED_TIER5`.
- **Certifying Payload**: An adjudication outcome where `verdict === 'confirmed_valid'`, with matching source, context, and toolchain digests.

---

## 2. Structural & Architectural Isolation

To guarantee that no other module can synthesize truth or mint false seals:

1. **Secondary Bridges Restricted to `ProofOutcome`**:
   - `server/src/services/autocorrect/axle-repair.ts`
   - `server/src/services/leancert/leancert-bridge.ts`
   - `server/src/services/provepy/provepy-bridge.ts`
   - `server/src/services/pastalean/pastalean-bridge.ts`
   - `server/src/services/mcp/lean-lsp-mcp-client.ts`
   - `src/services/mcp/lean-lsp-client.ts`
   All of these modules return discriminated `ProofOutcome` (`preflight`, `transport`, `unavailable`, `metadata`) and are strictly forbidden from emitting `verified: true` or referencing `SEAL_KERNEL_VERIFIED_TIER5`.

2. **Automated Static Verification (`npm run arch:check-epistemic-authority`)**:
   - Scans all TypeScript files in `server/src/` and `src/`.
   - Fails with exit code 1 if any file other than `hybrid-adjudicator.ts` contains both `verified: true` and `SEAL_KERNEL_VERIFIED_TIER5`.
   - Fails if any secondary bridge contains `verified: true` or `SEAL_KERNEL_VERIFIED_TIER5`.
   - Enforced automatically in `.github/workflows/ci.yml`.

3. **Client Consumer Binding**:
   - `src/services/mcp/mcp-server.ts:418` receives the verification request and delegates exclusively to `hybridAdjudicator.adjudicate()`. It mints `kernelSeal` if and only if `adj.verdict === 'confirmed_valid'`.
