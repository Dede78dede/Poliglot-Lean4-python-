/**
 * Chat Types & Data Contracts (Sprint 11.0.2, Task C1 & C2)
 */

export interface ToolCallRecord {
  readonly id: string;
  readonly name: string;
  readonly args: Record<string, unknown>;
  result?: unknown;
  durationMs?: number;
  isApproved?: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rejected';
}

export interface ProposedDiff {
  readonly path: string;
  readonly originalContent: string;
  readonly proposedContent: string;
  applied: boolean;
}

export interface ChatAttachment {
  readonly name: string;
  readonly path?: string;
  readonly content: string;
  readonly type: 'text' | 'image';
  readonly size: number;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  readonly timestamp: number;
  toolCalls?: ToolCallRecord[];
  proposedDiff?: ProposedDiff;
  attachments?: readonly ChatAttachment[];
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  error?: string;
}

export interface ChatSession {
  readonly id: string;
  title: string;
  readonly createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  providerId: string;
  modelId: string;
  autonomousMode: boolean;
  toolCallsCount: number;
  fileEditsCount: number;
}

export interface SlashCommandDescriptor {
  readonly command: string;
  readonly description: string;
  readonly mcpTool?: string;
  readonly skillName?: string;
}

export const CANONICAL_SLASH_COMMANDS: readonly SlashCommandDescriptor[] = Object.freeze([
  {
    command: '/probe',
    description: 'Speculatively evaluate a Lean 4 tactic using lean-beam MCP without mutating project files',
    mcpTool: 'polyglot_probe_tactic',
    skillName: 'polyglot-probe-tactic',
  },
  {
    command: '/prove',
    description: 'Synthesize formal Lean 4 tactic proof using semantic search and local heuristics',
    mcpTool: 'polyglot_lean_prove',
    skillName: 'polyglot-math-prover',
  },
  {
    command: '/formalize',
    description: 'Autoformalize natural language theorem statements into Lean 4 declarations',
    mcpTool: 'polyglot_formalize_statement',
    skillName: 'polyglot-math-prover',
  },
  {
    command: '/search',
    description: 'Query Mathlib and Aristotle with Reciprocal Rank Fusion (RRF)',
    mcpTool: 'polyglot_search_theorems',
    skillName: 'polyglot-math-prover',
  },
  {
    command: '/blueprint',
    description: 'Inspect and navigate mathematical dependency DAG and generate Lean stubs',
    mcpTool: 'polyglot_generate_blueprint',
    skillName: 'lean-blueprint-navigator',
  },
  {
    command: '/explain',
    description: 'Explain mathematical proof logic, tactics, or Python scientific algorithms',
  },
  {
    command: '/refactor',
    description: 'Refactor proof or code for readability, type safety, and minimal steps',
  },
  {
    command: '/test',
    description: 'Run project unit tests, LSpec CI verification, and type checking',
    skillName: 'lspec-ci-generator',
  },
  {
    command: '/archive',
    description: 'Create safe RO-Crate export archive of current VFS and project state',
    mcpTool: 'polyglot_archive_project',
  },
]);

export interface ChatStoreState {
  readonly sessions: readonly ChatSession[];
  readonly activeSessionId: string | null;
  readonly isStreaming: boolean;
  readonly error: string | null;
}
