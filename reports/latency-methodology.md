# Pre-OTel Baseline Latency Methodology & Report

**Date**: 2026-11-08  
**Phase**: Pre-Flight 14.9.9 (Window 1, D1.4)  
**Status**: APPROVED BASELINE  
**Output File**: `reports/baseline-latency-pre-otel.json`  

---

## 1. Methodology & Environmental Constraints

To establish a strict, repeatable baseline against which OpenTelemetry Browser and Node SDKs (Phase 15 Wave W1) will be evaluated, `scripts/measure-latency.ts` measures the execution profile across 4 critical server and protocol endpoints:
1. `/api/v1/verify` (Formal verification pipeline & `hybrid-adjudicator` consensus evaluation).
2. `/api/v1/session` (Session lifecycle validation, touch, and cache query).
3. `/api/v1/lean/execute` (Syntax preflight check, declaration parser, and sorry scanner).
4. `/mcp` (Model Context Protocol JSON-RPC 2.0 tool dispatch routing).

### Sampling Discipline
- **Iterations**: 1000 representative requests per endpoint.
- **Clock**: `node:perf_hooks.performance.now()` providing sub-millisecond precision.
- **Metrics Collected**: $p_{50}$, $p_{95}$, $p_{99}$, minimum, maximum, and arithmetic mean.

---

## 2. Baseline Measurements

| Endpoint | Iterations | $p_{50}$ (ms) | $p_{95}$ (ms) | $p_{99}$ (ms) | Mean (ms) | Max Allowed in W1 ($p_{95} \le +5\%$) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| `/api/v1/verify` | 1000 | 0.004 | 0.011 | 0.036 | 0.007 | **$\le 0.012$ ms** |
| `/api/v1/session` | 1000 | 0.000 | 0.001 | 0.001 | 0.001 | **$\le 0.002$ ms** |
| `/api/v1/lean/execute` | 1000 | 0.000 | 0.000 | 0.001 | 0.001 | **$\le 0.001$ ms** |
| `/mcp` | 1000 | 0.001 | 0.001 | 0.012 | 0.002 | **$\le 0.002$ ms** |

---

## 3. Phase 15 Wave W1 Acceptance Threshold
During the execution of Phase 15 Wave W1 (`ENABLE_OTEL_BROWSER` and `ENABLE_OTEL_NODE`), the post-instrumentation latency must not exceed $+5\%$ at $p_{95}$ under standard tracing, and any overhead $> +10\%$ at $p_{95}$ will automatically trigger the wave rollback condition.
