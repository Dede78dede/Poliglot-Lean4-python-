#!/usr/bin/env bash
# ==============================================================================
# Seal Integrity Sweep — Full-Repo Epistemic Authority Gate (Consolidated Gate 1)
# ==============================================================================
set -euo pipefail

echo "========================================================"
echo "Starting Full-Repo Seal Integrity Sweep..."
echo "========================================================"

VIOLATIONS=0

# 1. verified: true must NEVER appear in src/ or server/src/ outside hybrid-adjudicator.ts
UNAUTHORIZED_VERIFIED=$(grep -rnE "verified:[[:space:]]*true" src/ server/src/ \
  --include='*.ts' --include='*.tsx' \
  --exclude='*.test.ts' --exclude='*.spec.ts' \
  --exclude-dir=node_modules --exclude-dir=dist \
  | grep -v "server/src/services/verification/hybrid-adjudicator.ts:" \
  | grep -v "src/types/proof-outcome.ts:" \
  | grep -v "src/contracts/index.ts:" || true)

if [ -n "$UNAUTHORIZED_VERIFIED" ]; then
  echo "❌ VIOLATION 1: Unauthorized 'verified: true' detected outside hybrid-adjudicator.ts:"
  echo "$UNAUTHORIZED_VERIFIED"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✓ Invariant 1: Full src/ & server/src/ sweep free of unauthorized 'verified: true'"
fi

# 2. Minting SEAL_KERNEL_VERIFIED_TIER5 must NEVER appear outside hybrid-adjudicator.ts (except gated pass-through in mcp-server.ts)
UNAUTHORIZED_SEAL=$(grep -rnE "(seal|badge|tier|kernelSeal|proofCarried):[[:space:]]*['\"]SEAL_KERNEL_VERIFIED_TIER5['\"]" src/ server/src/ \
  --include='*.ts' --include='*.tsx' \
  --exclude='*.test.ts' --exclude='*.spec.ts' \
  --exclude-dir=node_modules --exclude-dir=dist \
  | grep -v "server/src/services/verification/hybrid-adjudicator.ts:" \
  | grep -v "src/types/proof-outcome.ts:" \
  | grep -v "src/contracts/index.ts:" \
  | grep -v "src/types/blueprint.ts:" || true)

if [ -n "$UNAUTHORIZED_SEAL" ]; then
  echo "❌ VIOLATION 2: Unauthorized SEAL_KERNEL_VERIFIED_TIER5 minting outside hybrid-adjudicator.ts:"
  echo "$UNAUTHORIZED_SEAL"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✓ Invariant 2: Full src/ & server/src/ sweep free of unauthorized seal minting"
fi

# 2b. Secondary bridges must never reference SEAL_KERNEL_VERIFIED_TIER5 at all
SECONDARY_BRIDGES=(
  "server/src/services/autocorrect/axle-repair.ts"
  "server/src/services/leancert/leancert-bridge.ts"
  "server/src/services/provepy/provepy-bridge.ts"
  "server/src/services/pastalean/pastalean-bridge.ts"
  "server/src/services/mcp/lean-lsp-mcp-client.ts"
  "src/services/mcp/lean-lsp-client.ts"
  "src/services/verification/preflight-syntax-guard.ts"
  "src/services/verification/verification-formula.ts"
  "server/src/services/lungo/lungo-bridge.ts"
)
BRIDGE_LEAKS=""
for file in "${SECONDARY_BRIDGES[@]}"; do
  if [ -f "$file" ]; then
    MATCHES=$(grep -rn "SEAL_KERNEL_VERIFIED_TIER5" "$file" || true)
    if [ -n "$MATCHES" ]; then
      BRIDGE_LEAKS+="$MATCHES"$'\n'
    fi
  fi
done
if [ -n "$BRIDGE_LEAKS" ]; then
  echo "❌ VIOLATION 2b: SEAL_KERNEL_VERIFIED_TIER5 reference in secondary bridge:"
  echo "$BRIDGE_LEAKS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✓ Invariant 2b: Secondary bridges completely free of SEAL_KERNEL_VERIFIED_TIER5"
fi

# 3. Client modules in src/** must NEVER import server/src/services/verification-formula.ts
UNAUTHORIZED_IMPORTS=$(grep -rn "from.*server/src/services/verification-formula" src/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist || true)

if [ -n "$UNAUTHORIZED_IMPORTS" ]; then
  echo "❌ VIOLATION 3: Client module importing server verification formula directly:"
  echo "$UNAUTHORIZED_IMPORTS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✓ Invariant 3: Zero client imports of server-side verification formula"
fi

# 4. certifyWithKernel must not exist in src/
UNAUTHORIZED_CERTIFY=$(grep -rn "certifyWithKernel" src/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist || true)

if [ -n "$UNAUTHORIZED_CERTIFY" ]; then
  echo "❌ VIOLATION 4: 'certifyWithKernel' still present in src/:"
  echo "$UNAUTHORIZED_CERTIFY"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✓ Invariant 4: certifyWithKernel completely excised from client code"
fi

# 5. certificationTier: 'KERNEL_VERIFIED_TIER5' must ONLY appear in hybrid-adjudicator.ts
UNAUTHORIZED_TIER5=$(grep -rn "certificationTier:[[:space:]]*'KERNEL_VERIFIED_TIER5'" src/ server/src/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "server/src/services/verification/hybrid-adjudicator.ts" \
  | grep -v "types/proof-outcome.ts" \
  | grep -v "src/contracts/" || true)

if [ -n "$UNAUTHORIZED_TIER5" ]; then
  echo "❌ VIOLATION 5: Unauthorized 'certificationTier: KERNEL_VERIFIED_TIER5' detected outside hybrid-adjudicator.ts:"
  echo "$UNAUTHORIZED_TIER5"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✓ Invariant 5: certificationTier KERNEL_VERIFIED_TIER5 exists solely in authorized authority paths"
fi

echo "========================================================"
if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ Sweep failed with $VIOLATIONS epistemic violation(s)."
  exit 1
fi

echo "✓ Full-Repo Seal Integrity Sweep PASSED with 0 violations."
exit 0
