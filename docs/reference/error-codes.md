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
| `UNIFIED_SEARCH_PARTIAL_FAILURE` | 503 | `container` | Yes | `https://polyglot.dev/errors/unified-search-partial-failure` | All search providers are unavailable. |
| `BLUEPRINT_STUB_GENERATION_FAILED` | 500 | `bridge` | No | `https://polyglot.dev/errors/blueprint-stub-generation-failed` | Failed to generate Lean stubs from the blueprint. |
| `LSPEC_CI_TEMPLATE_FAILED` | 422 | `input` | No | `https://polyglot.dev/errors/lspec-ci-template-failed` | Failed to generate LSpec CI template. Check the project structure. |
| `GATEWAY_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/gateway-unavailable` | The MCP gateway is offline or unreachable. |
| `PROPOSAL_TOKEN_REQUIRED` | 400 | `policy` | No | `https://polyglot.dev/errors/proposal-token-required` | Tool invocation requires a valid proposalToken confirmation. |
| `SKILL_NAME_TOO_LONG` | 422 | `input` | No | `https://polyglot.dev/errors/skill-name-too-long` | Skill name exceeds maximum length of 64 characters. |
| `SKILL_DESCRIPTION_TOO_LONG` | 422 | `input` | No | `https://polyglot.dev/errors/skill-description-too-long` | Skill description exceeds maximum length of 1024 characters. |
| `SKILL_BODY_TOO_LONG` | 422 | `input` | No | `https://polyglot.dev/errors/skill-body-too-long` | Skill body exceeds maximum length of 500 lines. |
| `MINIMAX_THINKING_DISABLED_REJECTED` | 422 | `policy` | No | `https://polyglot.dev/errors/minimax-thinking-disabled-rejected` | MiniMax provider requires interleaved thinking mode; thinking cannot be disabled. |
| `FILE_MANAGER_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/file-manager-unavailable` | File manager is unavailable. |
| `ARCHIVE_OPERATION_FAILED` | 500 | `input` | No | `https://polyglot.dev/errors/archive-operation-failed` | Archive operation failed; see details. |
| `TRASH_OPERATION_FAILED` | 500 | `input` | No | `https://polyglot.dev/errors/trash-operation-failed` | Trash operation failed; see details. |
| `CHAT_PROVIDER_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/chat-provider-unavailable` | The requested AI chat provider is unavailable or unreachable. |
| `SETTINGS_VALIDATION_FAILED` | 400 | `input` | No | `https://polyglot.dev/errors/settings-validation-failed` | Settings validation failed against schema. |
| `AUTONOMOUS_GUARDRAIL_EXCEEDED` | 429 | `policy` | No | `https://polyglot.dev/errors/autonomous-guardrail-exceeded` | Autonomous mode exceeded maximum tool call or file edit guardrails. |
| `SCAFFOLD_TEMPLATE_NOT_FOUND` | 404 | `input` | No | `https://polyglot.dev/errors/scaffold-template-not-found` | The requested project scaffolding template was not found. |
| `LEAN_BEAM_UNAVAILABLE` | 503 | `container` | Yes | `https://polyglot.dev/errors/lean-beam-unavailable` | The lean-beam MCP broker is unavailable or failed to respond. |
| `LEAN_BEAM_TOOLCHAIN_UNSUPPORTED` | 422 | `bridge` | No | `https://polyglot.dev/errors/lean-beam-toolchain-unsupported` | The project Lean toolchain is not qualified for lean-beam speculative execution. |
| `WORKSPACE_ARCHIVE_INVALID` | 400 | `input` | No | `https://polyglot.dev/errors/workspace-archive-invalid` | The provided .polyglot workspace archive is malformed or corrupted. |
| `WORKSPACE_ARCHIVE_CHECKSUM_MISMATCH` | 422 | `bridge` | No | `https://polyglot.dev/errors/workspace-archive-checksum-mismatch` | One or more files in the workspace archive failed SHA-256 integrity verification. |
| `WORKSPACE_RESTORE_CONFLICT` | 409 | `policy` | No | `https://polyglot.dev/errors/workspace-restore-conflict` | Workspace restore encountered conflicting paths and conflictPolicy is set to fail. |
| `WORKSPACE_ARCHIVE_SCHEMA_TOO_NEW` | 422 | `input` | No | `https://polyglot.dev/errors/workspace-archive-schema-too-new` | The archive schemaVersion is newer than this version of Polyglot Code Studio supports. |
| `OTEL_EXPORT_FAILED` | 502 | `container` | Yes | `https://polyglot.dev/errors/otel-export-failed` | Exporting telemetry spans to the local OTLP collector failed. |
| `OTEL_TRACE_CORRELATION_FAILED` | 404 | `bridge` | No | `https://polyglot.dev/errors/otel-trace-correlation-failed` | Requested traceId could not be correlated across system layers or was not found. |
| `LEANSCORER_FAILED` | 422 | `bridge` | No | `https://polyglot.dev/errors/leanscorer-failed` | Semantic LeanScorer evaluation failed or returned an invalid confidence score. |
| `YJS_SYNC_FAILED` | 500 | `container` | Yes | `https://polyglot.dev/errors/yjs-sync-failed` | CRDT synchronization between client and Hocuspocus server failed. |
| `HOCUSPOCUS_AUTH_FAILED` | 401 | `policy` | No | `https://polyglot.dev/errors/hocuspocus-auth-failed` | WebSocket authentication for real-time collaboration failed or token was rejected. |
| `CRDT_CONFLICT_UNRESOLVED` | 409 | `policy` | No | `https://polyglot.dev/errors/crdt-conflict-unresolved` | A semantic verification conflict occurred between collaborating peers that requires manual resolution. |

*Last verified: 2026-10-29*

