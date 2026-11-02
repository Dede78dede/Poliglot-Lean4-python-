# How-To: Export and Restore Workspace Archives (.polyglot)

Polyglot Code Studio provides complete, deterministic backup and restoration of workspaces using compressed `.polyglot` archives.

*Last verified: 2026-10-29*

---

## 1. Overview & Format Specifications

A `.polyglot` archive is a gzip-compressed tar bundle containing:
- `manifest.json`: Metadata, format descriptor (`polyglot-workspace`), schema version (`1.0.0`), Lean toolchain string, and file manifest.
- `SHA256SUMS`: Cryptographic SHA-256 integrity checksums for all enclosed workspace files.
- Workspace source trees, lakefile configs, and optional CRDT snapshots (`.collab/`).

Archive generation is strictly deterministic:
- File paths are sorted lexicographically.
- Modification timestamps are normalized to Unix epoch zero (1970-01-01T00:00:00Z).
- File permissions are normalized to `0644` (regular files).

---

## 2. Exporting a Workspace

To export your active workspace:
1. Open the File Manager / Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Select **Workspace: Export Archive (.polyglot)** or execute `POST /api/v1/workspace/export`.
3. The server generates the deterministic `.polyglot` bundle and triggers a direct browser download.

---

## 3. Inspecting & Validating an Archive (Dry-Run)

Before unpacking an archive onto disk, always perform an inspection:
- Execute `POST /api/v1/workspace/inspect` with the archive binary payload.
- The inspection verifies:
  - Archive header integrity and uncompressed size quotas (<= 100 MB).
  - Schema compatibility: version `1.0.0` or earlier supported; future major versions (e.g. `2.0.0`) are safely rejected with `WORKSPACE_ARCHIVE_SCHEMA_TOO_NEW`.
  - Checksum validation: matches all files against `SHA256SUMS`.
  - Security scanning: detects and rejects path traversal sequences (`../`, absolute paths).

---

## 4. Restoring an Archive

Restoration follows a fail-safe two-stage process:
1. **Staging Extraction**: The archive is unpacked into a temporary staging folder (`.polyglot-staging-*`).
2. **Checksum Verification**: Every extracted file's SHA-256 hash is computed and validated against the manifest.
3. **Atomic Swap**:
   - In dry-run mode (`dryRun: true`), the restore engine outputs the planned file list and ceases execution without writing files.
   - In live mode (`dryRun: false`), the files are atomically moved into the target project directory.
   - If target files exist and conflict policy is `fail`, restoration halts safely with RFC 9457 error `WORKSPACE_RESTORE_CONFLICT`.
