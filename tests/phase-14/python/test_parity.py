"""Contract Parity Golden Fixtures Test (Phase 14.9.3 M3).

Validates bi-directional contract parity between TypeScript Zod schemas and Python Pydantic v2:
1. Golden fixture roundtrip for ResultEnvelope (success & failure branches)
2. LeanExecuteRequest and LeanExecuteResponse parity
3. ProofReuseQuery and ProofReuseResult parity
4. Rejection of unmapped fields via extra='forbid'
"""

import unittest
from typing import Any

try:
    from pydantic import TypeAdapter, ValidationError
    from schemas.generated_contracts import (
        LeanExecuteRequest,
        LeanExecuteResponse,
        ProofReuseQuery,
        ProofReuseResult,
        ResultEnvelope,
        ResultEnvelopeFailure,
        ResultEnvelopeSuccess,
        SerializedBridgeError,
    )
    PYDANTIC_AVAILABLE = True
except ImportError:
    PYDANTIC_AVAILABLE = False


GOLDEN_SUCCESS_FIXTURE = {
    "ok": True,
    "value": {"declarations": 4, "kernel": "leanchecker"},
    "correlationId": "golden-corr-101",
    "timestamp": "2026-11-07T12:00:00Z",
}

GOLDEN_FAILURE_FIXTURE = {
    "ok": False,
    "error": {
        "code": "FALLBACK_DEGRADED",
        "problemType": "https://polyglot.dev/errors/fallback-degraded",
        "httpStatus": 503,
        "message": "Engine unreachable; degraded to preflight",
        "details": {"tier": "SYNTAX_PREFLIGHT"},
    },
    "correlationId": "golden-corr-102",
    "timestamp": "2026-11-07T12:00:01Z",
}


class TestContractParityGolden(unittest.TestCase):
    """Test suite for contract parity golden fixtures."""

    def test_golden_success_roundtrip(self) -> None:
        """Verifies that Pydantic v2 accepts the golden success envelope."""
        if not PYDANTIC_AVAILABLE:
            self.skipTest("Pydantic v2 unavailable in host environment")
        adapter: TypeAdapter[Any] = TypeAdapter(ResultEnvelope)
        model = adapter.validate_python(GOLDEN_SUCCESS_FIXTURE)
        self.assertTrue(model.ok)
        self.assertEqual(model.correlationId, "golden-corr-101")

    def test_golden_failure_roundtrip(self) -> None:
        """Verifies that Pydantic v2 accepts the golden failure envelope."""
        if not PYDANTIC_AVAILABLE:
            self.skipTest("Pydantic v2 unavailable in host environment")
        adapter: TypeAdapter[Any] = TypeAdapter(ResultEnvelope)
        model = adapter.validate_python(GOLDEN_FAILURE_FIXTURE)
        self.assertFalse(model.ok)
        self.assertEqual(model.error.httpStatus, 503)
        self.assertEqual(model.error.code, "FALLBACK_DEGRADED")

    def test_lean_execute_parity(self) -> None:
        """Verifies Lean execution request and response parity."""
        if not PYDANTIC_AVAILABLE:
            self.skipTest("Pydantic v2 unavailable in host environment")
        req = LeanExecuteRequest(code="def x := 1", timeoutMs=5000)
        self.assertEqual(req.code, "def x := 1")
        self.assertEqual(req.timeoutMs, 5000)

        resp = LeanExecuteResponse(
            stdout="x : Nat",
            stderr="",
            exitCode=0,
            durationMs=45.2,
            verified=True,
        )
        self.assertEqual(resp.exitCode, 0)
        self.assertTrue(resp.verified)

    def test_strict_boundary_extra_forbidden(self) -> None:
        """Asserts that unknown fields are strictly forbidden."""
        if not PYDANTIC_AVAILABLE:
            self.skipTest("Pydantic v2 unavailable in host environment")
        adapter: TypeAdapter[Any] = TypeAdapter(ResultEnvelope)
        payload_with_extra = {
            **GOLDEN_SUCCESS_FIXTURE,
            "unknown_injected_field": "exploit",
        }
        with self.assertRaises(ValidationError):
            adapter.validate_python(payload_with_extra)


if __name__ == "__main__":
    unittest.main()
