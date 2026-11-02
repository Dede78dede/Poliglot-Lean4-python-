/**
 * IndexedDB Schema Migration Framework (Phase 10.9, Task I1)
 *
 * Enforces explicit schema versions across all 6 client databases.
 * Guarantees ordered execution of MigrationSteps and testable rollbacks.
 */

export const DATABASE_VERSIONS = {
  'polyglot-vfs-db': 1,
  'polyglot-projects': 1,
  'polyglot-token-vault': 1,
  'polyglot-bibliography': 1,
  'polyglot-audit-log': 1,
  'polyglot-feature-flags': 1,
  'polyglot-chat-sessions': 1,
  'polyglot-settings': 1,
  'polyglot-notebooks': 1,
  'polyglot-search-index': 1,
} as const;

export type DatabaseName = keyof typeof DATABASE_VERSIONS;

export interface MigrationStep {
  readonly dbName: DatabaseName;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;
  readonly apply: (db: IDBDatabase) => void;
  readonly rollback?: (db: IDBDatabase) => void;
}

export class SchemaMigrationManager {
  private readonly steps: MigrationStep[] = [];
  private readonly appliedHistory: { step: MigrationStep; timestamp: string }[] = [];

  public registerStep(step: MigrationStep): void {
    if (step.toVersion !== step.fromVersion + 1) {
      throw new Error(
        `Invalid migration step for ${step.dbName}: fromVersion ${step.fromVersion} toVersion ${step.toVersion} must increment by 1.`
      );
    }
    this.steps.push(step);
  }

  public getStepsForDatabase(dbName: DatabaseName): readonly MigrationStep[] {
    return this.steps.filter((s) => s.dbName === dbName).sort((a, b) => a.fromVersion - b.fromVersion);
  }

  public getTargetVersion(dbName: DatabaseName): number {
    return DATABASE_VERSIONS[dbName] ?? 1;
  }

  public applyPendingSteps(db: IDBDatabase, currentVersion: number, targetVersion: number): void {
    const dbName = db.name as DatabaseName;
    const applicableSteps = this.getStepsForDatabase(dbName).filter(
      (s) => s.fromVersion >= currentVersion && s.toVersion <= targetVersion
    );

    for (const step of applicableSteps) {
      try {
        step.apply(db);
        this.appliedHistory.push({ step, timestamp: new Date().toISOString() });
      } catch (err: unknown) {
        throw new Error(
          `INDEXEDDB_MIGRATION_FAILED: Failed to apply step "${step.description}" for ${dbName}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  public rollbackStep(db: IDBDatabase, step: MigrationStep): void {
    if (!step.rollback) {
      throw new Error(`Migration step "${step.description}" has no rollback defined.`);
    }
    step.rollback(db);
  }

  public getAppliedHistory(): readonly { step: MigrationStep; timestamp: string }[] {
    return Object.freeze([...this.appliedHistory]);
  }
}

export const schemaMigrationManager = new SchemaMigrationManager();
