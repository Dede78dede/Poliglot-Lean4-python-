/**
 * Unified Error Registry & RFC 9457 Problem Details (Phase 10.9, Task E1)
 *
 * Consolidates 30 error codes across the kernel, containers, bridges, policies,
 * inputs, budgets, and consent gates into a single typed registry.
 * Strictly adheres to RFC 9457 Problem Details for HTTP APIs.
 */

export interface ErrorDefinition {
  readonly code: string;
  readonly httpStatus: number;
  readonly problemType: string;       // RFC 9457 URI, e.g. "https://polyglot.dev/errors/kernel-disagreement"
  readonly category: 'kernel' | 'container' | 'bridge' | 'policy' | 'input' | 'budget' | 'consent';
  readonly retryable: boolean;
  readonly userMessage: string;       // user-facing, non-technical explanation
}

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance?: string;
  readonly code: string;
  readonly correlationId: string;
  readonly retryable: boolean;
  readonly category: string;
  readonly [key: string]: unknown;
}

export const ERROR_REGISTRY = {
  KERNEL_DISAGREEMENT: {
    code: 'KERNEL_DISAGREEMENT',
    httpStatus: 422,
    problemType: 'https://polyglot.dev/errors/kernel-disagreement',
    category: 'kernel',
    retryable: false,
    userMessage: 'Independent proof checking kernels produced conflicting verification verdicts.',
  },
  PASTALEAN_UNSUPPORTED: {
    code: 'PASTALEAN_UNSUPPORTED',
    httpStatus: 422,
    problemType: 'https://polyglot.dev/errors/pastalean-unsupported',
    category: 'input',
    retryable: false,
    userMessage: 'The provided Python syntax contains constructs unsupported by the PastaLean formal translator.',
  },
  PASTALEAN_UNAVAILABLE: {
    code: 'PASTALEAN_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/pastalean-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The PastaLean translation runner container is currently offline or unresponsive.',
  },
  LEANFLOW_UNAVAILABLE: {
    code: 'LEANFLOW_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/leanflow-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The LeanFlow autoformalization runner container is currently unreachable.',
  },
  LEANSCREEN_UNAVAILABLE: {
    code: 'LEANSCREEN_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/leanscreen-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The leanscreen semantic fidelity gate is temporarily unavailable.',
  },
  SPAN_UNAVAILABLE: {
    code: 'SPAN_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/span-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The LaTeX span ledger extraction service encountered a connection timeout.',
  },
  LEANCERT_UNAVAILABLE: {
    code: 'LEANCERT_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/leancert-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The LeanCert numerical verification container is not reachable on port 8085.',
  },
  LUNGO_UNAVAILABLE: {
    code: 'LUNGO_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/lungo-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The Lungo multi-language export CLI runner is currently unreachable.',
  },
  LUNGO_TOOLCHAIN_MISMATCH: {
    code: 'LUNGO_TOOLCHAIN_MISMATCH',
    httpStatus: 422,
    problemType: 'https://polyglot.dev/errors/lungo-toolchain-mismatch',
    category: 'bridge',
    retryable: false,
    userMessage: 'Project Lean toolchain is incompatible with Lungo compiler requirements (v4.34.1 required).',
  },
  PROJECT_NOT_KERNEL_VERIFIED: {
    code: 'PROJECT_NOT_KERNEL_VERIFIED',
    httpStatus: 412,
    problemType: 'https://polyglot.dev/errors/project-not-kernel-verified',
    category: 'policy',
    retryable: false,
    userMessage: 'Action rejected: Project must achieve SEAL_KERNEL_VERIFIED_TIER5 before proceeding.',
  },
  FORMATTER_UNAVAILABLE: {
    code: 'FORMATTER_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/formatter-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The Lean source code formatter tool is not available in the current environment.',
  },
  HERON_UNAVAILABLE: {
    code: 'HERON_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/heron-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The Heron AST linter runner (fork v4.31.0) is currently offline.',
  },
  LSPEC_UNAVAILABLE: {
    code: 'LSPEC_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/lspec-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The LSpec test execution suite failed to start or timed out.',
  },
  DOCGEN_UNAVAILABLE: {
    code: 'DOCGEN_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/docgen-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The doc-gen4 documentation generator could not be executed.',
  },
  VERSO_UNAVAILABLE: {
    code: 'VERSO_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/verso-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The Verso Blueprint documentation build service is unreachable.',
  },
  SEARCH_UNAVAILABLE: {
    code: 'SEARCH_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/search-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'All semantic search providers in the fallback chain are currently unreachable.',
  },
  LEANBLUEPRINT_UNAVAILABLE: {
    code: 'LEANBLUEPRINT_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/leanblueprint-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The leanblueprint-mcp graph rendering client is temporarily offline.',
  },
  LEANARCHITECT_UNAVAILABLE: {
    code: 'LEANARCHITECT_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/leanarchitect-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The LeanArchitect annotation extractor service is currently unreachable.',
  },
  CRAMF_UNAVAILABLE: {
    code: 'CRAMF_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/cramf-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The CRAMF retrieval augmentation plugin is unavailable or unconfigured.',
  },
  ANTHROPIC_KEY_MISSING: {
    code: 'ANTHROPIC_KEY_MISSING',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/anthropic-key-missing',
    category: 'policy',
    retryable: false,
    userMessage: 'Required Anthropic API key is not configured in the environment.',
  },
  CONSENT_REQUIRED: {
    code: 'CONSENT_REQUIRED',
    httpStatus: 403,
    problemType: 'https://polyglot.dev/errors/consent-required',
    category: 'consent',
    retryable: false,
    userMessage: 'Explicit user confirmation is required in the UI before initiating this operation.',
  },
  BUDGET_EXHAUSTED: {
    code: 'BUDGET_EXHAUSTED',
    httpStatus: 429,
    problemType: 'https://polyglot.dev/errors/budget-exhausted',
    category: 'budget',
    retryable: false,
    userMessage: 'The allocated model or API token budget has been fully exhausted.',
  },
  PROVIDER_UNAVAILABLE: {
    code: 'PROVIDER_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/provider-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The requested external or local AI model provider is unreachable.',
  },
  SANDBOX_POLICY_VIOLATION: {
    code: 'SANDBOX_POLICY_VIOLATION',
    httpStatus: 403,
    problemType: 'https://polyglot.dev/errors/sandbox-policy-violation',
    category: 'policy',
    retryable: false,
    userMessage: 'Operation blocked by security policy: attempted to run unverified code outside sandbox.',
  },
  REPO_TOO_LARGE: {
    code: 'REPO_TOO_LARGE',
    httpStatus: 413,
    problemType: 'https://polyglot.dev/errors/repo-too-large',
    category: 'input',
    retryable: false,
    userMessage: 'The repository size exceeds the maximum allowed import limit of 200 MiB.',
  },
  ARCHIVE_TOO_LARGE: {
    code: 'ARCHIVE_TOO_LARGE',
    httpStatus: 413,
    problemType: 'https://polyglot.dev/errors/archive-too-large',
    category: 'input',
    retryable: false,
    userMessage: 'The uncompressed archive content exceeds the allowed quota limit.',
  },
  ZIP_TOO_LARGE: {
    code: 'ZIP_TOO_LARGE',
    httpStatus: 413,
    problemType: 'https://polyglot.dev/errors/zip-too-large',
    category: 'input',
    retryable: false,
    userMessage: 'The uploaded ZIP archive file size exceeds the 50 MiB uncompressed limit.',
  },
  FEATURE_FLAG_UNKNOWN: {
    code: 'FEATURE_FLAG_UNKNOWN',
    httpStatus: 200,
    problemType: 'https://polyglot.dev/errors/feature-flag-unknown',
    category: 'policy',
    retryable: false,
    userMessage: 'An unrecognized feature flag was detected in the environment and ignored.',
  },
  INDEXEDDB_MIGRATION_FAILED: {
    code: 'INDEXEDDB_MIGRATION_FAILED',
    httpStatus: 500,
    problemType: 'https://polyglot.dev/errors/indexeddb-migration-failed',
    category: 'container',
    retryable: false,
    userMessage: 'Browser IndexedDB schema upgrade failed to execute cleanly.',
  },
  CORRELATION_ID_MISSING: {
    code: 'CORRELATION_ID_MISSING',
    httpStatus: 500,
    problemType: 'https://polyglot.dev/errors/correlation-id-missing',
    category: 'bridge',
    retryable: false,
    userMessage: 'Bridge request lacked a valid diagnostic correlation identifier.',
  },
  PAPERPROOF_UNAVAILABLE: {
    code: 'PAPERPROOF_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/paperproof-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The Paperproof proof-tree visualization service is currently offline or unreachable.',
  },
  MATHESIS_UNAVAILABLE: {
    code: 'MATHESIS_UNAVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/mathesis-unavailable',
    category: 'container',
    retryable: true,
    userMessage: 'The Mathesis NL-to-Lean 4 autoformalization bridge is currently unreachable.',
  },
  EPISTEMIC_TRANSITION_INVALID: {
    code: 'EPISTEMIC_TRANSITION_INVALID',
    httpStatus: 400,
    problemType: 'https://polyglot.dev/errors/epistemic-transition-invalid',
    category: 'policy',
    retryable: false,
    userMessage: 'Illegal epistemic transition requested: state progression must satisfy epistemic integrity invariants.',
  },
  ROUTER_NO_PROVIDER_AVAILABLE: {
    code: 'ROUTER_NO_PROVIDER_AVAILABLE',
    httpStatus: 503,
    problemType: 'https://polyglot.dev/errors/router-no-provider-available',
    category: 'bridge',
    retryable: true,
    userMessage: 'No autoformalization provider in the router fallback chain is available or enabled.',
  },
} as const satisfies Record<string, ErrorDefinition>;

export type ErrorCode = keyof typeof ERROR_REGISTRY;

export function createProblemDetails(
  definition: ErrorDefinition,
  correlationId: string,
  details?: Readonly<Record<string, unknown>>
): ProblemDetails {
  return {
    type: definition.problemType,
    title: definition.code,
    status: definition.httpStatus,
    detail: definition.userMessage,
    code: definition.code,
    correlationId,
    retryable: definition.retryable,
    category: definition.category,
    ...details,
  };
}
