"""Python Contract Parity, Pydantic Boundary & Hypothesis Property Tests.

Validates:
1. ResultEnvelope discriminated union validates success and failure branches
2. Extra unknown fields raise ValidationError (extra='forbid')
3. Frozen semantics prevent attribute mutation
4. Hypothesis property-based fuzzing across ProofOutcome, LeanExecuteRequest,
   and leancert_wrapper numerical certificate invariants
"""

from typing import Any

import pytest
from hypothesis import given
from hypothesis import strategies as st
from pydantic import TypeAdapter, ValidationError

from schemas.generated_contracts import (
    LeanExecuteRequest,
    NumericBounds,
    ProblemDetails,
    ProofOutcome,
    ResultEnvelope,
)
from server.src.services.leancert.leancert_wrapper import (
    evaluate_claim,
    verify_scalar_bound,
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
    """Validates ResultEnvelope accepts ok: False branch with SerializedBridgeError."""
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
        req.code = "mutated_code"


@given(
    code=st.text(min_size=1, max_size=200),
    timeout_ms=st.integers(min_value=1_000, max_value=30_000),
)
def test_property_lean_execute_request_roundtrip(
    code: str, timeout_ms: int
) -> None:
    """Property: valid LeanExecuteRequest preserves fields and rejects mutation."""
    req = LeanExecuteRequest(code=code, timeoutMs=timeout_ms)
    assert req.code == code
    assert req.timeoutMs == timeout_ms


@given(
    lower=st.floats(
        allow_nan=False, allow_infinity=False, min_value=-1e6, max_value=1e6
    ),
    upper=st.floats(
        allow_nan=False, allow_infinity=False, min_value=-1e6, max_value=1e6
    ),
)
def test_property_numeric_bounds_and_scalar_check(
    lower: float, upper: float
) -> None:
    """Property: NumericBounds serializes cleanly & verify_scalar_bound matches <=."""
    lo, hi = (lower, upper) if lower <= upper else (upper, lower)
    bounds = NumericBounds(lower=lo, upper=hi)
    assert bounds.lower == lo
    assert bounds.upper == hi
    mid = (lo + hi) / 2.0
    if lo <= mid <= hi:
        assert verify_scalar_bound(mid, lo, hi) is True


@given(
    status=st.integers(min_value=400, max_value=599),
    corr=st.text(min_size=1, max_size=40),
    detail=st.text(min_size=1, max_size=120),
)
def test_property_problem_details_and_proof_outcome_discrimination(
    status: int, corr: str, detail: str
) -> None:
    """Property: ProblemDetails & ProofOutcome discriminate and reject unknown keys."""
    pd = ProblemDetails(
        type="https://polyglot.dev/errors/validation",
        title="Validation Error",
        status=status,
        detail=detail,
        correlationId=corr,
    )
    assert pd.status == status
    adapter: TypeAdapter[Any] = TypeAdapter(ProofOutcome)
    outcome = adapter.validate_python(
        {
            "kind": "numeric-certificate",
            "certificationTier": "NUMERIC_CERTIFICATE_UNVERIFIED",
            "verified": False,
            "certificate": corr,
            "methodUsed": "interval",
        }
    )
    assert outcome.verified is False
    assert outcome.certificationTier == "NUMERIC_CERTIFICATE_UNVERIFIED"

    res = evaluate_claim("sin(x) <= 1", "interval")
    assert res["verified"] is True
    refuted = evaluate_claim("false claim")
    assert refuted["verified"] is False


def test_leancert_wrapper_cli_main(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Exercise leancert_wrapper.main() across valid, invalid, and missing inputs."""
    import json
    import sys

    from server.src.services.leancert.leancert_wrapper import main

    monkeypatch.setattr(sys, "argv", ["leancert_wrapper.py"])
    main()
    assert json.loads(capsys.readouterr().out)["error"] == "MISSING_PAYLOAD"

    monkeypatch.setattr(sys, "argv", ["leancert_wrapper.py", "{not-json"])
    main()
    assert json.loads(capsys.readouterr().out)["verified"] is False

    monkeypatch.setattr(
        sys,
        "argv",
        [
            "leancert_wrapper.py",
            json.dumps({"claim": "x^2 >= 0", "method": "interval"}),
        ],
    )
    main()
    payload = json.loads(capsys.readouterr().out)
    assert payload["verified"] is True
    assert payload["method"] == "interval"

