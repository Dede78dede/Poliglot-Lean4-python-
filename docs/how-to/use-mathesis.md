# How-To: Natural Language Autoformalization via Mathesis & LeanScorer

Polyglot Code Studio integrates Mathesis (ICLR 2026) for autoformalizing informal mathematical statements into Lean 4 declarations, verified by LeanScorer.

*Last verified: 2026-10-29*

---

## 1. Prerequisites & Configuration

Mathesis requires an external inference endpoint:
1. Ensure `ENABLE_MATHESIS=true` in `.env` or Settings.
2. Configure `MATHESIS_ENDPOINT="http://localhost:8088/v1/mathesis"` (or your remote GPU server).
3. If `MATHESIS_ENDPOINT` is empty or offline, requests fail fast with `MATHESIS_UNAVAILABLE` (HTTP 503) and setup instructions.

---

## 2. Using the Mathesis Panel

1. Open the **FEMEV Drawer** or Side Panel and select **Mathesis**.
2. Enter an informal mathematical sentence, such as:
   `Every natural number n satisfies 0 <= n.`
3. Click **Formalize**.
4. The system executes the pipeline:
   - Generates candidate Lean 4 theorem declarations.
   - Evaluates each candidate using `LeanScorer` (score in `[0, 1]`).
   - If the score meets or exceeds `0.5`, the candidate is marked as accepted.
   - Click **Insert into active file** to copy the formal code into Monaco.

---

## 3. Epistemic Boundary

LeanScorer confidence scores are heuristic quality indicators:
- They do not guarantee kernel acceptance or formal proof closure.
- Theorem declarations remain unproven until compiled and validated by the Lean 4 kernel with `SEAL_KERNEL_VERIFIED_TIER5`.
