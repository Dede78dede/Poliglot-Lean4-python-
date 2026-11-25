import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  evaluateFormalVerification,
  containsProofObligation,
} from '../../server/src/services/verification-formula';
import {
  canonicalizeJsonJcs,
  assertPathContained,
  sha256Hex,
  verifyServerExecutionProvenance,
  buildCanonicalProvenancePayload,
  type ServerExecutionProvenance,
  type ProvenanceSubject,
} from '../../server/src/services/verification/server-provenance';
import { ProofOutcomeSchema, CertificationTierSchema } from '../../src/contracts';
import {
  APP_ROLES,
  ROLE_LIST,
  ROLE_PERMISSIONS,
  hasPermission,
  hasRole,
  isValidAppRole,
  type AppRole,
} from '../../src/services/auth/roles';
import { TokenVault } from '../../src/services/auth/token-vault';
import { validateZipEntries } from '../../src/services/zip-validator';
import { evaluateWhenClause } from '../../src/services/when/when-clause';

describe('Property-Based Integrity & Soundness Suite (fast-check)', () => {
  it('5-term formal verification criterion never returns verified=true when simulated, exitCode!=0, sorry, or error present', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -5, max: 5 }),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.string({ minLength: 0, maxLength: 60 }),
        (exitCode, simulated, includeSorry, includeError, body) => {
          const code = includeSorry
            ? `theorem p : True := by sorry`
            : `theorem p : True := trivial\n-- ${body.replace(/\n/g, ' ')}`;
          const stderr = includeError
            ? 'error: failed proof'
            : includeSorry
            ? "warning: declaration uses 'sorry'"
            : '';
          const res = evaluateFormalVerification({
            codeOrFiles: code,
            stdout: '',
            stderr,
            exitCode,
            simulated,
          });
          if (simulated || exitCode !== 0 || includeSorry || includeError) {
            return res.verified === false;
          }
          return res.verified === true;
        }
      ),
      { numRuns: 250 }
    );
  });

  it('containsProofObligation ignores theorem/lemma keywords inside line and block comments', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 40 }).filter((s) => !s.includes('-/')),
        (noise) => {
          const onlyCommented = `-- theorem fake : True := trivial\n/- lemma also_fake : True := trivial ${noise} -/\ndef val : Nat := 1`;
          return containsProofObligation(onlyCommented) === false;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Canonical JCS & HMAC server provenance is invariant to key order and fails closed on any tamper', () => {
    const keySecret = 'test-provenance-hmac-secret-at-least-32-chars-long';
    const keyRing = { active: { keyId: 'k1', secret: keySecret } };

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 60 }),
        fc.boolean(),
        (reqId, sourceCode, tamper) => {
          const nowMs = Date.now();
          const issuedAt = new Date(nowMs - 1000).toISOString();
          const expiresAt = new Date(nowMs + 60_000).toISOString();
          const nonce = crypto.randomBytes(16).toString('hex');
          const provId = `prov-${reqId}`;
          const sourceDigest = sha256Hex(sourceCode);

          const subject: ProvenanceSubject = {
            requestId: reqId,
            engine: 'kimina',
            sourceDigest,
            outcome: 'certified',
            exitCode: 0,
          };

          const payload = buildCanonicalProvenancePayload(subject, {
            schemaVersion: 'polyglot.provenance.v2',
            provenanceId: provId,
            keyId: 'k1',
            issuer: 'polyglot-server-executor',
            issuedAt,
            expiresAt,
            nonce,
          });
          const signature = crypto
            .createHmac('sha256', keySecret)
            .update(payload)
            .digest('hex');

          const provenance: ServerExecutionProvenance = {
            schemaVersion: 'polyglot.provenance.v2',
            provenanceId: provId,
            keyId: 'k1',
            issuer: 'polyglot-server-executor',
            signature,
            issuedAt,
            expiresAt,
            nonce,
            engine: 'kimina',
            imageDigest: 'unknown-image',
            manifestDigest: sourceDigest,
          };

          const checkSubject: ProvenanceSubject = tamper
            ? { ...subject, exitCode: 1 }
            : subject;

          const verification = verifyServerExecutionProvenance(checkSubject, provenance, {
            nowMs,
            keyRing,
          });

          return tamper ? verification.valid === false : verification.valid === true;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('canonicalizeJsonJcs produces identical output regardless of insertion key order', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer(), fc.boolean(), (a, b, c) => {
        const obj1 = { alpha: a, beta: b, gamma: c };
        const obj2 = { gamma: c, alpha: a, beta: b };
        return canonicalizeJsonJcs(obj1) === canonicalizeJsonJcs(obj2);
      }),
      { numRuns: 300 }
    );
  });

  it('ProofOutcome schema guarantees non-certified tiers never satisfy verified=true', () => {
    const nonCertifiedGen = fc.oneof(
      fc.record({
        kind: fc.constant('numeric-certificate' as const),
        certificationTier: fc.constant('NUMERIC_CERTIFICATE_UNVERIFIED' as const),
        verified: fc.constant(true),
        certificate: fc.string(),
        methodUsed: fc.constant('interval' as const),
      }),
      fc.record({
        kind: fc.constant('preflight' as const),
        certificationTier: fc.constant('SYNTAX_ONLY_UNVERIFIED' as const),
        verified: fc.constant(true),
        syntaxValid: fc.boolean(),
        sorryFree: fc.boolean(),
        reason: fc.string(),
      }),
      fc.record({
        kind: fc.constant('unavailable' as const),
        certificationTier: fc.constant('UNAVAILABLE' as const),
        verified: fc.constant(true),
        reason: fc.constant('client_stub' as const),
      })
    );

    fc.assert(
      fc.property(nonCertifiedGen, (forgedOutcome) => {
        return ProofOutcomeSchema.safeParse(forgedOutcome).success === false;
      }),
      { numRuns: 200 }
    );
    expect(CertificationTierSchema.options).toContain('KERNEL_VERIFIED_TIER5');
  });

  it('RBAC permission lattice is strictly monotonic across viewer -> collaborator -> verifier -> admin', () => {
    const rank: Record<AppRole, number> = {
      viewer: 0,
      collaborator: 1,
      verifier: 2,
      admin: 3,
    };

    fc.assert(
      fc.property(
        fc.constantFrom(...ROLE_LIST),
        fc.constantFrom(...ROLE_LIST),
        (r1, r2) => {
          expect(isValidAppRole(r1)).toBe(true);
          expect(hasRole(r1, [r1])).toBe(true);
          if (rank[r1] <= rank[r2]) {
            const p1 = ROLE_PERMISSIONS[r1];
            return p1.every((perm) => hasPermission(r2, perm));
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
    expect(isValidAppRole('superuser')).toBe(false);
    expect(hasRole(undefined, [APP_ROLES.VIEWER])).toBe(false);
    expect(hasPermission(undefined, 'workspace:read')).toBe(false);
  });

  it('assertPathContained rejects every traversal, absolute path, and null-byte injection', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-path-prop-'));
    try {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('/') && !s.includes('\\') && !s.includes('\0') && !s.includes(':') && s !== '.' && s !== '..'),
          (segment) => {
            const ok = assertPathContained(rootDir, `src/${segment}.lean`);
            const escaped = () => assertPathContained(rootDir, `../${segment}`);
            const abs = () => assertPathContained(rootDir, `/etc/${segment}`);
            const nul = () => assertPathContained(rootDir, `a\0${segment}`);
            let escapedThrew = false;
            let absThrew = false;
            let nulThrew = false;
            try { escaped(); } catch { escapedThrew = true; }
            try { abs(); } catch { absThrew = true; }
            try { nul(); } catch { nulThrew = true; }
            return (
              ok.startsWith(path.resolve(rootDir) + path.sep) &&
              escapedThrew &&
              absThrew &&
              nulThrew
            );
          }
        ),
        { numRuns: 150 }
      );
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('TokenVault produces unique hashes and fails closed on revocation for arbitrary token names', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-vault-prop-'));
    try {
      const vault = new TokenVault(path.join(dir, 'vault.json'));
      const seenTokens = new Set<string>();
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 40 }), (name) => {
          const created = vault.createToken(name, undefined, { role: 'verifier' });
          if (seenTokens.has(created.rawToken)) return false;
          seenTokens.add(created.rawToken);
          const before = vault.validateToken(created.rawToken);
          const revoked = vault.revokeToken(created.id);
          const after = vault.validateToken(created.rawToken);
          return before.valid === true && revoked === true && after.valid === false;
        }),
        { numRuns: 60 }
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('zip-validator always rejects traversal and absolute archive entry paths', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('\0')),
        (suffix) => {
          const resTraversal = validateZipEntries(
            [{ path: `foo/../../${suffix}`, uncompressedSize: 10 }],
            10
          );
          const resAbs = validateZipEntries(
            [{ path: `/tmp/${suffix}`, uncompressedSize: 10 }],
            10
          );
          return resTraversal.valid === false && resAbs.valid === false;
        }
      ),
      { numRuns: 150 }
    );
  });

  it('evaluateWhenClause handles double negation and boolean identities consistently', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (a, b) => {
        const ctx = { a, b };
        return (
          evaluateWhenClause('a && b', ctx) === (a && b) &&
          evaluateWhenClause('a || b', ctx) === (a || b) &&
          evaluateWhenClause('!!a', ctx) === a &&
          evaluateWhenClause('!(a && !a)', ctx) === true
        );
      }),
      { numRuns: 200 }
    );
  });
});
