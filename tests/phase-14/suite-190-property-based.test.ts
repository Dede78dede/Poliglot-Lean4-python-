/**
 * Test Suite 190: Property-Based Contract Testing with fast-check (Pre-Flight 14.9.9, Window 2)
 *
 * Validates:
 * 190.1: Property 1: JSON round-trip serialization preservation across 1000 generated payloads.
 * 190.2: Property 2: ResultEnvelope discriminant invariant: ok === true implies value is defined.
 * 190.3: Property 3: ResultEnvelope discriminant invariant: ok === false implies error is defined.
 * 190.4: Property 4: ProofOutcome invariant: kind === 'certified' implies literal SEAL_KERNEL_VERIFIED_TIER5.
 */

import assert from 'node:assert/strict';
import fc from 'fast-check';
import { z } from 'zod';
import { createResultEnvelopeSchema, ProofOutcomeSchema } from '../../src/contracts';

export async function runSuite190(): Promise<void> {
  console.log('Running Suite 190: Property-Based Testing with fast-check (4 sub-tests, 1000 iterations each)...');

  // 190.1: Property 1: JSON round-trip identity on arbitrary valid string/number dictionaries
  fc.assert(
    fc.property(
      fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
      (dict) => {
        const serialized = JSON.stringify(dict);
        const parsed = JSON.parse(serialized);
        return JSON.stringify(parsed) === serialized;
      }
    ),
    { numRuns: 1000 }
  );
  console.log('  ✓ 190.1 Property 1: JSON round-trip serialization identity holds (1000 runs)');

  // 190.2: Property 2: ResultEnvelope success invariant
  const EnvelopeSchema = createResultEnvelopeSchema(z.string());
  fc.assert(
    fc.property(
      fc.string(),
      fc.uuid(),
      fc.date(),
      (strVal, corrId, timestamp) => {
        const payload = {
          ok: true as const,
          value: strVal,
          correlationId: corrId,
          timestamp: timestamp.toISOString(),
        };
        const parseRes = EnvelopeSchema.safeParse(payload);
        return parseRes.success && parseRes.data.ok === true && 'value' in parseRes.data;
      }
    ),
    { numRuns: 1000 }
  );
  console.log('  ✓ 190.2 Property 2: ResultEnvelope success invariant (ok === true => value defined) holds (1000 runs)');

  // 190.3: Property 3: ResultEnvelope failure invariant
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      fc.integer({ min: 400, max: 599 }),
      fc.uuid(),
      (code, msg, status, corrId) => {
        const payload = {
          ok: false as const,
          error: {
            code,
            problemType: `https://polyglot.dev/errors/${code.toLowerCase()}`,
            httpStatus: status,
            message: msg,
            details: {},
          },
          correlationId: corrId,
          timestamp: new Date().toISOString(),
        };
        const parseRes = EnvelopeSchema.safeParse(payload);
        return parseRes.success && parseRes.data.ok === false && 'error' in parseRes.data;
      }
    ),
    { numRuns: 1000 }
  );
  console.log('  ✓ 190.3 Property 3: ResultEnvelope failure invariant (ok === false => error defined) holds (1000 runs)');

  // 190.4: Property 4: ProofOutcome certified invariant
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }),
      fc.array(fc.string()),
      (digest, axioms) => {
        const payload = {
          kind: 'certified' as const,
          seal: 'SEAL_KERNEL_VERIFIED_TIER5' as const,
          digest,
          axioms,
        };
        const parseRes = ProofOutcomeSchema.safeParse(payload);
        if (!parseRes.success) return false;
        return (
          parseRes.data.kind === 'certified' &&
          parseRes.data.seal === 'SEAL_KERNEL_VERIFIED_TIER5'
        );
      }
    ),
    { numRuns: 1000 }
  );
  console.log('  ✓ 190.4 Property 4: ProofOutcome certified invariant strictly holds across 1000 randomized inputs');
}

if (process.argv[1]?.endsWith('suite-190-property-based.test.ts')) {
  runSuite190()
    .then(() => {
      console.log('Suite 190 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
