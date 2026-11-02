# Architecture: Workspace Archive (.polyglot) & Backup/Restore

*Last verified: 2026-10-29*

## 1. Overview

The `.polyglot` workspace archive format provides deterministic, self-contained backup and restoration of Lean 4 projects. It unifies project source files, configuration manifests, Lean toolchain specifications, and collaboration history under a single verifiable bundle.

---

## 2. Archive Layout & Manifest

An unpacked `.polyglot` archive conforms to the following directory hierarchy:

```
.polyglot-archive/
├── manifest.json       # Metadata, format ('polyglot-workspace'), version ('1.0.0'), toolchain
├── SHA256SUMS          # Deterministic SHA-256 hashes of all enclosed files
├── Main.lean           # Project root files
├── lakefile.lean       # Build specification
├── lean-toolchain      # Validated toolchain pin
└── .collab/            # Optional CRDT document snapshot states
```

### Determinism Invariants
- Lexicographical path sorting across all entries.
- Fixed Unix epoch timestamps (1970-01-01T00:00:00Z) to eliminate non-deterministic mtime divergence.
- Explicit POSIX permissions (`0644`).

---

## 3. Restoration Safety Model

Restoration executes with defense-in-depth:
1. **Size Checking**: Uncompressed archives exceeding `MAX_WORKSPACE_ARCHIVE_SIZE_BYTES` (100 MB) are rejected with `WORKSPACE_ARCHIVE_INVALID`.
2. **Path Traversal Shield**: Tar headers with relative components (`../`) or absolute roots (`/`) are blocked immediately.
3. **Staging Extraction**: Files are extracted to `.polyglot-staging-*` before atomic swap.
4. **Checksum Verification**: Hashes must match `SHA256SUMS` or extraction rolls back with `WORKSPACE_ARCHIVE_CHECKSUM_MISMATCH`.
5. **Conflict Policies**: Defaults to `fail`, preventing unintended overwrites unless explicitly requested.
