"""Python Contract Parity & Pydantic Boundary Tests (Phase 13.9, Task 07).

Validates:
1. ResultEnvelope discriminated union validates success and failure branches with Discriminator('ok')
2. Extra unknown fields raise ValidationError (extra='forbid')
3. SerializedBridgeError validates RFC 9457 fields
4. Frozen semantics prevent attribute mutation
"""

from typing import Any
import pytest
from pydantic import ValidationError, TypeAdapter

from schemas.generated_contracts import (
    ResultEnvelope,
    ResultEnvelopeSuccess,
    ResultEnvelopeFailure,
    SerializedBridgeError,
    LeanExecuteRequest,
    LeanExecuteResponse,
    ProofReuseQuery,
    ProofReuseResult,
)


def test_result_envelope_success_branch() -> None:
    """Validates that ResultEnvelope accepts valid ok: True branch."""
    adapter: TypeAdapter[Any] = TypeAdapter(ResultEnvelope)
    payload = {
        "ok": True,
        "value": {"theorem": "nat_add_zero", "proof": "by rfl"},
        "correlationId": "corr-py-001",
        "timestamp": "2026-11-03T12:00:00Z",
    }
    validated = adapter.validate_python(payload)
    assert validated.ok is True
    assert validated.correlationId == "corr-py-001"
    assert validated.value["theorem"] == "nat_add_zero"


def test_result_envelope_failure_branch() -> None:
    """Validates that ResultEnvelope accepts valid ok: False branch with SerializedBridgeError."""
    adapter: TypeAdapter[Any] = TypeAdapter(ResultEnvelope)
    payload = {
        "ok": False,
        "error": {
            "code": "FEATURE_DISABLED",
            "problemType": "https://polyglot.dev/errors/feature-disabled",
            "httpStatus": 503,
            "message": "Disabled by policy",
            "details": {"feature": "ENABLE_LEAN_BEAM"},
        },
        "correlationId": "corr-py-002",
        "timestamp": "2026-11-03T12:00:01Z",
    }
    validated = adapter.validate_python(payload)
    assert validated.ok is False
    assert validated.error.httpStatus == 503
    assert validated.error.code == "FEATURE_DISABLED"


def test_extra_forbidden_raises_validation_error() -> None:
    """Validates that extra='forbid' rejects unexpected fields."""
    with pytest.raises(ValidationError) as exc_info:
        LeanExecuteRequest(
            code="theorem t : True := trivial",
            timeoutMs=5000,
            unrecognized_field="illegal_payload",  # type: ignore[call-arg]
        )
    assert "extra_forbidden" in str(exc_info.value)


def test_frozen_semantics_prevent_mutation() -> None:
    """Validates frozen=True prevents modifying attributes."""
    req = LeanExecuteRequest(code="theorem t : True := trivial", timeoutMs=5000)
    with pytest.raises(ValidationError):
        req.code = "mutated_code"  # type: ignore[misc]
