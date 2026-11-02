# Translation Fidelity Gate Architecture (Phase 12, Sprint 12.3)

## 1. Overview
The Translation Fidelity Gate provides formal confidence checks when converting code between Python and Lean 4:
1. **Python → Lean (PastaLean)**: Evaluates `example : <generated> = <user_provided> := rfl` to confirm definitional equality without semantic drift.
2. **Lean → Python (Lungo)**: Verifies `assurance.json` to enforce policy `LNG0602` (proved claim required) and `LNG0603` (unverified assumptions forbidden).
3. **Differential Testing**: Executes 20 boundary and randomized inputs across both Python (Pyodide) and Lean (`#eval`), asserting identical observable outputs.

## 2. Epistemic Safeguards
The Fidelity Gate reports translation faithfulness; it does not certify formal proofs. Any proof incorporating translated definitions must still be verified with `SEAL_KERNEL_VERIFIED_TIER5`.
