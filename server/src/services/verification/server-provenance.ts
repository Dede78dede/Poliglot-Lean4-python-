import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PROVENANCE_MAX_AGE_MS = 5 * 60_000;
export const PROVENANCE_MAX_CLOCK_SKEW_MS = 30_000;
export const SHA256_DIGEST_REGEX = /^(?:sha256:)?[a-f0-9]{64}$/i;

export interface ServerExecutionProvenance {
  readonly provenanceId: string;
  readonly issuer: 'polyglot-server-executor';
  readonly signature: string;
  readonly issuedAt: string;
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
  readonly outcome: string;
  readonly exitCode: number | null;
}

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getProvenanceKey(): string {
  const configured = typeof process !== 'undefined' ? process.env['POLYGLOT_PROVENANCE_SECRET'] : undefined;
  return `${configured ?? ''}:${EPHEMERAL_SECRET}`;
}

function buildCanonicalPayload(subject: ProvenanceSubject, issuedAt: string, nonce: string): string {
  return [
    subject.requestId,
    subject.engine,
    subject.sourceDigest,
    subject.contextDigest ?? '',
    subject.manifestDigest ?? subject.imageDigest ?? '',
    subject.toolchain ?? '',
    subject.imageDigest ?? 'unknown-image',
    subject.outcome,
    subject.exitCode === null ? 'null' : String(subject.exitCode),
    issuedAt,
    nonce,
  ].join('|');
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

export function mintServerExecutionProvenance(
  subject: ProvenanceSubject & { readonly engine: 'kimina' | 'lake' },
): ServerExecutionProvenance {
  const issuedAt = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const imageDigest = subject.imageDigest ?? `${subject.engine}-server-v1`;
  const manifestDigest = subject.manifestDigest ?? subject.contextDigest ?? subject.sourceDigest;
  const payload = buildCanonicalPayload(
    { ...subject, imageDigest, manifestDigest },
    issuedAt,
    nonce,
  );
  const signature = crypto
    .createHmac('sha256', getProvenanceKey())
    .update(payload)
    .digest('hex');

  return {
    provenanceId: `prov-${crypto.randomUUID()}`,
    issuer: 'polyglot-server-executor',
    signature,
    issuedAt,
    nonce,
    engine: subject.engine,
    imageDigest,
    manifestDigest,
  };
}

export function verifyServerExecutionProvenance(
  subject: ProvenanceSubject,
  provenance: ServerExecutionProvenance | undefined,
  nowMs = Date.now(),
): { valid: boolean; reason?: string } {
  if (!provenance) {
    return { valid: false, reason: 'Missing server execution provenance.' };
  }
  if (provenance.issuer !== 'polyglot-server-executor') {
    return { valid: false, reason: 'Invalid provenance issuer.' };
  }
  if (subject.engine !== 'kimina' && subject.engine !== 'lake') {
    return { valid: false, reason: `Non-kernel engine "${subject.engine}" cannot hold server provenance.` };
  }
  if (provenance.engine !== subject.engine) {
    return { valid: false, reason: `Provenance engine mismatch: expected ${subject.engine}, got ${provenance.engine}.` };
  }
  const issuedMs = Date.parse(provenance.issuedAt);
  if (Number.isNaN(issuedMs)) {
    return { valid: false, reason: 'Invalid provenance timestamp.' };
  }
  if (nowMs - issuedMs > PROVENANCE_MAX_AGE_MS) {
    return { valid: false, reason: 'Stale server execution provenance (replay window exceeded).' };
  }
  if (issuedMs - nowMs > PROVENANCE_MAX_CLOCK_SKEW_MS) {
    return { valid: false, reason: 'Future-dated server execution provenance rejected.' };
  }

  const expectedPayload = buildCanonicalPayload(
    {
      ...subject,
      imageDigest: subject.imageDigest ?? provenance.imageDigest,
      manifestDigest: subject.manifestDigest ?? provenance.manifestDigest,
    },
    provenance.issuedAt,
    provenance.nonce,
  );
  const expectedSig = crypto
    .createHmac('sha256', getProvenanceKey())
    .update(expectedPayload)
    .digest('hex');

  if (provenance.signature.length !== expectedSig.length) {
    return { valid: false, reason: 'Provenance signature length mismatch.' };
  }
  const sigMatch = crypto.timingSafeEqual(
    Buffer.from(provenance.signature, 'utf8'),
    Buffer.from(expectedSig, 'utf8'),
  );
  if (!sigMatch) {
    return { valid: false, reason: 'Invalid server execution provenance HMAC signature.' };
  }

  return { valid: true };
}

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
