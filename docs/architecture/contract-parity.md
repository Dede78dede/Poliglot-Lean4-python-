# Contract Parity Architecture: TypeScript Zod ↔ Pydantic v2 (M3)

**Document ID**: PCS-ARCH-CONTRACT-PARITY  
**Version**: 1.0.0  
**Status**: APPROVED & CODIFIED  

---

## 1. Overview & Golden Invariants

Polyglot Code Studio enforces a strict contract parity architecture connecting the browser-based React/TypeScript client with the Python backend services and workers:

```
┌─────────────────────────────────┐
│ Canonical TypeScript Zod Schemas │  (src/contracts/index.ts)
└────────────────┬────────────────┘
                 │
                 ▼ npm run contracts:generate
┌─────────────────────────────────┐
│     JSON Schema Export          │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Pydantic v2 Boundary Models     │  (schemas/generated_contracts.py)
│ - extra='forbid'                │
│ - frozen=True                   │
│ - strict=True                   │
│ - Discriminator('ok')           │
└─────────────────────────────────┘
```

---

## 2. Invariants Enforced

1. **Discriminator on `ok`**: Both TypeScript `ResultEnvelope<T>` and Python `ResultEnvelope` use `ok: bool` as the discriminated union tag.
2. **RFC 9457 Problem Details Parity**: `SerializedBridgeError` identically mirrors RFC 9457 fields across TypeScript and Python:
   - `code: string`
   - `problemType: string`
   - `httpStatus: number`
   - `message: string`
   - `details: Record<string, unknown>`
3. **Strict Validation Boundaries**:
   - `extra='forbid'` prohibits unseen parameters or exploit payloads.
   - `frozen=True` ensures envelope immutability.
   - `strict=True` disables loose type coercions (e.g. `'123'` into integer).
4. **Golden Fixture Testing**:
   - Automated test suite `tests/phase-14/python/test_parity.py` validates bi-directional serialization.
