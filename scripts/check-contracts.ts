/**
 * Contracts Parity Check Script (Phase 14.9.9.1 + Phase 15 Stabilization)
 *
 * Validates that BOTH generated contract artifacts stay in strict sync with canonical Zod schemas:
 * 1. schemas/generated_contracts.py (Pydantic v2 strict models)
 * 2. schemas/openapi.json (OpenAPI 3.1.0 REST specification + RFC 9457 ProblemDetails)
 */

import fs from 'node:fs';
import path from 'node:path';
import { generatePythonContracts } from './generate-contracts';
import { generateOpenApiSpec } from './generate-openapi';
import { CertificationTierSchema, ProofOutcomeSchema } from '../src/contracts';

function main(): void {
  console.log('Running contract parity check (Zod -> Pydantic + OpenAPI 3.1)...');

  // 1. Verify Zod schemas
  const tiers = CertificationTierSchema.options;
  if (!tiers.includes('NUMERIC_CERTIFICATE_UNVERIFIED')) {
    console.error('❌ Zod CertificationTierSchema missing NUMERIC_CERTIFICATE_UNVERIFIED');
    process.exit(1);
  }
  if (typeof ProofOutcomeSchema.safeParse !== 'function') {
    console.error('❌ Zod ProofOutcomeSchema invalid');
    process.exit(1);
  }

  // 2. Verify Pydantic sync
  const expectedPython = generatePythonContracts();
  const targetPath = path.resolve(process.cwd(), 'schemas/generated_contracts.py');

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ ${targetPath} does not exist`);
    process.exit(1);
  }

  const diskPython = fs.readFileSync(targetPath, 'utf-8');

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

  // 3. Verify OpenAPI 3.1 sync
  const openApiPath = path.resolve(process.cwd(), 'schemas/openapi.json');
  if (!fs.existsSync(openApiPath)) {
    console.error(`❌ ${openApiPath} does not exist. Run "npm run contracts:generate".`);
    process.exit(1);
  }

  const expectedOpenApi = `${JSON.stringify(generateOpenApiSpec(), null, 2)}\n`;
  const diskOpenApi = fs.readFileSync(openApiPath, 'utf-8');

  if (diskOpenApi !== expectedOpenApi) {
    console.error('❌ schemas/openapi.json is out of sync with canonical Zod contracts.');
    console.error('Run "npm run contracts:generate" to synchronize.');
    process.exit(1);
  }

  console.log('✓ Contract parity check passed: Zod, Pydantic v2, and OpenAPI 3.1.0 schemas are in full sync.');
  process.exit(0);
}

main();
