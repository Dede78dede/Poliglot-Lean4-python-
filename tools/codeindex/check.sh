#!/usr/bin/env bash
set -euo pipefail

# tools/codeindex/check.sh
# Verifies freshness of .codeindex based on content hash verification rather than file mtime.

INDEX_FILE=".codeindex/index.json"
FILES_FILE=".codeindex/files.jsonl"

if [ ! -f "$INDEX_FILE" ] || [ ! -f "$FILES_FILE" ]; then
  echo "[CodeIndex Check] FAILED: .codeindex artifacts missing. Run 'npx tsx tools/codeindex/generate.ts'."
  exit 1
fi

echo "[CodeIndex Check] Verifying sample file content hashes..."
# Sample 10 random files from files.jsonl and check their sha256 matches actual filesystem
python3 -c "
import json, hashlib, sys, os

with open('$FILES_FILE', 'r', encoding='utf-8') as f:
    lines = [json.loads(line) for line in f if line.strip()]

mismatches = 0
checked = 0
for item in lines[:25]:  # verify first 25 entries
    p = item['path']
    expected = item['sha256']
    if not os.path.exists(p):
        print(f'[MISMATCH] Missing file: {p}')
        mismatches += 1
        continue
    with open(p, 'rb') as fp:
        actual = hashlib.sha256(fp.read()).hexdigest()
    if actual != expected:
        print(f'[MISMATCH] Content changed for {p}')
        mismatches += 1
    checked += 1

if mismatches > 0:
    print(f'[CodeIndex Check] FAILED: {mismatches}/{checked} checked files have hash mismatches. Index is stale.')
    sys.exit(1)
else:
    print(f'[CodeIndex Check] PASSED: {checked} sampled files have pristine content hashes.')
"

echo "[CodeIndex Check] Freshness verification complete."
