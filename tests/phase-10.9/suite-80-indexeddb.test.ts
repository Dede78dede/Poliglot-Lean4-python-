import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DATABASE_VERSIONS,
  schemaMigrationManager,
  type MigrationStep,
} from '../../src/services/storage/schema-migration';

export async function runSuite80(): Promise<void> {
  console.log('\n--- Test Suite 80: IndexedDB Schema Versioning Framework ---');

  // 80.1: All 6 databases have tracked schemaVersion equal to 1
  assert.equal(DATABASE_VERSIONS['polyglot-vfs-db'], 1);
  assert.equal(DATABASE_VERSIONS['polyglot-projects'], 1);
  assert.equal(DATABASE_VERSIONS['polyglot-token-vault'], 1);
  assert.equal(DATABASE_VERSIONS['polyglot-bibliography'], 1);
  assert.equal(DATABASE_VERSIONS['polyglot-audit-log'], 1);
  assert.equal(DATABASE_VERSIONS['polyglot-feature-flags'], 1);
  console.log('  ✓ 80.1 All 6 client IndexedDB databases have explicit version 1 tracking');

  // 80.2: Migration framework rejects non-sequential version jumps
  assert.throws(
    () => {
      schemaMigrationManager.registerStep({
        dbName: 'polyglot-projects',
        fromVersion: 1,
        toVersion: 3, // Skipped 2!
        description: 'Illegal multi-version jump',
        apply: () => {},
      });
    },
    /must increment by 1/
  );
  console.log('  ✓ 80.2 Migration framework strictly enforces sequential version increments (fromVersion + 1)');

  // 80.3: Migration step registration and reversible rollback verification
  let appliedStoreName = '';
  let rolledBackStoreName = '';
  const mockDb = {
    name: 'polyglot-bibliography',
    createObjectStore: (name: string) => {
      appliedStoreName = name;
    },
    deleteObjectStore: (name: string) => {
      rolledBackStoreName = name;
    },
  } as unknown as IDBDatabase;

  const validStep: MigrationStep = {
    dbName: 'polyglot-bibliography',
    fromVersion: 1,
    toVersion: 2,
    description: 'Add CSL style indices store',
    apply: (db) => db.createObjectStore('csl_indices'),
    rollback: (db) => db.deleteObjectStore('csl_indices'),
  };

  schemaMigrationManager.registerStep(validStep);
  schemaMigrationManager.applyPendingSteps(mockDb, 1, 2);
  assert.equal(appliedStoreName, 'csl_indices');

  schemaMigrationManager.rollbackStep(mockDb, validStep);
  assert.equal(rolledBackStoreName, 'csl_indices');
  console.log('  ✓ 80.3 Migration step applies cleanly and verifies testable rollback execution');

  // 80.4: docs/architecture/indexeddb-migrations.md is present and documents Phase 11
  const idbDoc = fs.readFileSync('docs/architecture/indexeddb-migrations.md', 'utf-8');
  assert.ok(idbDoc.includes('polyglot-feature-flags'));
  assert.ok(idbDoc.includes('Phase 11 Forward Path'));
  console.log('  ✓ 80.4 docs/architecture/indexeddb-migrations.md documents version registry & Phase 11 forward plan');
}
