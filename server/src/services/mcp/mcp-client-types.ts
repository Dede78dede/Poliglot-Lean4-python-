export type McpTransportType = 'stdio' | 'streamable-http' | 'sse';

export interface McpClientConfig {
  readonly transport: McpTransportType;
  readonly command?: string;           // e.g. "uvx" or "lean-lsp-mcp"
  readonly args?: readonly string[];
  readonly endpoint?: string;          // for http / sse
  readonly authToken?: string;         // LEAN_LSP_MCP_TOKEN
  readonly projectPath: string;        // LEAN_PROJECT_PATH
  readonly logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export type McpToolCategory =
  | 'file-analysis'
  | 'proof-state'
  | 'code-intelligence'
  | 'search'
  | 'tactics'
  | 'build'
  | 'widgets-profiling';

export interface McpToolDeclaration {
  readonly name: string;
  readonly category: McpToolCategory;
  readonly description: string;
  readonly isExternalSearch: boolean; // subject to 3 req / 30s rate limiting
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: Record<string, { readonly type: string; readonly description: string }>;
    readonly required?: readonly string[];
  };
}

export interface McpToolCallRequest {
  readonly toolName: string;
  readonly arguments: Record<string, unknown>;
}

export interface McpToolCallResult<T = unknown> {
  readonly success: boolean;
  readonly toolName: string;
  readonly data?: T;
  readonly error?: string;
  readonly rateLimited?: boolean;
  readonly durationMs: number;
}

/**
 * Full 26-Tool Matrix matching lean-lsp-mcp (PyPI) and rust-lean-mcp (MIT).
 */
export const LEAN_LSP_MCP_TOOLS: readonly McpToolDeclaration[] = [
  // 1. File Analysis (3)
  {
    name: 'lean_file_outline',
    category: 'file-analysis',
    description: 'Extract hierarchical symbols, namespaces, theorems, and definitions from a Lean 4 file.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Relative path to .lean source file' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'lean_diagnostic_messages',
    category: 'file-analysis',
    description: 'Fetch current LSP compiler diagnostics, errors, warnings, and linter notes.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Target Lean 4 file path' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'lean_declaration_file',
    category: 'file-analysis',
    description: 'Locate the source declaration file and line range for an identifier in Mathlib or local project.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Fully qualified Lean declaration symbol' },
      },
      required: ['symbol'],
    },
  },

  // 2. Proof State & Goals (4)
  {
    name: 'lean_goal',
    category: 'proof-state',
    description: 'Inspect current proof goals, hypotheses, and target type at a specific position.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Target source file path' },
        line: { type: 'number', description: '1-indexed line position' },
        column: { type: 'number', description: '1-indexed character column position' },
      },
      required: ['filePath', 'line', 'column'],
    },
  },
  {
    name: 'lean_term_goal',
    category: 'proof-state',
    description: 'Inspect expected term type at a sub-expression location in elaboration state.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Target source file path' },
        line: { type: 'number', description: 'Line number' },
        column: { type: 'number', description: 'Column number' },
      },
      required: ['filePath', 'line', 'column'],
    },
  },
  {
    name: 'lean_proof_tree',
    category: 'proof-state',
    description: 'Generate structural tactic tree with goal dependencies and branching.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        theoremName: { type: 'string', description: 'Name of the theorem declaration' },
      },
      required: ['theoremName'],
    },
  },
  {
    name: 'lean_verify_kernel',
    category: 'proof-state',
    description: 'Invoke Lean 4 kernel directly to certify proof term with zero-sorry guarantee.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Lean proof code to certify' },
      },
      required: ['code'],
    },
  },

  // 3. Code Intelligence (5)
  {
    name: 'lean_hover_info',
    category: 'code-intelligence',
    description: 'Get hover documentation, inferred type signature, and docstrings for symbol under cursor.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to source file' },
        line: { type: 'number', description: 'Line number' },
        column: { type: 'number', description: 'Column number' },
      },
      required: ['filePath', 'line', 'column'],
    },
  },
  {
    name: 'lean_completions',
    category: 'code-intelligence',
    description: 'Request context-aware LSP completions, keywords, identifiers, and unicode math symbols.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Source file' },
        line: { type: 'number', description: 'Line' },
        column: { type: 'number', description: 'Column' },
      },
      required: ['filePath', 'line', 'column'],
    },
  },
  {
    name: 'lean_run_code',
    category: 'code-intelligence',
    description: 'Evaluate code snippet or expression via #eval or #check and return stdout output.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Lean code expression or snippet' },
      },
      required: ['code'],
    },
  },
  {
    name: 'lean_multi_attempt',
    category: 'code-intelligence',
    description: 'Execute multiple candidate tactics in parallel and return the first sound candidate.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'Sanitized goal state' },
        candidates: { type: 'string', description: 'JSON array of candidate tactics' },
      },
      required: ['goal', 'candidates'],
    },
  },
  {
    name: 'lean_dependency_graph',
    category: 'code-intelligence',
    description: 'Extract internal dependency DAG between declarations across modules.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        rootModule: { type: 'string', description: 'Root module name' },
      },
      required: ['rootModule'],
    },
  },

  // 4. Semantic & External Search (6 - external searches rate limited)
  {
    name: 'lean_local_search',
    category: 'search',
    description: 'Perform local ripgrep-accelerated symbol and text search across the current Lean workspace.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'lean_leansearch',
    category: 'search',
    description: 'Query LeanSearch semantic search engine for Mathlib theorems via natural language.',
    isExternalSearch: true,
    inputSchema: {
      type: 'object',
      properties: {
        naturalQuery: { type: 'string', description: 'Natural language mathematical description' },
      },
      required: ['naturalQuery'],
    },
  },
  {
    name: 'leansearch_leandex',
    category: 'search',
    description: 'Query Leandex dense semantic vector index for Mathlib declarations.',
    isExternalSearch: true,
    inputSchema: {
      type: 'object',
      properties: {
        concept: { type: 'string', description: 'Mathematical concept or term' },
      },
      required: ['concept'],
    },
  },
  {
    name: 'lean_loogle',
    category: 'search',
    description: 'Type-directed search engine (Loogle) finding declarations matching given type patterns.',
    isExternalSearch: true,
    inputSchema: {
      type: 'object',
      properties: {
        typePattern: { type: 'string', description: 'Lean type signature pattern (e.g. ?a + ?b = ?b + ?a)' },
      },
      required: ['typePattern'],
    },
  },
  {
    name: 'lean_leanfinder',
    category: 'search',
    description: 'Find premise lemmas by structural similarity to the target goal.',
    isExternalSearch: true,
    inputSchema: {
      type: 'object',
      properties: {
        targetGoal: { type: 'string', description: 'Target goal expression' },
      },
      required: ['targetGoal'],
    },
  },
  {
    name: 'lean_state_search',
    category: 'search',
    description: 'Search Mathlib for theorems applicable to a specific proof state.',
    isExternalSearch: true,
    inputSchema: {
      type: 'object',
      properties: {
        proofState: { type: 'string', description: 'Proof state text' },
      },
      required: ['proofState'],
    },
  },

  // 5. Tactics, Premise & Repair (3)
  {
    name: 'lean_hammer_premise',
    category: 'tactics',
    description: 'Select relevant premise lemmas for automated hammer / superposition provers.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'Current goal' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'lean_tactic_suggest',
    category: 'tactics',
    description: 'Synthesize candidate tactics for the current goal using local deterministic engine or Leanstral.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'Target goal' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'lean_proof_repair',
    category: 'tactics',
    description: 'Repair broken proof after upstream Mathlib API change or tactic breakage.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        brokenCode: { type: 'string', description: 'Code with error' },
      },
      required: ['brokenCode'],
    },
  },

  // 6. Build & Maintenance (2)
  {
    name: 'lean_build',
    category: 'build',
    description: 'Trigger lake build on the project and stream compilation output.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Optional lake target' },
      },
    },
  },
  {
    name: 'lean_clean',
    category: 'build',
    description: 'Clean lake build artifacts (.lake/build) and force recompilation.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // 7. Widgets, Profiling & Batch (3)
  {
    name: 'lean_widget_render',
    category: 'widgets-profiling',
    description: 'Render interactive UserWidget component state (e.g. term tree or commutative diagram).',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget identifier' },
      },
      required: ['widgetId'],
    },
  },
  {
    name: 'lean_profiler_inspect',
    category: 'widgets-profiling',
    description: 'Inspect elaboration timing and memory footprint for expensive tactics and declarations.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        declaration: { type: 'string', description: 'Declaration name' },
      },
      required: ['declaration'],
    },
  },
  {
    name: 'lean_batch_eval',
    category: 'widgets-profiling',
    description: 'Execute batch verification of multiple theorem declarations concurrently.',
    isExternalSearch: false,
    inputSchema: {
      type: 'object',
      properties: {
        declarations: { type: 'string', description: 'JSON array of declaration names' },
      },
      required: ['declarations'],
    },
  },
];
