/**
 * Feature Flag Expiry & Governance Linter (Phase 14.9.3 / ADR-019 / Phase 15)
 *
 * Scans FEATURE_FLAGS from feature-flag-registry.ts:
 * 1. Checks that every flag has owner, phase, category, behaviorWhenOff, createdAt, expiresAt, description.
 * 2. Evaluates expiry against live `new Date()` (no frozen historical clock).
 * 3. In --strict mode:
 *    - Fails on any expired flag (even if mentioned in CHANGELOG) or missing metadata.
 *    - Enforces all `category === 'experiment'` flags default to `false`.
 *    - Enforces ADR-019 180-day maximum TTL on non-grandfathered flags.
 */

import fs from 'node:fs';
import path from 'node:path';
import { FEATURE_FLAGS } from '../src/services/flags/feature-flag-registry';

const GRANDFATHER_EXPIRY_ISO = '2027-12-31T00:00:00Z';
const ADR019_CUTOFF_MS = Date.parse('2026-11-11T00:00:00Z');
const MAX_NEW_FLAG_TTL_DAYS = 180;

export interface FlagCheckResult {
  readonly valid: boolean;
  readonly totalFlags: number;
  readonly expiredFlags: string[];
  readonly untrackedExpiredFlags: string[];
  readonly missingMetadata: string[];
  readonly nonDefaultOffExperiments: string[];
  readonly ttlViolations: string[];
}

export function checkFlagExpiry(
  currentDate = new Date(),
  changelogPath = path.resolve('CHANGELOG.md'),
  options?: { readonly strict?: boolean }
): FlagCheckResult {
  const strict = options?.strict ?? false;
  const changelogContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf-8')
    : '';

  const totalFlags = Object.keys(FEATURE_FLAGS).length;
  const expiredFlags: string[] = [];
  const untrackedExpiredFlags: string[] = [];
  const missingMetadata: string[] = [];
  const nonDefaultOffExperiments: string[] = [];
  const ttlViolations: string[] = [];

  for (const [name, meta] of Object.entries(FEATURE_FLAGS)) {
    if (
      !meta.owner ||
      !meta.phase ||
      !meta.category ||
      !meta.behaviorWhenOff ||
      !meta.createdAt ||
      !meta.expiresAt ||
      !meta.description
    ) {
      missingMetadata.push(name);
    }

    if (meta.category === 'experiment' && meta.default !== false) {
      nonDefaultOffExperiments.push(name);
    }

    const createdMs = Date.parse(meta.createdAt);
    const expiryMs = Date.parse(meta.expiresAt);
    if (Number.isNaN(createdMs) || Number.isNaN(expiryMs)) {
      if (!missingMetadata.includes(name)) missingMetadata.push(name);
      continue;
    }

    const isGrandfathered =
      createdMs <= ADR019_CUTOFF_MS && meta.expiresAt === GRANDFATHER_EXPIRY_ISO;
    if (!isGrandfathered) {
      const ttlDays = (expiryMs - createdMs) / (1000 * 60 * 60 * 24);
      if (ttlDays <= 0 || ttlDays > MAX_NEW_FLAG_TTL_DAYS) {
        ttlViolations.push(`${name} (${ttlDays.toFixed(1)}d)`);
      }
    }

    if (expiryMs < currentDate.getTime()) {
      expiredFlags.push(name);
      if (!changelogContent.includes(name)) {
        untrackedExpiredFlags.push(name);
      }
    }
  }

  const valid =
    missingMetadata.length === 0 &&
    untrackedExpiredFlags.length === 0 &&
    (!strict ||
      (expiredFlags.length === 0 &&
        nonDefaultOffExperiments.length === 0 &&
        ttlViolations.length === 0));

  return {
    valid,
    totalFlags,
    expiredFlags,
    untrackedExpiredFlags,
    missingMetadata,
    nonDefaultOffExperiments,
    ttlViolations,
  };
}

if (process.argv[1]?.endsWith('check-flag-expiry.ts')) {
  const strict = process.argv.includes('--strict');
  const now = new Date();
  console.log(
    `Checking feature flag governance and expiry dates (${now.toISOString()}, strict=${strict})...`
  );
  const result = checkFlagExpiry(now, path.resolve('CHANGELOG.md'), { strict });
  console.log(`Total feature flags: ${result.totalFlags}`);
  console.log(`Expired flags: ${result.expiredFlags.length}`);

  if (result.missingMetadata.length > 0) {
    console.error(`❌ Flags missing required metadata: ${result.missingMetadata.join(', ')}`);
    process.exit(1);
  }

  if (result.nonDefaultOffExperiments.length > 0) {
    console.error(
      `❌ Experimental flags must default to false: ${result.nonDefaultOffExperiments.join(', ')}`
    );
    if (strict) process.exit(1);
  }

  if (result.ttlViolations.length > 0) {
    console.error(
      `❌ Non-grandfathered flags exceed ADR-019 180-day TTL: ${result.ttlViolations.join(', ')}`
    );
    if (strict) process.exit(1);
  }

  if (strict && result.expiredFlags.length > 0) {
    console.error(`❌ Expired flags in strict mode: ${result.expiredFlags.join(', ')}`);
    process.exit(1);
  }

  if (result.untrackedExpiredFlags.length > 0) {
    console.error(
      `❌ Expired flags not tracked in CHANGELOG.md: ${result.untrackedExpiredFlags.join(', ')}`
    );
    process.exit(1);
  }

  console.log('✅ All feature flags comply with governance & expiry policy.');
  process.exit(0);
}
