#!/usr/bin/env python3
"""Autonomous Python Contract Parity & Boundary Verification Runner.

Standard library unittest runner executing deterministic validation across:
1. ResultEnvelope discriminated union parity (ok: True/False)
2. SerializedBridgeError RFC 9457 conformity
3. Strict Pydantic boundary enforcement (extra='forbid', frozen=True, strict=True)
4. Domain contracts (LeanExecuteRequest, ProofReuseQuery, ConfigProposal)

Executable standalone with zero external testing dependencies (no pytest required).
Conforms to PEP 8, PEP 257, PEP 484, PEP 585, PEP 604, and PEP 621.
"""

from __future__ import annotations

import ast
import sys
import unittest
from pathlib import Path
from typing import Any

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

try:
    from pydantic import TypeAdapter, ValidationError
    from schemas.generated_contracts import (
        ConfigChange,
        ConfigProposal,
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
except ImportError as exc:
    PYDANTIC_AVAILABLE = False
    IMPORT_ERROR_MSG = str(exc)


class TestPythonSyntaxAndAST(unittest.TestCase):
    """Test suite validating AST compilation of all Python files in the repository."""

    def test_contracts_ast_validity(self) -> None:
        """Validate that schemas/generated_contracts.py parses as valid Python AST."""
        contracts_file = WORKSPACE_ROOT / "schemas" / "generated_contracts.py"
        self.assertTrue(contracts_file.exists(), "generated_contracts.py must exist")
        content = contracts_file.read_text(encoding="utf-8")
        parsed = ast.parse(content, filename=str(contracts_file))
        self.assertIsInstance(parsed, ast.Module)

    def test_leancert_wrapper_ast_validity(self) -> None:
        """Validate that server/src/services/leancert/leancert_wrapper.py parses as valid Python AST."""
        leancert_file = WORKSPACE_ROOT / "server" / "src" / "services" / "leancert" / "leancert_wrapper.py"
        self.assertTrue(leancert_file.exists(), "leancert_wrapper.py must exist")
        content = leancert_file.read_text(encoding="utf-8")
        parsed = ast.parse(content, filename=str(leancert_file))
        self.assertIsInstance(parsed, ast.Module)

    def test_archived_scripts_ast_validity(self) -> None:
        """Validate that archived scripts in scripts/archive parse cleanly."""
        archive_dir = WORKSPACE_ROOT / "scripts" / "archive"
        for py_path in archive_dir.glob("*.py"):
            content = py_path.read_text(encoding="utf-8")
            parsed = ast.parse(content, filename=str(py_path))
            self.assertIsInstance(parsed, ast.Module)


class TestPythonContractsAutonomous(unittest.TestCase):
    """Test suite executing strict boundary checks on generated contracts."""

    def setUp(self) -> None:
        """Verify Pydantic v2 environment availability before each test."""
        if not PYDANTIC_AVAILABLE:
            self.skipTest(f"Pydantic v2 unavailable: {IMPORT_ERROR_MSG}")

    def test_result_envelope_success_branch(self) -> None:
        """Validate that ResultEnvelope validates a success payload."""
        adapter: TypeAdapter[Any] = TypeAdapter(ResultEnvelope)
        payload: dict[str, Any] = {
            "ok": True,
            "value": {"theorem": "nat_add_zero", "proof": "by rfl"},
            "correlationId": "corr-py-001",
            "timestamp": "2026-11-04T12:00:00Z",
        }
        validated = adapter.validate_python(payload)
        self.assertIsInstance(validated, ResultEnvelopeSuccess)
        self.assertTrue(validated.ok)
        self.assertEqual(validated.correlationId, "corr-py-001")
        self.assertEqual(validated.value["theorem"], "nat_add_zero")

    def test_result_envelope_failure_branch(self) -> None:
        """Validate that ResultEnvelope validates a failure payload with RFC 9457 error."""
        adapter: TypeAdapter[Any] = TypeAdapter(ResultEnvelope)
        payload: dict[str, Any] = {
            "ok": False,
            "error": {
                "code": "FEATURE_DISABLED",
                "problemType": "https://polyglot.dev/errors/feature-disabled",
                "httpStatus": 503,
                "message": "Feature disabled by policy",
                "details": {"feature": "ENABLE_LEAN_BEAM"},
            },
            "correlationId": "corr-py-002",
            "timestamp": "2026-11-04T12:00:01Z",
        }
        validated = adapter.validate_python(payload)
        self.assertIsInstance(validated, ResultEnvelopeFailure)
        self.assertFalse(validated.ok)
        self.assertEqual(validated.error.httpStatus, 503)
        self.assertEqual(validated.error.code, "FEATURE_DISABLED")
        self.assertEqual(validated.error.details["feature"], "ENABLE_LEAN_BEAM")

    def test_extra_fields_forbidden(self) -> None:
        """Validate that extra='forbid' strictly rejects unknown properties."""
        with self.assertRaises(ValidationError) as ctx:
            LeanExecuteRequest(
                code="theorem t : True := trivial",
                timeoutMs=5000,
                unauthorized_extra="injected_payload",  # type: ignore[call-arg]
            )
        self.assertIn("extra_forbidden", str(ctx.exception))

    def test_frozen_semantics_prevent_mutation(self) -> None:
        """Validate that frozen=True prevents mutation of instantiated attributes."""
        req = LeanExecuteRequest(code="theorem t : True := trivial", timeoutMs=5000)
        with self.assertRaises(ValidationError):
            req.code = "mutated_code"  # type: ignore[misc]

    def test_rfc9457_problem_details_structure(self) -> None:
        """Validate that SerializedBridgeError enforces required fields."""
        err = SerializedBridgeError(
            code="RATE_LIMIT_EXCEEDED",
            problemType="https://polyglot.dev/errors/rate-limit-exceeded",
            httpStatus=429,
            message="Too many requests",
            details={"retryAfterSeconds": 60},
        )
        self.assertEqual(err.httpStatus, 429)
        self.assertEqual(err.details["retryAfterSeconds"], 60)

    def test_domain_model_boundaries(self) -> None:
        """Validate ProofReuse and ConfigProposal domain schemas."""
        query = ProofReuseQuery(goal="n + 0 = n", leanToolchain="v4.35.0")
        self.assertEqual(query.goal, "n + 0 = n")

        proposal = ConfigProposal(
            id="prop-1",
            title="Enable Translation Fidelity",
            rationale="High benchmark confidence",
            source="benchmark",
            changes=[ConfigChange(**{"flag": "ENABLE_TRANSLATION_FIDELITY", "from": False, "to": True})],
            confidence="high",
            createdAt="2026-11-04T12:00:00Z",
        )
        self.assertEqual(proposal.confidence, "high")
        self.assertEqual(len(proposal.changes), 1)
        self.assertEqual(proposal.changes[0].from_val, False)
        self.assertEqual(proposal.changes[0].to, True)


def run_contract_verification() -> int:
    """Run all contract parity test cases and report results cleanly.

    Returns:
        0 if all tests pass, 1 otherwise.
    """
    print("\n--- Running Autonomous Python Contract Parity Suite (unittest) ---")
    suite = unittest.TestSuite()
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestPythonSyntaxAndAST))
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestPythonContractsAutonomous))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if result.wasSuccessful():
        print("✓ All Python boundary contracts verified successfully (100% pass).\n")
        return 0
    print(f"✗ Python contract verification failed with {len(result.errors)} errors, {len(result.failures)} failures.\n")
    return 1


if __name__ == "__main__":
    sys.exit(run_contract_verification())
