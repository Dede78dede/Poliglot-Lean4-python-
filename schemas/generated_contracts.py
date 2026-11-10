# AUTO-GENERATED — do not edit manually. Regenerate via npm run contracts:generate.
"""Generated Pydantic v2 boundary contracts.

Auto-generated from Zod v4 schemas via exportJsonSchema().
Strict boundaries: extra='forbid', discriminated unions on 'ok' and 'kind'.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal, Union
from pydantic import BaseModel, ConfigDict, Discriminator, Field, Tag


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


CertificationTier = Literal[
    'KERNEL_VERIFIED_TIER5',
    'NUMERIC_CERTIFICATE_UNVERIFIED',
    'SYNTAX_ONLY_UNVERIFIED',
    'DEGRADED_FALLBACK_UNVERIFIED',
    'UNAVAILABLE',
]


class NumericBounds(PolyglotBaseModel):
    """Numeric bounds representation."""

    lower: float
    upper: float


class ProofOutcomeCertified(PolyglotBaseModel):
    """Certified kernel verification outcome."""

    kind: Literal['certified']
    seal: Literal['SEAL_KERNEL_VERIFIED_TIER5']
    certificationTier: Literal['KERNEL_VERIFIED_TIER5']
    verified: Literal[True]
    digest: str
    axioms: list[str]


class ProofOutcomeNumericCertificate(PolyglotBaseModel):
    """Numeric certificate verified outcome."""

    kind: Literal['numeric-certificate']
    certificationTier: Literal['NUMERIC_CERTIFICATE_UNVERIFIED']
    verified: Literal[False]
    certificate: str
    methodUsed: Literal['interval', 'taylor-model', 'solver']
    bounds: NumericBounds | None = None


class CertifiedPayload(PolyglotBaseModel):
    """Payload for transport outcomes."""

    theoremName: str | None = None
    declarationCount: int | None = None
    unprovenCount: int | None = None
    axioms: list[str] | None = None
    durationMs: float | None = None


class ProofOutcomeTransport(PolyglotBaseModel):
    """Transport degraded outcome."""

    kind: Literal['transport']
    certificationTier: Literal['DEGRADED_FALLBACK_UNVERIFIED']
    verified: Literal[False]
    source: Literal['hybrid-adjudicator', 'bridge_fallback']
    payload: CertifiedPayload


class ProofOutcomePreflight(PolyglotBaseModel):
    """Preflight syntax outcome."""

    kind: Literal['preflight']
    certificationTier: Literal['SYNTAX_ONLY_UNVERIFIED']
    verified: Literal[False]
    syntaxValid: bool
    sorryFree: bool
    reason: str


class ProofOutcomeUnavailable(PolyglotBaseModel):
    """Unavailable engine outcome."""

    kind: Literal['unavailable']
    certificationTier: Literal['UNAVAILABLE']
    verified: Literal[False]
    reason: Literal['client_stub', 'adjudicator_unreachable', 'feature_disabled']


class ProofOutcomeMetadata(PolyglotBaseModel):
    """Metadata non-certifying outcome."""

    kind: Literal['metadata']
    certificationTier: Literal['SYNTAX_ONLY_UNVERIFIED']
    verified: Literal[False]
    note: str


# Discriminated union on 'kind'
ProofOutcome = Annotated[
    Union[
        Annotated[ProofOutcomeCertified, Tag('certified')],
        Annotated[ProofOutcomeNumericCertificate, Tag('numeric-certificate')],
        Annotated[ProofOutcomeTransport, Tag('transport')],
        Annotated[ProofOutcomePreflight, Tag('preflight')],
        Annotated[ProofOutcomeUnavailable, Tag('unavailable')],
        Annotated[ProofOutcomeMetadata, Tag('metadata')],
    ],
    Discriminator('kind'),
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


class VerificationRequest(PolyglotBaseModel):
    """Formal verification request contract."""

    requestId: str
    code: str = Field(min_length=1)
    toolchain: str = Field(default='v4.34.0')
    protocolVersion: str = Field(default='polyglot.verification.v1')


class VerificationResponse(PolyglotBaseModel):
    """Formal verification response contract."""

    requestId: str
    verified: bool
    verdict: str
    badge: str
    reason: str | None = None
    durationMs: float = Field(default=0.0, ge=0)


class SessionMetadata(PolyglotBaseModel):
    """Session metadata descriptor."""

    sessionId: str
    userId: str
    createdAt: str
    ttlHours: int = Field(default=72, ge=1)
    pinned: bool = False


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
