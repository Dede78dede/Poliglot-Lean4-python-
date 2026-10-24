# Error Code Catalog (RFC 9457 Problem Details)

**Polyglot Code Studio — Phase 10.9 Error Taxonomy**  
*Source of Truth: `src/services/errors/error-registry.ts`*

All HTTP endpoints and internal bridges surface errors compliant with [RFC 9457: Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc9457).

---

## Error Catalog

| Error Code | HTTP Status | Category | Retryable | Problem Type URI | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `KERNEL_DISAGREEMENT` | 422 | `kernel` | No | `https://polyglot.dev/errors/kernel-disagreement` | Independent paranoid proof checking kernels produced conflicting verification verdicts. |
| `PASTALEAN_UNSUPPORTED` | 422 | `input` | No | `https://polyglot.dev/errors/pastalean-unsupported` | Python AST contains language constructs unsupported by PastaLean formal translator. |
| `PASTALEAN_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/pastalean-unavailable` | The PastaLean runner container (v4.31.0-rc2) is unreachable on port 8083. |
| `LEANFLOW_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/leanflow-unavailable` | The LeanFlow autoformalization runner container is unreachable on port 8084. |
| `LEANSCREEN_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/leanscreen-unavailable` | The leanscreen semantic fidelity gate is temporarily offline or timed out. |
| `SPAN_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/span-unavailable` | The LaTeX span ledger extraction service encountered an unrecoverable timeout. |
| `LEANCERT_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/leancert-unavailable` | The LeanCert numerical verification container is unreachable on port 8085. |
| `LUNGO_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/lungo-unavailable` | The Lungo multi-target verification code export CLI runner is unreachable. |
| `LUNGO_TOOLCHAIN_MISMATCH` | 422 | `bridge` | No | `https://polyglot.dev/errors/lungo-toolchain-mismatch` | Project toolchain is incompatible with Lungo compiler requirements (v4.34.1 required). |
| `PROJECT_NOT_KERNEL_VERIFIED` | 412 | `policy` | No | `https://polyglot.dev/errors/project-not-kernel-verified` | Project must achieve SEAL_KERNEL_VERIFIED_TIER5 before proceeding with this export. |
| `FORMATTER_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/formatter-unavailable` | Lean code formatter binary is not available or verified in the active environment. |
| `HERON_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/heron-unavailable` | The Heron AST linter runner (fork v4.31.0) is unreachable on port 8086. |
| `LSPEC_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/lspec-unavailable` | The LSpec test execution suite failed to start or process test declarations. |
| `DOCGEN_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/docgen-unavailable` | The doc-gen4 documentation generator failed during lakefile build. |
| `VERSO_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/verso-unavailable` | The Verso Blueprint documentation build service could not be contacted. |
| `SEARCH_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/search-unavailable` | All semantic search providers in the fallback chain are currently unreachable. |
| `LEANBLUEPRINT_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/leanblueprint-unavailable` | The leanblueprint-mcp graph rendering client is temporarily offline. |
| `LEANARCHITECT_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/leanarchitect-unavailable` | The LeanArchitect annotation extractor service is currently unreachable. |
| `CRAMF_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/cramf-unavailable` | The CRAMF retrieval augmentation plugin is unavailable or unconfigured. |
| `ANTHROPIC_KEY_MISSING` | 503 | `policy` | No | `https://polyglot.dev/errors/anthropic-key-missing` | Required Anthropic API key is not configured in the environment. |
| `CONSENT_REQUIRED` | 403 | `consent` | No | `https://polyglot.dev/errors/consent-required` | Explicit user confirmation is required in the UI before initiating operation. |
| `BUDGET_EXHAUSTED` | 429 | `budget` | No | `https://polyglot.dev/errors/budget-exhausted` | The allocated model or API token budget has been fully exhausted. |
| `PROVIDER_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/provider-unavailable` | The requested external or local AI model provider is unreachable. |
| `SANDBOX_POLICY_VIOLATION` | 403 | `policy` | No | `https://polyglot.dev/errors/sandbox-policy-violation` | Operation blocked by security policy: attempted to execute code outside sandbox. |
| `REPO_TOO_LARGE` | 413 | `input` | No | `https://polyglot.dev/errors/repo-too-large` | The repository size exceeds the maximum allowed import limit of 200 MiB. |
| `ARCHIVE_TOO_LARGE` | 413 | `input` | No | `https://polyglot.dev/errors/archive-too-large` | The uncompressed archive content exceeds the allowed quota limit. |
| `ZIP_TOO_LARGE` | 413 | `input` | No | `https://polyglot.dev/errors/zip-too-large` | The uploaded ZIP archive file size exceeds the 50 MiB uncompressed limit. |
| `FEATURE_FLAG_UNKNOWN` | 200 | `policy` | No | `https://polyglot.dev/errors/feature-flag-unknown` | Non-fatal warning: an unrecognized feature flag was detected in env and ignored. |
| `INDEXEDDB_MIGRATION_FAILED` | 500 | `container` | No | `https://polyglot.dev/errors/indexeddb-migration-failed` | Browser IndexedDB schema upgrade failed to execute cleanly. |
| `CORRELATION_ID_MISSING` | 500 | `bridge` | No | `https://polyglot.dev/errors/correlation-id-missing` | Bridge request lacked a valid diagnostic correlation identifier. |
| `PAPERPROOF_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/paperproof-unavailable` | The Paperproof proof-tree visualization service is currently offline or unreachable. |
| `MATHESIS_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/mathesis-unavailable` | The Mathesis NL-to-Lean 4 autoformalization bridge is currently unreachable. |
| `EPISTEMIC_TRANSITION_INVALID` | 400 | `policy` | No | `https://polyglot.dev/errors/epistemic-transition-invalid` | Illegal epistemic transition requested: state progression must satisfy epistemic integrity invariants. |
| `ROUTER_NO_PROVIDER_AVAILABLE` | 503 | `bridge` | Yes | `https://polyglot.dev/errors/router-no-provider-available` | No autoformalization provider in the router fallback chain is available or enabled. |
