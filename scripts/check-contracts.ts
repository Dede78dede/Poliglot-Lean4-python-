/**
 * Contracts Parity Check Script (Phase 14.9.9.1, D1.2)
 *
 * Validates that schemas/generated_contracts.py is in sync with src/contracts/index.ts
 * and that both layers define NUMERIC_CERTIFICATE_UNVERIFIED and ProofOutcome variants.
 */

import fs from 'node:fs';
import path from 'node:path';
import { generatePythonContracts } from './generate-contracts';
import { CertificationTierSchema, ProofOutcomeSchema } from '../src/contracts';

function main(): void {
  console.log('Running contract parity check...');

  // 1. Verify Zod schemas
  const tiers = CertificationTierSchema.options;
  if (!tiers.includes('NUMERIC_CERTIFICATE_UNVERIFIED')) {
    console.error('❌ Zod CertificationTierSchema missing NUMERIC_CERTIFICATE_UNVERIFIED');
    process.exit(1);
  }

  // 2. Generate expected python code and compare with existing on disk
  const expectedPython = generatePythonContracts();
  const targetPath = path.resolve(process.cwd(), 'schemas/generated_contracts.py');

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ ${targetPath} does not exist`);
    process.exit(1);
  }

  const diskPython = fs.readFileSync(targetPath, 'utf-8');

  // Verify key invariants in disk python
  if (!diskPython.includes("'NUMERIC_CERTIFICATE_UNVERIFIED'")) {
    console.error('❌ schemas/generated_contracts.py missing NUMERIC_CERTIFICATE_UNVERIFIED');
    process.exit(1);
  }

  if (!diskPython.includes('class ProofOutcomeNumericCertificate')) {
    console.error('❌ schemas/generated_contracts.py missing ProofOutcomeNumericCertificate');
    process.exit(1);
  }

  if (diskPython !== expectedPython) {
    console.error('❌ schemas/generated_contracts.py is out of sync with Zod contracts.');
    console.error('Run "npm run contracts:generate" to synchronize.');
    process.exit(1);
  }

  console.log('✓ Contract parity check passed: Zod and Pydantic schemas are in full sync.');
  process.exit(0);
}

main();
