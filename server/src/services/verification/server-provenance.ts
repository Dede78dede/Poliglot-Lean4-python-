import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PROVENANCE_SCHEMA_VERSION = 'polyglot.provenance.v2' as const;
export const PROVENANCE_ISSUER = 'polyglot-server-executor' as const;
export const PROVENANCE_MAX_AGE_MS = 5 * 60_000;
export const PROVENANCE_MAX_CLOCK_SKEW_MS = 30_000;
export const MIN_PRODUCTION_SECRET_CHARS = 32;
export const SHA256_DIGEST_REGEX = /^(?:sha256:)?[a-f0-9]{64}$/i;

export interface ProvenanceDiagnosticRecord {
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
}

export interface ProvenanceAxiomAuditRecord {
  readonly status: 'passed' | 'failed' | 'not_run' | 'not_applicable';
  readonly observedAxioms: readonly string[];
  readonly allowedAxioms: readonly string[];
  readonly violations?: readonly string[];
}

export interface ServerExecutionProvenance {
  readonly schemaVersion: typeof PROVENANCE_SCHEMA_VERSION;
  readonly provenanceId: string;
  readonly keyId: string;
  readonly issuer: typeof PROVENANCE_ISSUER;
  readonly signature: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly nonce: string;
  readonly engine: 'kimina' | 'lake';
  readonly imageDigest: string;
  readonly manifestDigest: string;
}

export interface ProvenanceSubject {
  readonly requestId: string;
  readonly engine: 'kimina' | 'lake' | 'simulator';
  readonly sourceDigest: string;
  readonly contextDigest?: string;
  readonly manifestDigest?: string;
  readonly toolchain?: string;
  readonly imageDigest?: string;
  readonly targetIds?: readonly string[];
  readonly outcome: string;
  readonly exitCode: number | null;
  readonly diagnostics?: readonly ProvenanceDiagnosticRecord[];
  readonly axiomAudit?: ProvenanceAxiomAuditRecord;
}

export interface ProvenanceKey {
  readonly keyId: string;
  readonly secret: string;
}

export interface ProvenanceKeyRing {
  readonly active: ProvenanceKey;
  readonly previous?: ProvenanceKey;
}

const EPHEMERAL_DEV_SECRET = crypto.randomBytes(32).toString('hex');

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) subset serializer.
 * - Object keys sorted by UTF-16 code unit lexicographical order
 * - `undefined` object properties omitted; `-0` serialized as `0`
 * - Zero insignificant whitespace
 */
export function canonicalizeJsonJcs(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('CANONICAL_JSON_ERROR: Non-finite numbers are not valid JSON.');
    }
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => (item === undefined ? 'null' : canonicalizeJsonJcs(item)));
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const pairs: string[] = [];
    for (const key of keys) {
      const propVal = record[key];
      if (propVal === undefined || typeof propVal === 'function' || typeof propVal === 'symbol') {
        continue;
      }
      pairs.push(`${JSON.stringify(key)}:${canonicalizeJsonJcs(propVal)}`);
    }
    return `{${pairs.join(',')}}`;
  }
  throw new Error(`CANONICAL_JSON_ERROR: Unsupported value type "${typeof value}".`);
}

/**
 * Resolves the HMAC provenance keyring from environment variables.
 * Enforces fail-closed checks in production:
 * - Requires POLYGLOT_PROVENANCE_SECRET with >= 32 characters
 * - Rejects multi-instance deployment unless POLYGLOT_ATOMIC_NONCE_STORE_URL is configured
 */
export function resolveServerProvenanceKeyRing(
  env: Record<string, string | undefined> = process.env,
): ProvenanceKeyRing {
  const isProduction = env['NODE_ENV'] === 'production';
  const configuredSecret = env['POLYGLOT_PROVENANCE_SECRET']?.trim();
  const activeKeyId = env['POLYGLOT_PROVENANCE_KEY_ID']?.trim() || 'primary-v1';

  if (isProduction) {
    if (!configuredSecret || configuredSecret.length < MIN_PRODUCTION_SECRET_CHARS) {
      throw new Error(
        `CRITICAL SECURITY VIOLATION: POLYGLOT_PROVENANCE_SECRET must be set to at least ${MIN_PRODUCTION_SECRET_CHARS} characters in production.`,
      );
    }
    if (env['POLYGLOT_MULTI_INSTANCE'] === 'true' && !env['POLYGLOT_ATOMIC_NONCE_STORE_URL']?.trim()) {
      throw new Error(
        'CRITICAL DEPLOYMENT VIOLATION: POLYGLOT_MULTI_INSTANCE=true requires POLYGLOT_ATOMIC_NONCE_STORE_URL for atomic cross-instance anti-replay. Deploy as single instance or configure shared atomic nonce store.',
      );
    }
  }

  const activeSecret = configuredSecret && configuredSecret.length > 0
    ? configuredSecret
    : `dev-ephemeral:${EPHEMERAL_DEV_SECRET}`;

  const active: ProvenanceKey = {
    keyId: configuredSecret ? activeKeyId : 'dev-ephemeral-v1',
    secret: activeSecret,
  };

  const prevSecret = env['POLYGLOT_PROVENANCE_PREVIOUS_SECRET']?.trim();
  const prevKeyId = env['POLYGLOT_PROVENANCE_PREVIOUS_KEY_ID']?.trim();

  if (prevSecret) {
    if (isProduction && prevSecret.length < MIN_PRODUCTION_SECRET_CHARS) {
      throw new Error(
        `CRITICAL SECURITY VIOLATION: POLYGLOT_PROVENANCE_PREVIOUS_SECRET must be at least ${MIN_PRODUCTION_SECRET_CHARS} characters when configured.`,
      );
    }
    return {
      active,
      previous: {
        keyId: prevKeyId || 'previous-v1',
        secret: prevSecret,
      },
    };
  }

  return { active };
}

export function normalizeSha256(digest: string): string {
  return digest.startsWith('sha256:') ? digest.slice(7).toLowerCase() : digest.toLowerCase();
}

export function isValidSha256Digest(digest: string | undefined): boolean {
  return typeof digest === 'string' && SHA256_DIGEST_REGEX.test(digest);
}

export function sha256Hex(content: string | Uint8Array): string {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

export interface ProvenanceClaimMeta {
  readonly schemaVersion: typeof PROVENANCE_SCHEMA_VERSION;
  readonly provenanceId: string;
  readonly keyId: string;
  readonly issuer: typeof PROVENANCE_ISSUER;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly nonce: string;
}

export function buildCanonicalProvenancePayload(
  subject: ProvenanceSubject,
  meta: ProvenanceClaimMeta,
): string {
  const normalizedTargetIds = [...(subject.targetIds ?? [])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const normalizedDiagnostics = (subject.diagnostics ?? []).map((d) => ({
    severity: d.severity,
    message: d.message,
    line: d.line ?? null,
    column: d.column ?? null,
  }));
  const normalizedAxiomAudit = subject.axiomAudit
    ? {
        status: subject.axiomAudit.status,
        observedAxioms: [...subject.axiomAudit.observedAxioms].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
        allowedAxioms: [...subject.axiomAudit.allowedAxioms].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
        violations: [...(subject.axiomAudit.violations ?? [])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      }
    : null;

  const claimEnvelope = {
    schemaVersion: meta.schemaVersion,
    provenanceId: meta.provenanceId,
    keyId: meta.keyId,
    issuer: meta.issuer,
    issuedAt: meta.issuedAt,
    expiresAt: meta.expiresAt,
    nonce: meta.nonce,
    requestId: subject.requestId,
    engine: subject.engine,
    sourceDigest: normalizeSha256(subject.sourceDigest),
    contextDigest: subject.contextDigest ?? null,
    manifestDigest: subject.manifestDigest ?? subject.contextDigest ?? subject.sourceDigest,
    toolchain: subject.toolchain ?? '',
    imageDigest: subject.imageDigest ?? 'unknown-image',
    targetIds: normalizedTargetIds,
    outcome: subject.outcome,
    exitCode: subject.exitCode,
    diagnostics: normalizedDiagnostics,
    axiomAudit: normalizedAxiomAudit,
  };

  return canonicalizeJsonJcs(claimEnvelope);
}

function selectVerificationKey(keyId: string, keyRing: ProvenanceKeyRing): ProvenanceKey | null {
  if (keyRing.active.keyId === keyId) {
    return keyRing.active;
  }
  if (keyRing.previous && keyRing.previous.keyId === keyId) {
    return keyRing.previous;
  }
  return null;
}

export interface VerifyProvenanceOptions {
  readonly nowMs?: number;
  readonly keyRing?: ProvenanceKeyRing;
}

export function verifyServerExecutionProvenance(
  subject: ProvenanceSubject,
  provenance: ServerExecutionProvenance | undefined,
  options?: VerifyProvenanceOptions | number,
): { valid: boolean; reason?: string } {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const normalizedOpts: VerifyProvenanceOptions =
    typeof options === 'number' ? { nowMs: options } : (options ?? {});

  // Production security lock: ignore test-supplied keyRing and clock overrides in production.
  const nowMs = isProduction ? Date.now() : (normalizedOpts.nowMs ?? Date.now());

  let keyRing: ProvenanceKeyRing;
  try {
    keyRing = isProduction
      ? resolveServerProvenanceKeyRing(process.env)
      : (normalizedOpts.keyRing ?? resolveServerProvenanceKeyRing(process.env));
  } catch (err: unknown) {
    return { valid: false, reason: err instanceof Error ? err.message : 'Provenance key configuration invalid.' };
  }

  if (!provenance) {
    return { valid: false, reason: 'Missing server execution provenance.' };
  }
  if (provenance.schemaVersion !== PROVENANCE_SCHEMA_VERSION) {
    return { valid: false, reason: `Unsupported provenance schemaVersion: ${String(provenance.schemaVersion)}.` };
  }
  if (provenance.issuer !== PROVENANCE_ISSUER) {
    return { valid: false, reason: 'Invalid provenance issuer.' };
  }
  if (subject.engine !== 'kimina' && subject.engine !== 'lake') {
    return { valid: false, reason: `Non-kernel engine "${subject.engine}" cannot hold server provenance.` };
  }
  if (provenance.engine !== subject.engine) {
    return { valid: false, reason: `Provenance engine mismatch: expected ${subject.engine}, got ${provenance.engine}.` };
  }
  if (!provenance.provenanceId || !provenance.nonce || provenance.nonce.length < 16) {
    return { valid: false, reason: 'Invalid or insufficient provenanceId/nonce.' };
  }

  const issuedMs = Date.parse(provenance.issuedAt);
  const expiresMs = Date.parse(provenance.expiresAt);
  if (Number.isNaN(issuedMs) || Number.isNaN(expiresMs)) {
    return { valid: false, reason: 'Invalid provenance issuedAt/expiresAt timestamp.' };
  }
  if (expiresMs <= issuedMs || expiresMs - issuedMs > PROVENANCE_MAX_AGE_MS + 1000) {
    return { valid: false, reason: 'Invalid provenance validity window.' };
  }
  if (nowMs > expiresMs || nowMs - issuedMs > PROVENANCE_MAX_AGE_MS) {
    return { valid: false, reason: 'Stale server execution provenance (replay window exceeded).' };
  }
  if (issuedMs - nowMs > PROVENANCE_MAX_CLOCK_SKEW_MS) {
    return { valid: false, reason: 'Future-dated server execution provenance rejected.' };
  }

  const verificationKey = selectVerificationKey(provenance.keyId, keyRing);
  if (!verificationKey) {
    return { valid: false, reason: `Unknown or retired provenance keyId "${provenance.keyId}".` };
  }

  const canonicalPayload = buildCanonicalProvenancePayload(
    {
      ...subject,
      imageDigest: subject.imageDigest ?? provenance.imageDigest,
      manifestDigest: subject.manifestDigest ?? provenance.manifestDigest,
    },
    {
      schemaVersion: provenance.schemaVersion,
      provenanceId: provenance.provenanceId,
      keyId: provenance.keyId,
      issuer: provenance.issuer,
      issuedAt: provenance.issuedAt,
      expiresAt: provenance.expiresAt,
      nonce: provenance.nonce,
    },
  );

  const expectedSig = crypto
    .createHmac('sha256', verificationKey.secret)
    .update(canonicalPayload)
    .digest('hex');

  if (!/^[a-f0-9]+$/i.test(provenance.signature) || provenance.signature.length !== expectedSig.length) {
    return { valid: false, reason: 'Provenance signature format or length mismatch.' };
  }

  const sigMatch = crypto.timingSafeEqual(
    Buffer.from(provenance.signature.toLowerCase(), 'utf8'),
    Buffer.from(expectedSig.toLowerCase(), 'utf8'),
  );
  if (!sigMatch) {
    return { valid: false, reason: 'Invalid server execution provenance HMAC signature.' };
  }

  return { valid: true };
}

/**
 * Bounded single-instance anti-replay store tracking both provenanceId and (engine, nonce) pairs
 * with deterministic TTL pruning.
 *
 * Deployment Constraint: Safe for single Node instance deployment; multi-instance horizontal scaling
 * requires an external atomic store (e.g. Redis SET NX PX), enforced at startup via resolveServerProvenanceKeyRing().
 */
export class SingleInstanceAtomicReplayStore {
  private readonly consumedIds = new Map<string, number>();
  private readonly consumedNonces = new Map<string, number>();
  private readonly maxEntries: number;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
  }

  private pruneExpired(nowMs: number): void {
    for (const [id, exp] of this.consumedIds.entries()) {
      if (exp <= nowMs) {
        this.consumedIds.delete(id);
      }
    }
    for (const [nonceKey, exp] of this.consumedNonces.entries()) {
      if (exp <= nowMs) {
        this.consumedNonces.delete(nonceKey);
      }
    }
    while (this.consumedIds.size > this.maxEntries) {
      const oldestKey = this.consumedIds.keys().next().value;
      if (oldestKey === undefined) break;
      this.consumedIds.delete(oldestKey);
    }
    while (this.consumedNonces.size > this.maxEntries) {
      const oldestNonce = this.consumedNonces.keys().next().value;
      if (oldestNonce === undefined) break;
      this.consumedNonces.delete(oldestNonce);
    }
  }

  tryConsumePair(
    kiminaProv: ServerExecutionProvenance,
    lakeProv: ServerExecutionProvenance,
    nowMs = Date.now(),
  ): { ok: true } | { ok: false; reason: string } {
    this.pruneExpired(nowMs);

    if (kiminaProv.provenanceId === lakeProv.provenanceId) {
      return { ok: false, reason: 'Provenance ID collision between Kimina and Lake.' };
    }
    const kNonceKey = `${kiminaProv.engine}:${kiminaProv.nonce}`;
    const lNonceKey = `${lakeProv.engine}:${lakeProv.nonce}`;
    if (kNonceKey === lNonceKey) {
      return { ok: false, reason: 'Provenance nonce collision.' };
    }

    if (
      this.consumedIds.has(kiminaProv.provenanceId) ||
      this.consumedIds.has(lakeProv.provenanceId) ||
      this.consumedNonces.has(kNonceKey) ||
      this.consumedNonces.has(lNonceKey)
    ) {
      return { ok: false, reason: 'Provenance replay detected.' };
    }

    const kExp = Math.max(Date.parse(kiminaProv.expiresAt) || 0, nowMs + PROVENANCE_MAX_AGE_MS);
    const lExp = Math.max(Date.parse(lakeProv.expiresAt) || 0, nowMs + PROVENANCE_MAX_AGE_MS);

    this.consumedIds.set(kiminaProv.provenanceId, kExp);
    this.consumedIds.set(lakeProv.provenanceId, lExp);
    this.consumedNonces.set(kNonceKey, kExp);
    this.consumedNonces.set(lNonceKey, lExp);

    return { ok: true };
  }
}

export const serverReplayStore = new SingleInstanceAtomicReplayStore();

/**
 * Containment guard against path traversal, null bytes, absolute path injection, and symlink escapes.
 */
export function assertPathContained(rootDir: string, relativePath: string): string {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('PATH_TRAVERSAL_REJECTED: Empty file path.');
  }
  if (relativePath.includes('\0')) {
    throw new Error('PATH_TRAVERSAL_REJECTED: Null byte detected in path.');
  }
  if (path.isAbsolute(relativePath) || /^[a-zA-Z]:/.test(relativePath)) {
    throw new Error(`PATH_TRAVERSAL_REJECTED: Absolute path prohibited ("${relativePath}").`);
  }

  const normalizedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(normalizedRoot, relativePath);
  const rel = path.relative(normalizedRoot, resolvedTarget);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`PATH_TRAVERSAL_REJECTED: Path escapes workspace root ("${relativePath}").`);
  }

  if (fs.existsSync(normalizedRoot)) {
    const realRoot = fs.realpathSync(normalizedRoot);
    let checkPath = resolvedTarget;
    while (!fs.existsSync(checkPath) && checkPath !== normalizedRoot && checkPath !== path.dirname(checkPath)) {
      checkPath = path.dirname(checkPath);
    }
    if (fs.existsSync(checkPath)) {
      const realCheck = fs.realpathSync(checkPath);
      const realRel = path.relative(realRoot, realCheck);
      if (realRel.startsWith('..') || path.isAbsolute(realRel)) {
        throw new Error(`PATH_TRAVERSAL_REJECTED: Symlink escape detected ("${relativePath}").`);
      }
    }
  }

  return resolvedTarget;
}
