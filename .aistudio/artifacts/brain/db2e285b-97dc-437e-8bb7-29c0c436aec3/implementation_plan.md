# Polyglot Code Studio — Phase 14 Professional Remediation & Consolidation Plan

Comprehensive architectural and engineering roadmap to resolve identified code fragilities, achieve complete Python PEP compliance (PEPs 8, 257, 484, 585, 604, 621), establish autonomous contract testing, eliminate frontend build warnings, and consolidate fallback subsystems.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during interactive clarification and govern the Phase 14 execution plan:

- **Confirmed Decision 1 (Python 3.11 Runtime Parity)**: Refactor `server/src/services/leancert/leancert_wrapper.py` to use `TypeAlias` and `TypeVar` (PEP 484/585/604) rather than PEP 695 syntax (`type MethodKind = ...` and `[T: (int, float)]`), ensuring strict out-of-the-box compatibility with Python 3.11 as specified in `pyproject.toml:6`.
- **Confirmed Decision 2 (Legacy Scripts Archival)**: Move `scripts/fix_suite103.py` and `scripts/generate_suites.py` to `scripts/archive/`, enrich with PEP 257 module/function docstrings, and configure `pyproject.toml` so Ruff and Mypy only audit active production modules.
- **Confirmed Decision 3 (Autonomous Python Contract Runner)**: Implement `scripts/verify-python-contracts.py` utilizing Python's standard library `unittest` (and `TypeAdapter` / `pydantic`), enabling contract verification without external `pytest` dependencies.
- **Frontend Directive Remediation**: Remove the non-standard module-level `"use memo"` directive in `src/App.tsx` to eliminate Rolldown build warnings.
- **WAI-ARIA Security Feedback**: Elevate security observability and rate-limiting alerts to screen-reader accessible live regions (`aria-live="assertive"`, `role="alert"`).

---

## 1. Overview & Core Concept

- **What It Delivers**:
  1. Complete adherence to modern Python standards (PEP 8, 257, 484, 585, 604, 621) across all active Python modules.
  2. A self-contained, zero-dependency Python contract parity test runner (`verify-python-contracts.py`) executable on any standard Python 3.11+ environment.
  3. Clean frontend build pipeline without Rolldown directive warnings.
  4. Fully documented, accessible feedback for security, rate-limiting, and authentication events.
  5. Structured architectural blueprint and testing harness for Phase 14 fallback services (`ENABLE_LEAN_BEAM`, `ENABLE_MATHESIS`, `ENABLE_LP2`).
- **Target Audience**: Mathematicians, formal verification engineers, and polyglot software architects developing certified algorithms in Lean 4 and Python.
- **Key Invariants**:
  - **Epistemic Discipline**: Sole canonical verification certification remains `server/src/services/verification-formula.ts`. Client guards remain purely pre-flight and syntax-oriented without emitting `verified: true`.
  - **Bundle Budget**: Main chunk gzip $\le$ 180 KB, total JS gzip $\le$ 260 KB.
  - **Zero Regressions**: 100% pass across all existing 164 test suites (255 sub-tests).

---

## 2. User Experience & Visual Design

### Key User Flows & Visual Polish
- **Security & Rate-Limit Feedback**: When a 429 quota exhaustion or 401 token authentication rejection occurs:
  - Visual toast notification appears with distinctive amber/crimson accenting (`border-amber-500/50 bg-amber-950/40 text-amber-200`).
  - Screen readers receive instantaneous auditory feedback via `aria-live="assertive"` and `role="alert"`.
- **Editor & Compiler Pipeline**:
  - Monaco dual-editor maintains split-screen and tabs without module-level warning interference.
  - Verification status badges clearly distinguish between "Pre-flight Syntax Guard" (client-side) and "Kernel Certified Tier 5" (server-side Lean kernel evaluator).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: TypeAlias / TypeVar vs. PEP 695 in `leancert_wrapper.py`
- *Chosen Approach*: Rewrite `type MethodKind = ...` and generic function `verify_scalar_bound[T]` into standard `TypeAlias` and `TypeVar("T", int, float)` compatible with Python 3.11.
- *Why*: `pyproject.toml` explicitly requires `requires-python = ">=3.11"`. Using Python 3.12 syntax causes syntax errors on standard Python 3.11 runtime hosts.
- *Alternatives Considered*: Forcing Python 3.12+ would break existing Python 3.11 and 3.10 deployment containers.

### Decision 2: Python `unittest` Runner vs. External `pytest`
- *Chosen Approach*: Write `scripts/verify-python-contracts.py` using `unittest.TestCase` while retaining existing `tests/phase-14/python/test_generated_contracts.py` for environments with pytest.
- *Why*: Allows `npm test` or standalone CI scripts to execute Python parity checks deterministically without requiring a virtualenv pre-installation step.
- *Alternatives Considered*: Sole reliance on TypeScript assertion mocks ignores actual Python runtime execution.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Polyglot Code Studio                            │
├──────────────────────────────────┬─────────────────────────────────────┤
│        Frontend Client           │          Backend Engine             │
│                                  │                                     │
│  ┌────────────────────────────┐  │  ┌───────────────────────────────┐  │
│  │     Dual-Runtime Monaco    │  │  │   Express API & Middleware    │  │
│  │   - PreflightSyntaxGuard   │  │  │   - TokenVault (Bearer)       │  │
│  │   - Accessible ARIA Alerts │  │  │   - SlidingWindowRateLimiter  │  │
│  │   - Zero "use memo" warns  │  │  │   - VerificationFormula (Can.)│  │
│  └─────────────┬──────────────┘  │  └───────────────┬───────────────┘  │
│                │ JSON-RPC / REST                    │                  │
│                ▼                                    ▼                  │
│  ┌────────────────────────────┐     ┌───────────────────────────────┐  │
│  │      ResultEnvelope<T>     │◄───►│       Pydantic v2 Models      │  │
│  │  - ok: true (value)        │     │  - ResultEnvelope (discrim.)  │  │
│  │  - ok: false (ProblemDet.) │     │  - SerializedBridgeError      │  │
│  └────────────────────────────┘     │  - extra='forbid', frozen=True│  │
│                                     └───────────────┬───────────────┘  │
│                                                     ▼                  │
│                                     ┌───────────────────────────────┐  │
│                                     │  verify-python-contracts.py   │  │
│                                     │  (Autonomous unittest runner) │  │
│                                     └───────────────────────────────┘  │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 5. Step-by-Step Execution Plan

### Milestone 14.1: Python PEP Standards & Runtime Parity
- **Task 14.1.1**: Refactor `server/src/services/leancert/leancert_wrapper.py`:
  - Replace PEP 695 `type MethodKind = ...` with `MethodKind: TypeAlias = ...`.
  - Replace `def verify_scalar_bound[T: (int, float)]` with `T = TypeVar("T", int, float)` and standard generic typing.
  - Verify execution with Python 3.10 and 3.11 CLI subprocess calls.
- **Task 14.1.2**: Legacy Script Reorganization:
  - Create directory `scripts/archive/`.
  - Move `scripts/fix_suite103.py` and `scripts/generate_suites.py` into `scripts/archive/`.
  - Add PEP 257 docstrings and `if __name__ == "__main__":` blocks.
  - Update `pyproject.toml` tool overrides to exclude `scripts/archive/` from strict linting.
- **Task 14.1.3**: Autonomous Python Contract Verification Runner:
  - Create `scripts/verify-python-contracts.py` using Python's standard `unittest` module.
  - Implement tests validating `ResultEnvelopeSuccess`, `ResultEnvelopeFailure`, `SerializedBridgeError`, `extra='forbid'`, and `frozen=True`.
  - Wire verification runner into `scripts/verify-all.ts` as a deterministic process execution step.

### Milestone 14.2: Frontend Directive & Accessibility Hardening
- **Task 14.2.1**: Rolldown Warning Elimination:
  - Remove module-level `"use memo";` directive from `src/App.tsx`.
  - Ensure standard React 19 component hooks operate without bundler warnings.
- **Task 14.2.2**: WAI-ARIA Live Regions for Security & Limiter Events:
  - Review toast and notification components in `src/components/` to ensure security-event feedback uses `role="alert"` and `aria-live="assertive"`.

### Milestone 14.3: Test Suite Extension & Full Verification
- **Task 14.3.1**: Create Suite 165 (`tests/phase-14/suite-165-python-parity-and-hardening.test.ts`):
  - Test 165.1: Python 3.11 subprocess invocation of `leancert_wrapper.py` executes cleanly without PEP 695 syntax errors.
  - Test 165.2: `verify-python-contracts.py` executes with exit code 0.
  - Test 165.3: Legacy scripts in `scripts/archive/` adhere to PEP 257 header structure.
  - Test 165.4: Frontend build output verified free of `"use memo"` directive warnings.
- **Task 14.3.2**: Execute `verify-all.ts` (165 cumulative suites, 100% pass).
- **Task 14.3.3**: Measure production bundle and verify gzip budget ($\le$ 180 KB main, $\le$ 260 KB total).

### Milestone 14.4: Documentation & Summary Delivery
- **Task 14.4.1**: Update `CHANGELOG.md` with Phase 14 consolidation details.
- **Task 14.4.2**: Generate `reports/phase-14-consolidation-summary.md` recording all metrics, test suite counts, and PEP compliance benchmarks.

---

## 6. Acceptance & Verification Gates

1. **Compilation**: `npx tsc --noEmit` and `compile_applet` complete with 0 errors and zero module-level directive warnings.
2. **Cumulative Test Coverage**: 165 suites passing at 100% (259+ sub-tests).
3. **Python Contract Verification**: `python3 scripts/verify-python-contracts.py` exits with code 0.
4. **Epistemic Invariant**: Zero client-side heuristic certification; server kernel evaluator remains sole certifying authority.
5. **Bundle Budget**: Main entry chunk gzip $\le$ 180.00 KB, total JS gzip $\le$ 260.00 KB.
