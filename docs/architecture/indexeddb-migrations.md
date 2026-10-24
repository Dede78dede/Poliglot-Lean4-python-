# IndexedDB Schema Migration Architecture

**Polyglot Code Studio — Phase 10.9 Architecture**  
*Source of Truth: `src/services/storage/schema-migration.ts`*

---

## 1. Database Version Registry

All browser-side persistence utilizes versioned IndexedDB databases governed by `DATABASE_VERSIONS`:

| Database Name | Current Version | Primary Object Stores | Purpose |
| :--- | :--- | :--- | :--- |
| `polyglot-vfs-db` | `1` | `files`, `metadata` | In-browser virtual filesystem for interactive workspaces |
| `polyglot-projects` | `1` | `projects`, `snapshots` | Multi-project workspace catalog and snapshot history |
| `polyglot-token-vault` | `1` | `tokens` | PBKDF2/AES-GCM-256 encrypted access credentials |
| `polyglot-bibliography` | `1` | `entries`, `cff` | BibTeX, CodeMeta, and CITATION.cff metadata cache |
| `polyglot-audit-log` | `1` | `audit_events` | Local-only privacy and security verification audit log |
| `polyglot-feature-flags` | `1` | `overrides` | Persistent tab-local feature flag overrides |

---

## 2. Migration Protocol & Invariants

1. **Sequential Increment**: Every `MigrationStep` MUST satisfy `toVersion === fromVersion + 1`. Multi-version jumps in a single step are forbidden.
2. **Reversible Migrations**: Every registered migration step MUST define a `rollback(db: IDBDatabase)` function. Steps lacking rollbacks are rejected during CI static analysis.
3. **Phase 10.9 Scope**: All existing databases remain at version `1`. Phase 10.9 introduces the `SchemaMigrationManager` framework and adds `polyglot-feature-flags` at version 1 without modifying existing schemas.
4. **Phase 11 Forward Path**: Phase 11 will upgrade `polyglot-bibliography` to version `2` to introduce CSL style caching indices. The migration will be registered via:
   ```typescript
   schemaMigrationManager.registerStep({
     dbName: 'polyglot-bibliography',
     fromVersion: 1,
     toVersion: 2,
     description: 'Add CSL style indices to bibliography object store',
     apply: (db) => { ... },
     rollback: (db) => { ... },
   });
   ```
