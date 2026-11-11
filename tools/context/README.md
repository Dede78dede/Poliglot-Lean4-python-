# Repository Context Packaging Tooling

This directory houses the offline context packaging script used to compile repository snapshots for security reviews, audits, and LLM analysis.

## Usage

```bash
chmod +x tools/context/pack.sh
./tools/context/pack.sh
```

## Security & Privacy Constraints

1. **Local-Only Destination**:
   - All packs are written to `reports/context/context-pack-*.txt`.
   - `reports/context/` is strictly `.gitignore`d to prevent sensitive context or repository dumps from ever being committed to source control.

2. **Exclusion Boundaries**:
   - `data/tokens.json`, environment secrets, `.git`, `node_modules`, `dist/`, `.codeindex/`, and `.ogrep/` are unconditionally excluded from generated packages.
