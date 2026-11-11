#!/usr/bin/env bash
set -euo pipefail

# tools/context/pack.sh
# Local wrapper for generating repomix context packs into gitignored reports/context/

OUTPUT_DIR="reports/context"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${OUTPUT_DIR}/context-pack-${TIMESTAMP}.txt"

mkdir -p "$OUTPUT_DIR"

echo "[Context Pack] Packaging repository context into ${OUTPUT_FILE}..."

# Run Repomix with strict ignore patterns
npx repomix \
  --output "${OUTPUT_FILE}" \
  --ignore "node_modules/**,dist/**,.git/**,data/tokens.json,reports/context/**,.codeindex/**,.ogrep/**" \
  --include "src/**,server/src/**,tests/**,docs/**,schemas/**"

echo "[Context Pack] Context pack created successfully at: ${OUTPUT_FILE}"
ls -lh "${OUTPUT_FILE}"
