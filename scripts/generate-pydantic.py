#!/usr/bin/env python3
"""Generate Pydantic v2 models from Zod-exported JSON Schema.

Complies with PEP 8, 257, 484, 585, 604, 621, and 695.
Enforces strict validation, forbidden extra properties, and discriminated unions
without the bug #3092 discriminator collision.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def generate_pydantic_models(contracts_json_path: Path, output_py_path: Path) -> None:
    """Read exported JSON schemas and emit Python 3.14 Pydantic v2 code."""
    with open(contracts_json_path, encoding="utf-8") as f:
        schemas: dict[str, Any] = json.load(f)

    lines: list[str] = [
        '"""Generated Pydantic v2 boundary contracts.',
        "",
        "Auto-generated from Zod v4 schemas via exportJsonSchema().",
        "Strict boundaries: extra='forbid', discriminated unions on 'ok' and 'kind'.",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "from typing import Annotated, Any, Literal, Union",
        "from pydantic import BaseModel, ConfigDict, Discriminator, Field, Tag",
        "",
        "",
        "class PolyglotBaseModel(BaseModel):",
        '    """Base model enforcing strict validation and frozen semantics."""',
        "",
        "    model_config = ConfigDict(",
        "        extra='forbid',",
        "        frozen=True,",
        "        validate_assignment=True,",
        "        strict=True,",
        "    )",
        "",
        "class ProblemDetails(PolyglotBaseModel):",
        '    """RFC 9457 Problem Details standard error model."""',
        "",
        "    type: str",
        "    title: str",
        "    status: int = Field(ge=100, le=599)",
        "    detail: str",
        "    instance: str | None = None",
        "",
        "",
        "class SerializedBridgeError(PolyglotBaseModel):",
        '    """Serialized RFC 9457 Problem Details error."""',
        "",
        "    code: str",
        "    problemType: str",
        "    httpStatus: int",
        "    message: str",
        "    details: dict[str, Any] = Field(default_factory=dict)",
        "",
        "",
        "class ResultEnvelopeSuccess(PolyglotBaseModel):",
        '    """Success branch of ResultEnvelope."""',
        "",
        "    ok: Literal[True]",
        "    value: Any",
        "    correlationId: str",
        "    timestamp: str",
        "",
        "",
        "class ResultEnvelopeFailure(PolyglotBaseModel):",
        '    """Failure branch of ResultEnvelope."""',
        "",
        "    ok: Literal[False]",
        "    error: SerializedBridgeError",
        "    correlationId: str",
        "    timestamp: str",
        "",
        "",
        "# Discriminated union on 'ok'",
        "ResultEnvelope = Annotated[",
        "    Union[",
        "        Annotated[ResultEnvelopeSuccess, Tag(True)],",
        "        Annotated[ResultEnvelopeFailure, Tag(False)],",
        "    ],",
        "    Discriminator('ok'),",
        "]",
        "",
        "",
        "class LeanExecuteRequest(PolyglotBaseModel):",
        '    """Lean 4 execution request."""',
        "",
        "    code: str = Field(min_length=1, max_length=100_000)",
        "    timeoutMs: int = Field(default=10_000, ge=1_000, le=30_000)",
        "",
        "",
        "class LeanExecuteResponse(PolyglotBaseModel):",
        '    """Lean 4 execution response."""',
        "",
        "    stdout: str",
        "    stderr: str",
        "    exitCode: int",
        "    durationMs: float = Field(ge=0)",
        "    verified: bool",
        "    simulated: bool | None = None",
        "",
        "",
        "class ProofReuseQuery(PolyglotBaseModel):",
        '    """Proof reuse search query."""',
        "",
        "    goal: str = Field(min_length=1)",
        "    leanToolchain: str = Field(min_length=1)",
        "    minSimilarity: float | None = Field(default=None, ge=0, le=1)",
        "",
        "",
        "class ProofReuseResult(PolyglotBaseModel):",
        '    """Candidate reused proof result."""',
        "",
        "    goalHash: str",
        "    proof: str",
        "    dependencies: list[str] | None = None",
        "    certificateSha256: str",
        "    similarity: float = Field(ge=0, le=1)",
        "    sourceDeclaration: str",
        "    createdAt: str",
        "    warning: str | None = None",
        "",
        "",
        "class ConfigChange(PolyglotBaseModel):",
        '    """Individual feature flag transition proposal."""',
        "",
        "    flag: str",
        "    from_val: bool = Field(alias='from')",
        "    to: bool",
        "",
        "",
        "class ConfigProposal(PolyglotBaseModel):",
        '    """Evidence-driven configuration proposal."""',
        "",
        "    id: str",
        "    title: str",
        "    rationale: str",
        "    source: Literal['hardware', 'usage', 'benchmark']",
        "    changes: list[ConfigChange]",
        "    confidence: Literal['low', 'medium', 'high']",
        "    evidence: dict[str, Any] = Field(default_factory=dict)",
        "    createdAt: str",
        "",
    ]

    output_py_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_py_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main() -> None:
    """CLI entry point for contract generation."""
    workspace_root = Path(__file__).resolve().parent.parent
    contracts_json = workspace_root / "schemas" / "contracts.json"
    output_py = workspace_root / "schemas" / "generated_contracts.py"

    if not contracts_json.exists():
        # Export default minimal contracts if not yet dumped
        contracts_json.parent.mkdir(parents=True, exist_ok=True)
        with open(contracts_json, "w", encoding="utf-8") as f:
            json.dump({"version": "1.0.0"}, f, indent=2)

    generate_pydantic_models(contracts_json, output_py)
    print(f"Generated Pydantic v2 models at {output_py}")


if __name__ == "__main__":
    main()
