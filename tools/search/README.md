# Developer Search & Indexation Tooling

This directory defines the verified local developer search and indexation tooling layer for **Polyglot Code Studio**.

## Architecture & Boundary Principles

1. **Strict Production Isolation**:
   - Files in `tools/` are developer-facing utilities only.
   - Code in `src/` and `server/src/` **MUST NEVER** import anything from `tools/`.
   - This architectural barrier is enforced at build/CI time via `.dependency-cruiser.cjs` (`no-tools-in-production` rule) and `npm run arch:check`.

2. **Allowlist Integrity (`allowlist.json`)**:
   - Only tools registered in `tools/search/allowlist.json` with explicit license, SHA256 checksum, allowed input scopes, and forbidden patterns are permitted.
   - Any external tool invocation must adhere to the boundaries specified in `allowlist.json`.

3. **Data Redaction & Hygiene**:
   - Search tools must never scan or ingest `data/tokens.json`, environment secrets (`.env*`), or unredacted credential files.
   - Outputs must be generated into gitignored local paths (`.codeindex/`, `.ogrep/`, `reports/context/`).

## Available Tools

- `ogrep`: Structural search wrapper for AST/token patterns.
- `semcode`: Semantic code graph search across modules.
- `codeindex`: Static code index generator (`tools/codeindex/generate.ts`).
- `repomix`: Context packaging wrapper (`tools/context/pack.sh`).
