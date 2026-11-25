/**
 * Test-Only JCS Provenance Signing Harness
 *
 * Strictly isolated in tests/ — NEVER imported by src/ or server/src/ production bundles.
 * Refuses execution if NODE_ENV === 'production'.
 */

import crypto from 'node:crypto';
import type { EngineEvidence } from '../../../server/src/services/verification/hybrid-adjudicator';
import {
  PROVENANCE_ISSUER,
  PROVENANCE_MAX_AGE_MS,
  PROVENANCE_SCHEMA_VERSION,
  buildCanonicalProvenancePayload,
  resolveServerProvenanceKeyRing,
  type ProvenanceKeyRing,
  type ServerExecutionProvenance,
} from '../../../server/src/services/verification/server-provenance';

export interface TestSignOptions {
  readonly keyRing?: ProvenanceKeyRing;
  readonly keyIdOverride?: string;
  readonly issuedAtMs?: number;
  readonly expiresAtMs?: number;
  readonly provenanceId?: string;
  readonly nonce?: string;
}

export function attachTestProvenance(
  evidence: Omit<EngineEvidence, 'provenance'> & { readonly engine: 'kimina' | 'lake' },
  options: TestSignOptions = {},
): EngineEvidence {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('CRITICAL SECURITY VIOLATION: Test provenance harness is forbidden in production.');
  }

  const keyRing = options.keyRing ?? resolveServerProvenanceKeyRing(process.env);
  const nowMs = options.issuedAtMs ?? Date.now();
  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(options.expiresAtMs ?? nowMs + PROVENANCE_MAX_AGE_MS).toISOString();
  const provenanceId = options.provenanceId ?? `prov-${crypto.randomUUID()}`;
  const nonce = options.nonce ?? crypto.randomBytes(16).toString('hex');
  const keyId = options.keyIdOverride ?? keyRing.active.keyId;
  const imageDigest = evidence.imageDigest ?? `${evidence.engine}-server-v1`;
  const manifestDigest = evidence.manifestDigest ?? evidence.contextDigest ?? evidence.sourceDigest;

  const payload = buildCanonicalProvenancePayload(
    {
      ...evidence,
      imageDigest,
      manifestDigest,
    },
    {
      schemaVersion: PROVENANCE_SCHEMA_VERSION,
      provenanceId,
      keyId,
      issuer: PROVENANCE_ISSUER,
      issuedAt,
      expiresAt,
      nonce,
    },
  );

  const signingKey =
    keyRing.previous && keyRing.previous.keyId === keyId
      ? keyRing.previous.secret
      : keyRing.active.secret;

  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(payload)
    .digest('hex');

  const provenance: ServerExecutionProvenance = {
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    provenanceId,
    keyId,
    issuer: PROVENANCE_ISSUER,
    signature,
    issuedAt,
    expiresAt,
    nonce,
    engine: evidence.engine,
    imageDigest,
    manifestDigest,
  };

  return {
    ...evidence,
    provenance,
  };
}
