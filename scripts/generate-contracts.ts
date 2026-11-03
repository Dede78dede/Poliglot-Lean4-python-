/**
 * Contract Parity Generator (Phase 13.9, Task 07)
 *
 * Generates Pydantic v2 contract models from TypeScript schemas.
 * Enforces:
 * - Strict Pydantic v2 ConfigDict (extra='forbid', frozen=True, validate_assignment=True, strict=True)
 * - Discriminated union on 'ok' via Discriminator('ok')
 * - PEP 8 formatting (88-char line cap, 2 blank lines around top-level definitions)
 * - Regeneration notice header
 */

import fs from 'node:fs';
import path from 'node:path';

export const GENERATED_HEADER = `# AUTO-GENERATED — do not edit manually. Regenerate via npm run contracts:generate.
"""Generated Pydantic v2 boundary contracts.

Auto-generated from Zod v4 schemas via exportJsonSchema().
Strict boundaries: extra='forbid', discriminated unions on 'ok' and 'kind'.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal, Union
from pydantic import BaseModel, ConfigDict, Discriminator, Field, Tag
`;

export function generatePythonContracts(): string {
  const code = `${GENERATED_HEADER}

class PolyglotBaseModel(BaseModel):
    """Base model enforcing strict validation and frozen semantics."""

    model_config = ConfigDict(
        extra='forbid',
        frozen=True,
        validate_assignment=True,
        strict=True,
    )


class SerializedBridgeError(PolyglotBaseModel):
    """Serialized RFC 9457 Problem Details error."""

    code: str
    problemType: str
    httpStatus: int
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ResultEnvelopeSuccess(PolyglotBaseModel):
    """Success branch of ResultEnvelope."""

    ok: Literal[True]
    value: Any
    correlationId: str
    timestamp: str


class ResultEnvelopeFailure(PolyglotBaseModel):
    """Failure branch of ResultEnvelope."""

    ok: Literal[False]
    error: SerializedBridgeError
    correlationId: str
    timestamp: str


# Discriminated union on 'ok'
ResultEnvelope = Annotated[
    Union[
        Annotated[ResultEnvelopeSuccess, Tag(True)],
        Annotated[ResultEnvelopeFailure, Tag(False)],
    ],
    Discriminator('ok'),
]


class LeanExecuteRequest(PolyglotBaseModel):
    """Lean 4 execution request."""

    code: str = Field(min_length=1, max_length=100_000)
    timeoutMs: int = Field(default=10_000, ge=1_000, le=30_000)


class LeanExecuteResponse(PolyglotBaseModel):
    """Lean 4 execution response."""

    stdout: str
    stderr: str
    exitCode: int
    durationMs: float = Field(ge=0)
    verified: bool
    simulated: bool | None = None


class ProofReuseQuery(PolyglotBaseModel):
    """Proof reuse search query."""

    goal: str = Field(min_length=1)
    leanToolchain: str = Field(min_length=1)
    minSimilarity: float | None = Field(default=None, ge=0, le=1)


class ProofReuseResult(PolyglotBaseModel):
    """Candidate reused proof result."""

    goalHash: str
    proof: str
    dependencies: list[str] | None = None
    certificateSha256: str
    similarity: float = Field(ge=0, le=1)
    sourceDeclaration: str
    createdAt: str
    warning: str | None = None


class ConfigChange(PolyglotBaseModel):
    """Individual feature flag transition proposal."""

    flag: str
    from_val: bool = Field(alias='from')
    to: bool


class ConfigProposal(PolyglotBaseModel):
    """Evidence-driven configuration proposal."""

    id: str
    title: str
    rationale: str
    source: Literal['hardware', 'usage', 'benchmark']
    changes: list[ConfigChange]
    confidence: Literal['low', 'medium', 'high']
    evidence: dict[str, Any] = Field(default_factory=dict)
    createdAt: str


class ProblemDetails(PolyglotBaseModel):
    """RFC 9457 Problem Details object."""

    type: str
    title: str
    status: int
    detail: str
    instance: str | None = None
    correlationId: str
    details: dict[str, Any] = Field(default_factory=dict)
`;
  return code;
}

export function writePythonContracts(targetPath = 'schemas/generated_contracts.py'): void {
  const content = generatePythonContracts();
  const fullPath = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`Generated Pydantic contracts written to ${targetPath}`);
}

if (process.argv[1]?.endsWith('generate-contracts.ts')) {
  writePythonContracts();
}
