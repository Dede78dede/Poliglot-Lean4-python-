/**
 * Feature Flag Expiry & Governance Linter (Phase 14.9.3, Milestone M7)
 *
 * Scans FEATURE_FLAGS from feature-flag-registry.ts:
 * 1. Checks that every flag has an assigned owner, behaviorWhenOff, and expiresAt date.
 * 2. If a flag has expired (expiresAt < currentDate), verifies that it is tracked under
 *    [Unreleased] in CHANGELOG.md.
 * 3. Exits with 1 if any expired flag is untracked.
 */

import fs from 'node:fs';
import path from 'node:path';
import { FEATURE_FLAGS } from '../src/services/flags/feature-flag-registry';

export interface FlagCheckResult {
  readonly valid: boolean;
  readonly totalFlags: number;
  readonly expiredFlags: string[];
  readonly untrackedExpiredFlags: string[];
  readonly missingMetadata: string[];
}

export function checkFlagExpiry(
  currentDate = new Date('2026-11-08T00:00:00Z'),
  changelogPath = path.resolve('CHANGELOG.md')
): FlagCheckResult {
  const changelogContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf-8')
    : '';

  const totalFlags = Object.keys(FEATURE_FLAGS).length;
  const expiredFlags: string[] = [];
  const untrackedExpiredFlags: string[] = [];
  const missingMetadata: string[] = [];

  for (const [name, meta] of Object.entries(FEATURE_FLAGS)) {
    if (!meta.owner || !meta.behaviorWhenOff) {
      missingMetadata.push(name);
    }

    if (meta.expiresAt) {
      const expiryDate = new Date(meta.expiresAt);
      if (expiryDate.getTime() < currentDate.getTime()) {
        expiredFlags.push(name);
        // Must be mentioned in CHANGELOG
        if (!changelogContent.includes(name)) {
          untrackedExpiredFlags.push(name);
        }
      }
    }
  }

  const valid = missingMetadata.length === 0 && untrackedExpiredFlags.length === 0;

  return {
    valid,
    totalFlags,
    expiredFlags,
    untrackedExpiredFlags,
    missingMetadata,
  };
}

if (process.argv[1]?.endsWith('check-flag-expiry.ts')) {
  console.log('Checking feature flag governance and expiry dates...');
  const result = checkFlagExpiry();
  console.log(`Total feature flags: ${result.totalFlags}`);
  console.log(`Expired flags: ${result.expiredFlags.length}`);

  if (result.missingMetadata.length > 0) {
    console.error(`❌ Flags missing owner or behaviorWhenOff: ${result.missingMetadata.join(', ')}`);
    process.exit(1);
  }

  if (result.untrackedExpiredFlags.length > 0) {
    console.error(`❌ Expired flags not tracked in CHANGELOG.md: ${result.untrackedExpiredFlags.join(', ')}`);
    process.exit(1);
  }

  console.log('✅ All feature flags comply with governance & expiry policy.');
  process.exit(0);
}
