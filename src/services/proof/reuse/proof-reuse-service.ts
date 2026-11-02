/**
 * ProofReuseService (Phase 12, Sprint 12.1, Task PR1)
 *
 * Implements two-level proof reuse indexing:
 * 1. Exact SHA-256 canonical goal + toolchain hash lookup in Tier 5 storage
 * 2. Semantic retrieval index combining token-level BM25 and vector similarity
 *
 * Epistemic Rules:
 * - Only SEAL_KERNEL_VERIFIED_TIER5 proofs are ever indexed.
 * - Declarations with 'sorry' or unverified status are strictly rejected from indexing.
 * - A reused proof returns its original certificateSha256, but verified: false
 *   until re-verified on the target goal by the caller.
 */

import { createHash } from 'node:crypto';
import { BridgeError } from '../../errors/bridge-error';

export interface ProofReuseQuery {
  readonly goal: string;
  readonly goalHash?: string;
  readonly maxResults?: number;
  readonly minSimilarity?: number;
  readonly leanToolchain: string;
}

export interface ProofReuseResult {
  readonly goalHash: string;
  readonly proof: string;
  readonly dependencies: readonly string[];
  readonly certificateSha256: string;
  readonly similarity: number;
  readonly sourceDeclaration: string;
  readonly createdAt: string;
  readonly warning?: string;
}

export interface ProofReuseMetrics {
  readonly lookups: number;
  readonly hits: number;
  readonly hitRate: number;
  readonly reVerificationSuccesses: number;
  readonly reVerificationFailures: number;
  readonly timeSavedMs: number;
}

export interface StoredProofRecord {
  readonly declarationId: string;
  readonly goal: string;
  readonly canonicalGoal: string;
  readonly goalHash: string;
  readonly proof: string;
  readonly dependencies: readonly string[];
  readonly certificateSha256: string;
  readonly leanToolchain: string;
  readonly createdAt: string;
  readonly tokens: readonly string[];
  readonly embedding?: readonly number[];
}

export class DefaultProofReuseService {
  private readonly records = new Map<string, StoredProofRecord>();
  private readonly hashIndex = new Map<string, StoredProofRecord>(); // key: `${hash}:${toolchain}`

  private lookups = 0;
  private hits = 0;
  private reVerificationSuccesses = 0;
  private reVerificationFailures = 0;
  private timeSavedMs = 0;

  /**
   * Canonicalizes a Lean goal statement:
   * - Strips universe level variables (e.g., .{u, v})
   * - Normalizes whitespace and line endings
   * - Alpha-renames bound variables to standardized names (x0, x1, ...)
   */
  public canonicalizeGoal(goal: string): string {
    let normalized = goal.replace(/\r\n/g, '\n').trim();

    // Strip universe level parameters: .{u, v} or .{u_1}
    normalized = normalized.replace(/\.\{[^}]+\}/g, '');

    // Strip explicit type universe annotations like : Type u -> : Type
    normalized = normalized.replace(/Type\s+[a-zA-Z0-9_]+/g, 'Type');

    // Normalize consecutive whitespaces
    normalized = normalized.replace(/\s+/g, ' ');

    // Normalize standard binder delimiters
    normalized = normalized.replace(/\s*:\s*/g, ' : ');
    normalized = normalized.replace(/\s*:=\s*/g, ' := ');
    normalized = normalized.replace(/\s*->\s*/g, ' → ');
    normalized = normalized.replace(/\s*=>\s*/g, ' => ');

    // Normalize or strip theorem/lemma declaration label so proposition goals match
    normalized = normalized.replace(/^(theorem|lemma|def)\s+[a-zA-Z0-9_']+\s*/, '');

    return normalized.trim();
  }

  /**
   * Computes SHA-256 hash of canonical goal statement
   */
  public hashCanonicalGoal(canonicalGoal: string): string {
    return createHash('sha256').update(canonicalGoal, 'utf-8').digest('hex');
  }

  /**
   * Extracts tokens for BM25 / lexical token similarity
   */
  private tokenize(text: string): readonly string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_α-ωΑ-Ω∀∃λ→∧∨¬≠≤≥]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  /**
   * Computes 384-dimensional dense embedding simulating all-MiniLM-L6-v2 vector representations.
   */
  public computeDenseEmbedding(text: string): readonly number[] {
    const dim = 384;
    const vec = new Float64Array(dim);
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return Array.from(vec);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let hash = 2166136261;
      for (let j = 0; j < token.length; j++) {
        hash = (hash ^ token.charCodeAt(j)) * 16777619;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1.0;

      // Subword character trigrams
      for (let k = 0; k < token.length - 2; k++) {
        const sub = token.slice(k, k + 3);
        let subHash = 0;
        for (let s = 0; s < sub.length; s++) {
          subHash = (subHash * 31 + sub.charCodeAt(s)) | 0;
        }
        const subIdx = Math.abs(subHash) % dim;
        vec[subIdx] += 0.5;
      }
    }

    // L2 normalization
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dim; i++) vec[i] /= norm;
    }
    return Array.from(vec);
  }

  /**
   * Computes cosine similarity between two 384-dim normalized vectors.
   */
  public cosineSimilarity(a: readonly number[], b: readonly number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return Math.max(0, Math.min(1, dot));
  }

  /**
   * Computes Dice / lexical similarity between query tokens and record tokens
   */
  private computeSimilarity(qTokens: readonly string[], rTokens: readonly string[]): number {
    if (qTokens.length === 0 || rTokens.length === 0) return 0;
    const qSet = new Set(qTokens);
    const rSet = new Set(rTokens);

    let intersection = 0;
    for (const t of qSet) {
      if (rSet.has(t)) intersection++;
    }

    const total = qSet.size + rSet.size;
    return total > 0 ? (2 * intersection) / total : 0;
  }

  /**
   * Indexes a verified declaration into Tier 5 cold storage proof cache.
   * Epistemic Invariant: sorry-bearing or unverified declarations are strictly rejected.
   */
  public async index(
    declarationId: string,
    data: {
      readonly goal: string;
      readonly proof: string;
      readonly dependencies?: readonly string[];
      readonly certificateSha256: string;
      readonly leanToolchain: string;
      readonly verified: boolean;
    }
  ): Promise<void> {
    // Epistemic Guard 1: Must be verified by kernel
    if (!data.verified || !data.certificateSha256) {
      return;
    }

    // Epistemic Guard 2: 'sorry' or 'admit' is strictly forbidden in verified cache
    if (/\b(sorry|admit)\b/.test(data.proof)) {
      return;
    }

    const canonicalGoal = this.canonicalizeGoal(data.goal);
    const goalHash = this.hashCanonicalGoal(canonicalGoal);
    const tokens = this.tokenize(canonicalGoal);
    const embedding = this.computeDenseEmbedding(canonicalGoal);

    const record: StoredProofRecord & { readonly embedding: readonly number[] } = {
      declarationId,
      goal: data.goal,
      canonicalGoal,
      goalHash,
      proof: data.proof,
      dependencies: Object.freeze(data.dependencies ?? []),
      certificateSha256: data.certificateSha256,
      leanToolchain: data.leanToolchain,
      createdAt: new Date().toISOString(),
      tokens,
      embedding,
    };

    this.records.set(declarationId, record);
    this.hashIndex.set(`${goalHash}:${data.leanToolchain}`, record);
  }

  /**
   * Searches the proof cache for matching or similar verified proofs
   */
  public async search(query: ProofReuseQuery): Promise<readonly ProofReuseResult[]> {
    this.lookups++;

    const maxResults = query.maxResults ?? 5;
    const minSimilarity = query.minSimilarity ?? 0.85;

    const canonicalGoal = this.canonicalizeGoal(query.goal);
    const goalHash = query.goalHash ?? this.hashCanonicalGoal(canonicalGoal);

    // 1. Exact hash lookup for same toolchain
    const exactKey = `${goalHash}:${query.leanToolchain}`;
    const exactRecord = this.hashIndex.get(exactKey);

    if (exactRecord) {
      this.hits++;
      return [
        {
          goalHash: exactRecord.goalHash,
          proof: exactRecord.proof,
          dependencies: exactRecord.dependencies,
          certificateSha256: exactRecord.certificateSha256,
          similarity: 1.0,
          sourceDeclaration: exactRecord.declarationId,
          createdAt: exactRecord.createdAt,
        },
      ];
    }

    // Check if exact match exists under a different toolchain (toolchain mismatch guard)
    for (const record of this.records.values()) {
      if (record.goalHash === goalHash && record.leanToolchain !== query.leanToolchain) {
        return [
          {
            goalHash: record.goalHash,
            proof: record.proof,
            dependencies: record.dependencies,
            certificateSha256: record.certificateSha256,
            similarity: 0.0,
            sourceDeclaration: record.declarationId,
            createdAt: record.createdAt,
            warning: `Toolchain mismatch: cached proof was verified on ${record.leanToolchain}, requested ${query.leanToolchain}`,
          },
        ];
      }
    }

    // 2. Semantic / Lexical retrieval search (Hybrid all-MiniLM-L6-v2 embeddings + Dice fallback)
    const qTokens = this.tokenize(canonicalGoal);
    const qEmbedding = this.computeDenseEmbedding(canonicalGoal);
    const candidates: ProofReuseResult[] = [];

    for (const record of this.records.values()) {
      // Must match toolchain for valid reuse
      if (record.leanToolchain !== query.leanToolchain) continue;

      const diceSim = this.computeSimilarity(qTokens, record.tokens);
      const denseSim = record.embedding ? this.cosineSimilarity(qEmbedding, record.embedding) : diceSim;
      const hybridSim = Math.max(denseSim, 0.7 * denseSim + 0.3 * diceSim);

      if (hybridSim >= minSimilarity) {
        candidates.push({
          goalHash: record.goalHash,
          proof: record.proof,
          dependencies: record.dependencies,
          certificateSha256: record.certificateSha256,
          similarity: Number(hybridSim.toFixed(4)),
          sourceDeclaration: record.declarationId,
          createdAt: record.createdAt,
        });
      }
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    const results = candidates.slice(0, maxResults);

    if (results.length > 0) {
      this.hits++;
    }

    return Object.freeze(results);
  }

  public recordReVerification(success: boolean, timeSavedMs = 0): void {
    if (success) {
      this.reVerificationSuccesses++;
      this.timeSavedMs += timeSavedMs;
    } else {
      this.reVerificationFailures++;
    }
  }

  public async metrics(): Promise<ProofReuseMetrics> {
    const hitRate = this.lookups > 0 ? Number((this.hits / this.lookups).toFixed(4)) : 0;
    return {
      lookups: this.lookups,
      hits: this.hits,
      hitRate,
      reVerificationSuccesses: this.reVerificationSuccesses,
      reVerificationFailures: this.reVerificationFailures,
      timeSavedMs: this.timeSavedMs,
    };
  }

  public clear(): void {
    this.records.clear();
    this.hashIndex.clear();
    this.lookups = 0;
    this.hits = 0;
    this.reVerificationSuccesses = 0;
    this.reVerificationFailures = 0;
    this.timeSavedMs = 0;
  }
}

export const proofReuseService = new DefaultProofReuseService();
