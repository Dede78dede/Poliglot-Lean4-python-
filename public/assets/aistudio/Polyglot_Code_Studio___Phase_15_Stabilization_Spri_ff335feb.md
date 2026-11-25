# Polyglot Code Studio — Phase 15 Stabilization Sprint

**Audience:** Google AI Studio implementation team, backend/Lean, frontend, security, QA and release engineering  
**Repository:** `Dede78dede/Poliglot-Lean4-python-`  
**Baseline:** GitHub `main`, commit `dfc8fa7816ecf5b7c290eebc0b741562d74b47ad`  
**Purpose:** close the release-critical trust, runner, integration and evidence gaps before starting the next product phase. This is an implementation brief, not a claim that the baseline has passed runtime verification.

## 1. Instruction to the implementation team

Implement the stabilization work against the exact baseline above. First confirm the working branch and commit, then inspect the current source, callers, deployment configuration, tests and CI. Do not infer behavior from the attached completion narrative or from a green report checked into the repository. Treat the findings below as source-grounded starting points; update them if the current branch proves otherwise, with exact file/line and executed-test evidence.

The latest `main` was fetched and its exact commit verified before an immutable source archive was created. The audit of that tree was static and read-only: no build, test, CI job, container, service probe or Lean/Kimina runtime was executed. Therefore every test count and PASS value in reports remains a claim until reproduced on the candidate commit.

The goal is a defensible `2.3.0-rc` candidate with truthful feature status and reproducible evidence. Do not promote to GA, claim Phase 15 fully verified, or start a dependent feature phase unless every blocking gate in Section 7 passes. If any real service or required environment is unavailable, leave the affected capability fail-closed and explicitly deferred; do not replace the missing evidence with a mock, simulation, string scan or documentation assertion.

## 2. Baseline findings to resolve

### 2.1 Proof authority and provenance

The local multi-kernel verifier is now fail-closed and no longer emits a locally synthesized positive result (`src/services/verification/multi-kernel-verifier.ts:128-169`). Preserve this behavior. It is progress, but not evidence that server-side dual-engine execution works.

The remaining trust concern is that `attachServerProvenance` is an exported helper that signs evidence supplied by its caller (`server/src/services/verification/hybrid-adjudicator.ts:133-151`). The HMAC payload in `server/src/services/verification/server-provenance.ts:39-53` omits fields that affect the adjudication, including target IDs, diagnostics and the axiom-audit record; it also does not authenticate the provenance ID. A valid HMAC over a partial subject must not be represented as proof that a kernel actually ran or that every verdict-relevant field is authentic. The HTTP consensus route rejects client-supplied engine evidence (`server/src/routes/lean.ts:139-150`), but that route guard alone does not establish the internal signing boundary.

### 2.2 Lake runner contract and isolation

The application writes sessions below `projects_store/<sessionId>` (`server/src/services/session-manager.ts:30,47-52`) and posts that path to the runner (`server/src/services/lean-project-runner.ts:299-307`). The runner only accepts existing projects below `/workspace/projects` (`docker/lean-runner/server.js:8,23-43`). The inspected Compose file does not mount a shared project-store volume between the application and runner (`docker-compose.yml:74-93`). The paths therefore do not form a demonstrated project-transfer contract.

The runner permits unauthenticated requests when `LEAN_RUNNER_AUTH_TOKEN` is empty (`docker/lean-runner/server.js:13-20`), while Compose defaults the token to empty and publishes runner/Kimina ports (`docker-compose.yml:54-64,74-85`). The runner is connected to both the internal Lean network and the ordinary application network. The timeout handler sends SIGTERM, but its later SIGKILL is conditioned on `!responded`; the timeout response sets `responded` first, so the delayed kill is suppressed (`docker/lean-runner/server.js:136-150`). The application and runner also advertise different Lean toolchain sets (`server/src/config/lean-runner-config.ts:4-13`; `docker/lean-runner/server.js:8-10`). These are source-level defects or mismatches to resolve, not runtime conclusions.

### 2.3 Wave completion is not established by source presence

- **W1 telemetry:** helpers and routes exist, but the production browser-to-server-to-exporter path, access control, request limits, redaction at the boundary and real collector delivery must be demonstrated. Keep telemetry disabled if no real collector is configured.
- **W2 LeanBeam:** the HTTP JSON-RPC client and speculative route exist. A mock server or a successful protocol-shaped response does not prove a real LeanBeam execution. Keep results explicitly speculative and non-certifying; disabled or unreachable states must be truthful.
- **W3 reasoners:** TreeThink can expose `proved` from a reported closed/zero-subgoal state without kernel execution (`src/services/proof/treethink/treethink-provider.ts:248-261`). Replace that semantic claim with an explicitly unverified candidate state. Mathesis scores and LP2 translation must not be represented as proof or semantic equivalence without the corresponding real evaluation.
- **W4 collaboration:** the WebSocket/Yjs server and UI code exist, but the collaboration panel does not pass the mounted Monaco instance to the runtime binding (`src/services/collaboration/yjs-runtime.ts:76-87`; `src/components/collaboration/CollaborationPanel.tsx:101-113`). Default-off deployment and test coverage of a custom protocol client are not proof that two real editor instances synchronize.

### 2.4 Release evidence and governance

CI is configured to run checks, build, bundle measurement, test runners and a seal sweep (`.github/workflows/ci.yml:22-61`). This proves wiring only, not a pass on the baseline. The checked-in bundle report has no commit or workflow-run identity and records O3 as `0.02 KB`, while the sign-off states `0.01 KB` (`reports/bundle-post-15.json:2-3,18-26`; `reports/phase-15-activation-signoff.md:40-45`). The sign-off also records dependency advisories while a stored npm audit report says zero vulnerabilities; reconcile these against the exact lockfile and a fresh CI run. `package.json` says `2.3.0-rc`, while the npm lock root says `2.2.0` and the Bun lock workspace name is `react-example` (`package.json:2-4`; `package-lock.json:1-10`; `bun.lock:1-8`).

## 3. Non-negotiable engineering rules

### 3.1 No magic strings, untyped state or duplicated contracts

Do not scatter protocol names, feature-flag keys, verdicts, error codes, route paths, toolchain lists, image identities or status labels as unrelated string literals. Define each contract once in a typed module/schema, validate it at runtime at process and network boundaries, and derive clients, tests and documentation where practical. Use discriminated unions rather than booleans that blur `candidate`, `simulated`, `unavailable`, `compiled`, `verified` and `failed`.

External protocols necessarily contain literal values. Preserve their exact required wire spellings, but centralize them in the protocol adapter/constants and validate them against the relevant schema. Do not rename or normalize a third-party field merely to make local types convenient. Reject unknown or malformed security-critical fields rather than silently coercing them.

### 3.2 No placeholders, fake success or test evasion

Production paths must not return canned success, synthetic proof output, guessed exit codes, default accepted evidence, fake peer counts, success-shaped fallback values or placeholder image/provenance identities. Do not add `TODO`, `FIXME`, `skip`, `todo`, `only`, expected-failure annotations, broad exception swallowing, disabled assertions, conditional test exits or weakened thresholds to make a gate green. Missing dependencies, unavailable services, malformed responses, timeout, cancellation and missing exit status must remain visible and non-certifying.

Do not “fix” a test by deleting the failing assertion or changing the expected value to match an incorrect implementation. For every regression, retain a test that fails against the defective baseline and passes against the fix. Record any intentional compatibility change and update the typed contract, callers and documentation together.

### 3.3 Mock policy: narrow use, never acceptance evidence

Mocks are allowed only where a real dependency cannot reasonably be substituted in a focused unit test, such as a pure mapping or deterministic error-classification branch. Retain existing mocks only where replacing them is not practical within this sprint. Name and isolate such tests as unit/fixture tests; they must never be counted as proof of real integration, security, runtime, regression acceptance or release readiness.

Do not use mocks, stubs, fakes, simulators or fixture-signed evidence for any positive certification test, dual-engine acceptance test, deployment test, W1–W4 activation claim or release gate. Those tests must cross the actual process/network/browser boundary and use real pinned services or binaries. Mock-based tests may supplement negative unit coverage but cannot replace a failing or unavailable real integration gate. If the real dependency cannot be provisioned, mark that feature `DEFERRED`/off and the corresponding release gate `BLOCKED`; do not report PASS.

### 3.4 Correct trust and cryptographic semantics

Lean kernel acceptance establishes that a proof term checks relative to the imported environment and axioms; it does not establish that the formal statement matches informal intent. The team must distinguish theorem/kernel acceptance, axiom policy, source/context identity and product-level interpretation. Lean’s reference describes checking transitive axioms, including detection of `sorryAx`, and recommends stronger checks for potentially misleading or malicious proof attempts [1].

A MAC authenticates bytes to holders of its shared secret; it does not independently prove that a kernel executed. If HMAC is retained, use a protected, required, rotatable key and a canonical, versioned envelope. Include every field that can affect the verdict, canonicalize before signing, verify the exact same envelope before adjudication, and bind the attestation to the trusted execution service, exact request, source/context/manifest, target set, toolchain, immutable image digest, outcome, exit status, diagnostics and axiom audit. Include the unique provenance identifier/nonce in the authenticated payload and enforce one-time use. A cryptographic attestation is execution provenance, not a substitute for Lean’s kernel checking [2] [3].

## 4. Selected target design

### 4.1 Certification boundary

Keep one server-owned certification service as the only issuer of `verified: true` and the Tier-5 seal. Remove generic exported minting from caller-accessible modules. The issuer must own the complete flow: validate the request; compute source and context digests; invoke authenticated, pinned Kimina and Lake services against the same immutable source/context/target set; validate both structured responses; collect actual exit status and axiom telemetry; create the canonical attestation; and adjudicate only those verified attestations.

Keep simulator, preflight parser, heuristic reasoner, cached candidate, HTTP success alone, missing diagnostics and build-only states non-certifying. For any missing, stale, mismatched, mutated, replayed or unverifiable evidence, return `unconfirmed`, `verified: false` and no seal. Preserve the local multi-kernel verifier’s fail-closed behavior. If a supported deployment cannot execute both required engines, report unavailable rather than success.

Use a versioned discriminated result contract shared by TypeScript callers and API responses. Validate at ingress and egress. Define the REST contract in OpenAPI and use RFC 9457 `application/problem+json` for machine-readable HTTP errors; the actual HTTP status and the body’s status must agree [4] [5].

### 4.2 Workspace transfer and runner security

Use one canonical named volume mounted at the same absolute project root in the application and runner. Configure the application’s session manager to write there. The runner receives a validated session UUID, never an arbitrary absolute path. Mount source projects read-only into the runner; copy only regular files into a newly created per-job scratch workspace after rejecting symlinks, traversal, unsupported paths, excessive counts and sizes. Run Lake only in the scratch directory and discard it after the job. Keep build caches separate, read-only where safe, and keyed by exact Lean/Mathlib identity.

Attach the runner only to a dedicated internal network shared with the required caller. Do not publish runner or Kimina ports to the host in production. Restrict outbound network from proof execution; provide only pre-fetched, pinned dependencies. Require non-empty service credentials at startup and fail closed if missing. Use Compose secrets or the deployment’s secret manager rather than committed values or empty-token defaults [6] [7]. Run containers as non-root with minimum capabilities and effective CPU, memory, PID, disk, output and concurrency limits. Pin externally sourced container images by digest and record the image identity used for each run [8].

Fix cancellation by supervising the process group/job, sending a graceful termination, then force-killing the entire group after a bounded grace period regardless of whether the HTTP response was already sent. Consume and validate the complete response body before considering the upstream request finished. Add readiness checks that prove the configured toolchain and a bounded real Lake smoke build are available; a static `200` response or list of advertised toolchains is not readiness.

### 4.3 W1–W4: implement for real or explicitly defer

For every wave choose exactly one release state: **runtime verified** or **deferred and default-off**. Do not label a source file, feature flag, mock suite or protocol-shaped payload as an active integration.

- **W1:** connect the browser, production Express middleware and a real collector; verify trace context propagation, parent/child linkage, redaction, authentication/authorization, size/rate bounds, exporter failure behavior and non-blocking operation. If no collector is part of the supported deployment, keep the feature off and document that it is deferred.
- **W2:** call a real configured LeanBeam endpoint using a bounded request and actual cancellation. Validate JSON-RPC version, response ID, request/response schema, timeout and client disconnect behavior. Keep results explicitly speculative; only the certification service can produce verified status.
- **W3:** Mathesis and TreeThink must call configured real services or remain disabled. Treat their outputs as candidate generation only. Replace TreeThink’s `proved` with a non-certifying candidate status. LP2 must parse only an explicitly supported grammar and reject unsupported syntax; do not claim semantic equivalence unless an independent real compiler/kernel-backed check establishes it.
- **W4:** connect two real browser clients to the deployed WebSocket server, bind each mounted Monaco model to a Yjs document, and prove concurrent edits converge without feedback loops or lost updates. Verify production origin/token policy, per-room isolation, disconnect/awareness cleanup, persistence and reconnect. If this cannot be proved, keep the feature off and describe it as deferred.

### 4.4 Reproducible CI and release dossier

Choose npm as the canonical package manager for this sprint because the package scripts and CI use npm. Align `package.json` and `package-lock.json` exactly, resolve or formally retire the inconsistent Bun lock, then demonstrate a clean `npm ci --ignore-scripts`. Run the full CI matrix on the exact candidate commit. Do not infer a pass from a stored report or a previous run.

Replace decorative or hard-coded test totals with machine-readable results from actual test execution. Each required suite must report its identity and executed assertion count; zero-test, skipped, pending, quarantined or failed suites must fail or be explicitly visible and block release as policy requires. Preserve the complete raw logs and test/build artifacts. Bind every report to commit SHA, workflow run ID, command, dependency lock digest, toolchain and artifact digest. Pin GitHub Actions to verified full commit SHAs or an approved workflow dependency lockfile and use minimum token permissions [9].

Run a fresh dependency audit on the exact lockfile and reconcile the sign-off advisory statement with the archived npm report. Scan current source and repository history using an approved history-aware secret scanner; do not print secret values. Any real credential exposed in history must be revoked and rotated before release. Recompute all bundle metrics from the candidate build; reconcile O3 and make every metric used by the ADR a blocking CI threshold. No report may be labelled PASS without the matching successful build artifact and run identity.

## 5. Workstreams and execution order

This is a high-risk stabilization sprint, not a promise that all underlying platform work fits a fixed calendar duration. Use size **L** for engine trust and isolated runner work; **M/L** for browser/provider integration; **M** for CI and release evidence. If capacity is insufficient, split the work, retain the gate, and do not reduce test rigor.

| Workstream | Owner responsibility | Deliverable | Dependency |
|---|---|---|---|
| A — Trust and Lean | Certification authority, complete attestation contract, real dual-engine execution, axiom policy, non-certifying states | One trusted issuer; immutable versioned evidence; actual positive/negative Lean integration run; adversarial mutation/replay tests | Agree typed contract and engine policy before parallel implementation |
| B — Runner and platform security | Shared workspace contract, toolchain/image pinning, runner auth, network and process isolation, readiness | Reproducible Compose deployment; real Lake build; negative isolation/timeout tests; no public runner port | Coordinate canonical path, volume and protocol with A |
| C — W1–W3 services/contracts | Real collector, LeanBeam and reasoner integrations or explicit safe deferral; truthful result states | Runtime-tested service paths or default-off statuses; runtime schema validation; no false `proved`/verified claim | Use contract from A and typed error/API schemas |
| D — W4 collaboration | Monaco/Yjs binding, auth/origin, room lifecycle, persistence and browser tests | Two real browser contexts editing the same workspace; convergence, recovery and isolation evidence, or documented deferral | Editor-state API and deployment credentials from B |
| E — QA, CI and release | Full test inventory, no-bypass regression, supply chain, bundle, secret history, reports and sign-off | Required same-SHA CI run with logs/artifacts; corrected version/lockfiles; truthful release matrix | Integrate A–D; cannot waive their gates |

Execution order: (1) freeze the SHA and decide for each wave `runtime verified` versus `deferred/off`; (2) approve typed contracts and threat model; (3) implement A and B before any positive certificate path is enabled; (4) implement C and D against the approved contracts or defer them; (5) run the full E release pipeline on the integrated candidate; (6) update docs only after evidence exists.

## 6. Regression and acceptance test matrix

All tests below must be committed and included in required CI. A test counts only when it ran against the candidate and its real dependencies where specified. The test report must identify the command, SHA, environment, exit status, suite and artifact.

### Authority and proof execution

- A positive certification test starts the actual pinned Kimina and Lake engines, submits the same immutable source/context/targets/toolchain, observes both real execution outcomes and yields a valid verified attestation only after both engines and the axiom policy pass.
- Negative real-engine cases cover invalid Lean, a theorem with `sorry`/`sorryAx`, a disallowed axiom, disagreement, missing engine, non-zero/missing exit status, timeout, cancellation, malformed response, toolchain/image/manifest/source/context/target mismatch and absent axiom telemetry. Each must remain non-certifying.
- Adversarial unit tests may use deterministic evidence fixtures only to test canonicalization, signature verification and field-tamper rejection. Such tests must be labelled unit-only and must never be counted as proof of actual execution. Mutate every verdict-relevant field independently, including provenance ID, diagnostics, targets, outcome and axiom audit. Replay, expiry, clock skew, key rotation and multi-process behavior must be covered.
- Exercise every production call path—HTTP route, MCP, FEMEV, client verifier and UI—to prove there is no alternate issuer or route to a seal. Static scans supplement these tests; they do not replace them.

### Runner and deployment

- From a clean Compose build, submit a real project through application staging to the isolated runner. Confirm the runner sees exactly the intended files under its canonical root, builds the required Lake target and cannot read another session’s workspace.
- Test traversal, absolute paths, symlinks, hard links where applicable, oversized body/file/count, concurrent jobs, disk exhaustion, malformed JSON, invalid/empty token, wrong token, missing secret, unavailable dependency, unavailable toolchain and container restart.
- Verify a timeout actually terminates the complete Lake process tree and leaves no orphan; confirm output truncation and job cleanup without losing the failure status. Confirm health/readiness fails when the engine cannot execute the required smoke build.
- Verify the runner and Kimina are unreachable from the host in production deployment, the runner has no unrestricted egress, and effective resource limits are applied rather than merely declared.

### Wave acceptance

- W1 uses a real collector and production middleware; inspect a real browser request and resulting server/exported spans and associated logs. Test malformed trace context, forbidden origins, payload limits, redaction and collector outage.
- W2 calls a real LeanBeam service; test bounded fanout and actual cancellation on timeout/client disconnect. Confirm output cannot be used to create a seal.
- W3 calls real configured services for any wave marked runtime verified. Test malformed responses and unavailable service. Test that a closed TreeThink goal stays a candidate until real kernel verification; test LP2’s supported grammar and rejection behavior.
- W4 uses two real browser clients with actual Monaco models and the running WebSocket service. Verify simultaneous edits, room isolation, authorization, origin rejection, persistence, reconnect and resource cleanup.

### Reproducibility, security and release

- A clean runner executes lockfile install, typecheck, contracts, architecture/authority checks, flags, build, every required test suite, bundle metrics, current/history secret scans and npm audit. Any failed or unavailable required dependency fails the job; no conditional skip or mock substitution is allowed.
- Inject a known failing test and a deliberately violated budget in a controlled CI validation branch to prove each gate fails. Do not merge the intentional failure. Verify test discovery sees all required suites and rejects zero executed checks.
- Reconcile package version, lockfiles, npm advisories, bundle report values, suite counts, ADR and README/CHANGELOG. Verify all report data is generated from the same build and exact commit.

## 7. Blocking gates and Definition of Done

**G0 — Baseline and scope:** the implementation branch records the exact parent and candidate SHA; every Wave is classified `runtime verified` or `deferred/off`; contracts and supported toolchains are approved. No results from another SHA are reused as evidence.

**G1 — Authority:** no client, browser, MCP, FEMEV, simulator, fallback, reasoner or generic helper can issue certification. Only the trusted execution service can produce a complete, signed attestation after actual authenticated engine execution. Every tamper/replay/mismatch test fails closed. The one positive certification path is demonstrated with real engines.

**G2 — Runner:** canonical workspace transfer works in clean deployment; project isolation, required credentials, pinned toolchains/images, egress restrictions, limits, readiness and full process termination are demonstrated. No runner or proof backend port is unintentionally published.

**G3 — Waves:** each included Wave has real boundary-crossing acceptance evidence. A Wave that cannot pass remains off and is documented as deferred, with no production success-shaped placeholder. Mocks are not used as acceptance evidence.

**G4 — CI and supply chain:** clean install and all required gates pass on the exact candidate SHA; test execution is machine-reportable and non-zero; history-aware secret scan and fresh dependency audit are complete; reports contain SHA/run/artifact provenance; package/lock metadata and bundle figures agree.

**G5 — Documentation and release decision:** README, changelog, ADR, sign-off and feature matrix match the implementation and actual CI evidence. Open residual risks are listed with disposition. The product/security/release owners explicitly approve the next phase or release decision.

If G1 or G2 is not met, the result is **NO-GO** for proof certification and for a dependent product phase. If a Wave is deferred, that does not by itself block unrelated work only when it is default-off, inaccessible as a success path, accurately documented and explicitly accepted by the product owner. Under the currently agreed plan, however, the next product phase remains blocked until G0–G5 pass or the owner explicitly revises the scope in writing. GA additionally requires successful external/container E2E, as the current ADR and launch checklist already specify.

The Definition of Done is evidence-based: code merged; contract and migration documented; real tests executed on the same SHA; no placeholders or disguised fallback; negative cases fail closed; logs and reports reproducible; no unresolved P0; and no claim stronger than the demonstrated behavior. A test existing in the repository, a test count in prose, a static scan, a health endpoint or a checked-in report is not a passing execution result.

## 8. Required sprint completion report

Before asking for acceptance, provide one concise report containing: exact baseline and candidate SHAs; changed modules; each G0–G5 result; commands and raw CI run link/ID; per-suite execution summary including failures/skips; container and toolchain image digests; real engine integration evidence; current npm audit disposition; bundle metrics generated by the candidate build; Wave status and user-visible behavior; security findings fixed or remaining; and the explicit next-phase/RC/GA recommendation.

Do not state “complete”, “verified”, “all tests passed”, “no open issues” or “ready for release” unless the corresponding gate has actually passed on the named candidate and the evidence is attached. When a required external service is unavailable, state `BLOCKED` and the missing dependency; do not manufacture a green result.

## References

[1]: https://lean-lang.org/doc/reference/latest/ValidatingProofs/ "The Lean Language Reference: Validating a Lean Proof"
[2]: https://www.rfc-editor.org/rfc/rfc2104.html "RFC 2104: HMAC Keyed-Hashing for Message Authentication"
[3]: https://www.rfc-editor.org/rfc/rfc8785.html "RFC 8785: JSON Canonicalization Scheme"
[4]: https://spec.openapis.org/oas/v3.1.0.html "OpenAPI Specification Version 3.1.0"
[5]: https://www.rfc-editor.org/rfc/rfc9457.html "RFC 9457: Problem Details for HTTP APIs"
[6]: https://docs.docker.com/compose/how-tos/networking/ "Docker Compose: Networking"
[7]: https://docs.docker.com/compose/how-tos/use-secrets/ "Docker Compose: Manage Secrets Securely"
[8]: https://docs.docker.com/build/building/best-practices/ "Docker: Building Best Practices"
[9]: https://docs.github.com/en/actions/reference/security/secure-use "GitHub Actions: Secure Use Reference"
