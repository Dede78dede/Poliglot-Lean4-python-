# Tooling Security & Threat Model

## Threat Vectors & Countermeasures

### 1. Production Leakage (Supply-Chain Risk)
- **Threat**: Developer search scripts or indexing dependencies accidentally get bundled into the client runtime (`dist/`) or imported into the verification kernel / adjudicator.
- **Countermeasure**: Enforced dependency boundary in `.dependency-cruiser.cjs` failing on any `src` or `server/src` dependency targeting `tools`. Automated verification runs on `npm run arch:check` in CI.

### 2. Secret Ingestion & Information Disclosure
- **Threat**: Code indexers or search utilities index `data/tokens.json`, API secrets, or private keys into `.codeindex/` or context packs, which might be committed or transmitted.
- **Countermeasure**:
  - `data/tokens.json` is strictly gitignored; only `data/tokens.template.json` with synthetic values is tracked in version control.
  - Context packs and index outputs (`.codeindex/`, `.ogrep/`, `reports/context/`) are gitignored.
  - Universal redaction middleware masks authorization tokens and credentials.

### 3. Epistemic Contamination
- **Threat**: Developer tools injecting fake proofs, certificates, or claims into the verification adjudicator.
- **Countermeasure**: Epistemic authority is strictly restricted to `server/src/services/verification/hybrid-adjudicator.ts:264`. No developer script or runner can forge `SEAL_KERNEL_VERIFIED_TIER5`.
