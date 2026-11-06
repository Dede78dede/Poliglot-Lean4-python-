# Implementation Plan Review and Required Revisions

**Audience:** Google AI Studio implementation agent and Polyglot development team  
**Project:** Polyglot Code Studio — `Dede78dede/Poliglot-Lean4-python-`  
**Repository baseline:** branch `main`, commit `296a69d16095adcd2dab26d3225332547af725c2`  
**Document purpose:** revise the proposed implementation plan before execution; preserve confirmed product scope while correcting assumptions, interfaces, verification semantics, sequencing, and acceptance gates.  
**Document language:** English, as requested for project documents.

## 1. Confirmed decisions and accepted planning inputs

Use the following as confirmed project direction when revising the implementation plan:

1. **Product scope:** the target is the complete modular IDE workspace, not only the current root demo. Preserve the planned full IDE capabilities, including the dual Lean 4/Python editing experience, workspace/navigation features, persistent Python notebook, and status-bar functionality, subject to the repository audit and release gates below.
2. **Lean pathways:** both pathways are in scope:
   - **Interactive snippet pathway:** low-latency feedback through Polyglot’s `/api/v1/lean/execute` and a real Kimina Lean Server deployment.
   - **Project build pathway:** multi-file project compilation through `/api/v1/projects/lean/build` and a real, isolated Lake runner.
3. **Hybrid comparison policy:** the product should compare both pathways when their inputs and environments are demonstrably comparable. A positive final consensus is allowed only when both required checks agree on the same source and verification scope. If they disagree, one result is missing, or comparability cannot be established, the final verdict is **unconfirmed**. Keep the two engine results visible as separate evidence.
4. **Planning baseline:** accept the Phase 14 test-count and bundle-size statements supplied by the Google AI Studio implementation agent as trusted project planning inputs. Carry them forward with their reported provenance; do not present this review as having rerun them. New implementation and release gates must still run against the exact candidate commit.
5. **Delivery format:** English project documentation. The review discussion with the project owner may remain in Italian.

Do not relabel decisions as “confirmed by interview” unless they are decisions listed above or the product owner separately confirms them. Other requirements in the existing plan should be retained where compatible and identified as proposed scope, not silently upgraded to approved requirements.

## 2. Required corrections to the submitted plan

Revise the plan rather than accepting it unchanged. Keep its overall five-sprint shape where practical, but correct the following items.

### 2.1 Baseline and claims

Keep the supplied Phase 14 figures—165 suites, 260 sub-tests, 100% passing, and a 150.01 KB main bundle under the 180 KB budget—as trusted baseline statements from the implementation agent. Preserve whatever source/run/commit attribution that agent supplied. Do not claim that this review independently reran them. The release candidate must still have fresh required checks tied to its own commit; historical or baseline success cannot substitute for candidate verification.

Retain all high-value IDE requirements from the implementation plan, but schedule the full shell integration after the verification contracts and the core vertical execution path are stable. The existing modular UI code must be audited and wired intentionally; component presence alone is not evidence that a feature works.

### 2.2 Router and dependency wiring

Do not instruct developers to mount a factory that has not been confirmed in the repository. At the reviewed commit:

- `createLeanRouter(proxy)` is defined in `server/src/routes/lean.ts`.
- `createProjectsRouter(runner)` is defined in `server/src/routes/projects.ts`.
- The route inventory examined did not contain a `createKiminaRouter()` factory.

Update the plan to mount only real, audited factories. Instantiate and inject the required `KiminaClientProxy` and `LeanProjectRunner`, then mount their routers under the approved prefixes. If a separate Kimina administration or diagnostics router is required, first define its responsibility, implementation, authentication, and tests; do not refer to it as an existing factory.

The snippet and project endpoints may be mounted before the real runner is ready only if all unavailable/incomplete results fail closed and no UI or API can label them verified. A route returning a temporary typed `unavailable` result is safer than an unimplemented endpoint or SPA fallback.

### 2.3 Worker path

Use the audited repository paths. The relevant files found at the baseline include `src/workers/notebook.worker.ts` and `src/workers/pyodide.worker.ts`; the submitted plan’s `src/services/notebook/notebook.worker.ts` path was not found. The audit must identify which worker owns Python execution and notebook message handling before the plan assigns changes.

### 2.4 Schedule and dependency order

Keep the five planned sprints as a planning frame, but make dependencies explicit:

- Sprint 1 may remove false UI claims, disable heuristic certification, approve API/result contracts, and mount existing routers. It must not enable positive verification badges until Sprint 2 has a real Kimina adapter, real Lake runner, and passing negative tests.
- Move the minimum Lean runner Dockerfile/Compose fixes, runner readiness, and safe workspace transfer into the runner sprint. These are prerequisites to exercising the project-build pathway; they cannot be deferred entirely to final release hardening.
- Schedule the full modular IDE integration after the core result contract is frozen, but retain it as a required delivery objective.
- Keep final CI reconciliation, full Compose validation, documentation synchronization, and release-candidate evidence in the release sprint.

Do not describe the five sprints as guaranteed calendar estimates. The plan should state that scope, capacity, and any changes to sprint sizing are owned by the delivery team.

### 2.5 Replace source-text gates with behavioral gates

Do not use “`App.tsx` contains zero `setTimeout` success handlers” as the primary acceptance test. It is acceptable as a static lint check, but it does not prove correct runtime semantics. Require tests that demonstrate that an unchanged, invalid, stale, simulated, timed-out, or unavailable request can never produce a verified result or Tier 5 badge.

Likewise, “all suites pass” must identify the exact suites and command invoked. Do not treat a static count, a tautological test, a green health response, or an HTTP 2xx status as evidence that Lean ran.

## 3. Evidence from the real Kimina contract and the Polyglot adapter

The Kimina project currently exposes two relevant wire contracts in its public source:

- The current check API uses `/api/check`, with a list of snippets identified by `id` and source `code`; the response is a list of results that includes the corresponding `id`, elapsed time, optional service error, Lean response, and diagnostics. The Lean response can include structured `messages` and `sorries`.
- The backward-compatible `/verify` API accepts `codes` with `custom_id` and `proof` or `code`, and returns results keyed by `custom_id`. It is a legacy compatibility route, not the same JSON contract as `/api/check`.

At the Polyglot baseline, `server/src/services/kimina-client-proxy.ts` calls `/verify`. Its Zod response schema models messages and service errors but does not preserve the structured `sorries` array. It also consumes `results[0]` rather than requiring an exact correlation-ID match. The verification formula then derives status from textual diagnostics and source-string checks. These behaviors must be corrected before the proxy can participate in hybrid consensus.

**Required decision:** pin a Kimina Server release/image digest and its Lean version, then implement one explicit versioned adapter for that exact upstream contract. The preferred target is the current `/api/check` contract. If the deployment must retain `/verify`, its compatibility contract must be pinned and tested with all fields needed for verification, including `sorries`; do not silently mix `/verify` field names with `/api/check` assumptions.

The adapter must validate the response at runtime, require exactly one response for the submitted snippet ID, reject duplicate/missing/unexpected IDs, preserve structured messages and sorries, and distinguish Lean errors from REPL/server errors, timeout, rate limit, unavailable service, malformed JSON, and simulated output. Do not infer a timeout by searching human-readable error text when the local request/transport layer can report a typed timeout.

Kimina’s public client model defines separate outcomes including `valid`, `sorry`, `lean_error`, `repl_error`, `timeout_error`, and `server_error`. Its validity analysis checks Lean errors and the structured `sorries` list. Preserve this distinction in Polyglot’s adapter; do not collapse every outcome into `exitCode: 0` or a boolean.

## 4. Robust hybrid architecture: compare evidence, do not merge unlike results

### 4.1 Responsibility of each pathway

**Kimina snippet pathway:** provide fast interactive elaboration and structured Lean diagnostics for the submitted snippet in a configured Lean/REPL environment. For a stand-alone tactic fragment, construct and hash the exact theorem statement, context, imports, and wrapper sent to Kimina. The result is scoped to that submitted source and that Kimina environment.

**Lake project pathway:** build the actual multi-file project in an isolated workspace, using its pinned `lean-toolchain`, `lakefile`, and `lake-manifest.json`, and the explicit module/target requested by the caller. Return the actual Lake process result and the target coverage. Run the required axiom audit for the requested declarations as a separate structured step.

A snippet and a project build are not automatically comparable. Kimina’s server runs a REPL configured for a project environment; it does not become an arbitrary per-request Lake workspace merely because the caller sends a project path. For a project with local modules or custom dependencies, Kimina may participate in final consensus only if the deployed Kimina environment is explicitly provisioned with the same project content, imports, toolchain, dependencies, and target scope. If that cannot be demonstrated, retain the Kimina result as supplemental fast feedback and return `unconfirmed` for the requested hybrid verdict.

### 4.2 Agreement rules

Compare normalized semantic outcomes, not the raw wording or byte-for-byte equality of diagnostic messages. Message order and presentation may differ between REPL and Lake even when their relevant verdicts agree.

Set the final verdict to `confirmed_valid` only if all of the following are true:

1. Both Kimina and Lake completed in real mode; neither is simulated, heuristic, or fallback.
2. Both results refer to the same immutable request, source digest, generated wrapper/context digest, scope, exact target set, Lean toolchain, dependency-manifest digest, and verification policy.
3. Kimina returns the matching snippet ID and a structurally valid `valid` outcome: no Lean error and no structured `sorries`.
4. Lake built the requested target and returns an explicit process exit code of `0`; the target list and source/dependency digests match the request.
5. The axiom audit completed for every requested theorem and passed the configured allowlist. A successful build without this audit is not a clean axiom-policy result.
6. Every required target has a result; there are no duplicate, missing, stale, malformed, or contradictory results.

Set the final verdict to `confirmed_invalid` only when both comparable real checks support rejection under the same policy. A compile/proof failure must remain distinct from infrastructure failure. If one engine accepts while the other rejects, report disagreement and return `unconfirmed`, not the result from whichever engine happened to finish last.

Return `unconfirmed` whenever the paths are not comparable, only one completed, a timeout or service fault occurred, an input changed while execution was in flight, a result is missing, an unknown status was received, or the result came from simulation/fallback. Preserve each engine’s own status and diagnostics so the user can see why consensus was not reached.

A two-path agreement is a **cross-path consistency policy**, not proof by two independent mathematical authorities. Both paths ultimately rely on Lean and may share the same Lean version, libraries, trusted axioms, and implementation. Do not market agreement as an independent double-kernel proof, a cryptographic signature, or proof that the formal statement matches the user’s informal intent. The Lean reference explains that the kernel checks proof terms relative to their declarations and axioms; a separate axiom audit is needed for dependency policy. [1] [2]

### 4.3 Axiom policy

Use the explicit default allowlist confirmed for this plan: `propext`, `Classical.choice`, and `Quot.sound`. Reject `sorryAx`, `_native`-related axioms, and custom axioms unless the product owner approves a documented project-specific exception. Record the policy ID and the full observed axiom set for each target. Do not infer absence of axioms from source regexes or warning text.

Use Lean’s supported axiom-reporting mechanism for each requested declaration, including transitive dependencies. The Lean reference notes that a kernel-accepted theorem can still depend on `sorry` or incomplete dependencies; `#print axioms` exposes those dependencies. For a threat model that includes actively malicious Lean/meta-program code, isolate the runner and assess the additional Lean checker described by the reference; do not claim that normal project compilation alone eliminates every malicious-code risk. [1] [2]

## 5. Canonical protocol, nomenclature, typing, and serialization

Create a Polyglot-owned, versioned protocol. Do not expose Kimina’s upstream wire schema directly to the UI, and do not let each pathway invent its own interpretation of `verified`. Define the contract in OpenAPI 3.1 using the supported JSON Schema dialect, then generate or drift-check TypeScript/Zod and Python/Pydantic runtime validators against the same versioned fixtures. OpenAPI 3.1’s Schema Object is based on JSON Schema Draft 2020-12 and supports discriminated alternatives. [3]

Use stable Polyglot-owned camelCase names on the internal/public Polyglot protocol. Keep upstream names such as Kimina `custom_id`, `sorries`, or `time` inside its version-specific adapter and map them once. Do not serialize `NaN`, infinity, duplicate JSON object keys, or implicit unit conversions. Network JSON must be UTF-8. [4]

The canonical request must carry these fields:

- `protocolVersion`: fixed protocol identifier, initially `polyglot.verification.v1`.
- `requestId`: UUID identifying this logical comparison; each upstream subrequest is linked to it.
- `scope`: discriminated value `snippet` or `project`, plus the exact non-empty target IDs.
- `sourceDigest`: SHA-256 of the exact bytes submitted for checking. For a project, define and version a deterministic workspace-digest algorithm over normalized relative paths and file contents; include all checked files.
- `contextDigest`: SHA-256 identifying the generated wrapper, imports, and other context used by the snippet check.
- `environment`: exact Lean toolchain identifier, Kimina server version/image digest, Lake runner image digest, and dependency manifest digest where applicable.
- `axiomPolicyId`: stable identifier of the allowlist policy applied to the requested target(s).
- `requireConsensus`: `true` for the final hybrid verdict requested by the product.

Each engine result must carry:

- `engine`: `kimina` or `lake`.
- `contractVersion`: pinned upstream adapter or runner protocol version.
- `outcome`: one of `accepted`, `rejected`, `inconclusive`, `unavailable`, or `simulated`.
- `requestId`, `sourceDigest`, `contextDigest`, toolchain, manifest digest, and exact target IDs.
- `startedAt` and `completedAt` as RFC 3339 UTC timestamps; `durationMs` as a non-negative integer or `null` if not measured.
- `exitCode`: an integer only when an actual process exit code exists; otherwise `null`. Kimina’s HTTP/REPL outcome must not be fabricated into an OS process exit code.
- `diagnostics`: typed records with severity, message, optional stable code, file path, and source position. Define the coordinate base/encoding in the contract; preserve Kimina’s coordinates in the adapter and convert them once for the editor.
- `axiomAudit`: `passed`, `failed`, `not_run`, or `not_applicable`, with `observedAxioms` and `allowedAxioms` explicitly represented. Kimina may report `not_run`; Lake must not claim it passed unless the audit was actually run.
- `error`: `null` on a normal result, or a typed code and retryability classification for infrastructure/protocol errors. Do not parse free-text `detail` to make programmatic decisions.

The final comparison result must carry:

- `protocolVersion`, `requestId`, `sourceDigest`, `contextDigest`, `scope`, `targetIds`, and `axiomPolicyId`.
- `verdict`: `confirmed_valid`, `confirmed_invalid`, or `unconfirmed`.
- `agreement`: `agree_valid`, `agree_invalid`, `disagree`, `not_comparable`, or `incomplete`.
- The complete `kimina` and `lake` subresults, not only a final boolean.
- `verified`: if retained for backward compatibility, it is derived server-side as exactly `verdict === "confirmed_valid"`; no UI, client, simulator, or heuristic can set it independently. Prefer migrating consumers to `verdict` and deprecate the boolean.

Expected proof rejection is a normal typed verification result, not an HTTP transport error. Use RFC 9457 Problem Details for API/request/server failures with `Content-Type: application/problem+json`; the HTTP status and Problem Details `status` must agree. Clients must use stable fields/codes rather than parsing human-readable `detail`. [5]

### 5.1 UI mapping

- `confirmed_valid`: display “Verified — Kimina and Lake agree”, show the target, toolchain, policy, and provenance, and permit the approved verification badge.
- `confirmed_invalid`: display failure and the specific engine diagnostics; do not show a verified badge.
- `unconfirmed`: display “Verdict not confirmed”, list each engine outcome and the reason (disagreement, context mismatch, timeout, missing result, unavailable service, or simulation); do not show a verified badge.
- `simulated`: display an unmistakable non-certifying warning and never count the result as either side of consensus.

Only successful results for the current source/context digest may update the visible current editor state. Late responses for superseded source digests must be retained as stale job records or ignored by the active view, never attached to new text.

## 6. Revised five-sprint execution sequence

### Sprint 1 — Epistemic truthfulness, interface freeze, and route wiring

**Workstreams:** Lean trust, API, UI, QA, architecture.

- Remove the hard-coded successful Lean result and Tier 5 badge from the root UI.
- Disable Auto-Prove’s string-matching path from setting `kernelVerified`; until a real prover path is available, expose it as a suggestion/heuristic or return a typed disabled/unavailable result.
- Approve the Polyglot verification protocol, upstream Kimina version/API contract, comparison rules, axiom policy, and UI state mapping in an ADR.
- Mount only audited Express router factories with their injected dependencies. Remove `createKiminaRouter()` from the plan unless a concrete implementation is first added and reviewed.
- Implement real liveness and capability-aware readiness; an optional Kimina service outage must not make unrelated Python or IDE capabilities falsely unavailable.
- Add behavioral tests proving that static, stale, simulated, or missing backend results cannot set a verified state.

**Gate S1:** no local/demo code can emit `confirmed_valid` or `verified`; route inventory and dependencies match the approved manifest; interface schemas and tests are reviewed.

### Sprint 2 — Real Kimina adapter, Lake runner, and hybrid adjudicator

**Workstreams:** Lean trust, runner/platform, API, security, QA.

- Pin a Kimina release/image digest and Lean version. Prefer the current `/api/check` wire contract. If retaining legacy `/verify`, test and model its `custom_id` response contract and all proof-relevant fields.
- Replace the current partial Kimina parser with a versioned adapter that validates the entire response, including `id`/`custom_id`, structured `messages`, `sorries`, service errors, diagnostics, and batch cardinality.
- Implement the isolated Lake runner against the actual project workspace and explicit target. Pin `lean-toolchain`; use and validate the checked-in `lake-manifest.json` without silently updating dependencies during a verification request.
- Correct the runner Dockerfile/Compose path now, not only in the release sprint. Use a real `/build` endpoint/process, workspace upload or an explicitly shared volume, resource limits, no unnecessary host port, and functional readiness.
- Reject missing or malformed process exit code, missing target result, partial output, timeout, cancellation, and HTTP 2xx without a real build as success.
- Run the per-target axiom audit and apply the confirmed allowlist.
- Implement the comparator exactly as in Section 4; store per-engine evidence and only issue consensus after comparability checks.

**Gate S2:** positive theorem, false theorem, `sorry`, `admit`, disallowed axiom, missing target, stale source, upstream error, fake HTTP 200, missing exit code, timeout, malformed response, mismatched toolchain/context, and Kimina/Lake disagreement all have expected fail-closed outcomes. Only identical comparable positive results with passing axiom policy can produce `confirmed_valid`.

### Sprint 3 — Cross-language contracts, worker lifecycle, and security

**Workstreams:** contracts/Python, API, security, QA.

- Establish OpenAPI 3.1/JSON Schema as the canonical Polyglot protocol description; generate or verify TypeScript/Zod and Python/Pydantic validators from the same version.
- Replace placeholder contract artifacts and simulated parity tests with actual validators against a shared fixture corpus.
- Cover required/null, additional fields, string/number coercion, enum/discriminator, aliases, serialization, error payloads, diagnostic coordinate conversion, Unicode, and boundary values.
- Correct the audited worker path. Define request IDs, ordered response correlation, typed error cases, cancellation, timeout, worker startup failure, stale response handling, and cleanup.
- Configure fail-closed production CORS, route-level authentication/authorization, explicit pre-auth IP rate limiting and post-auth user/tenant quotas, bounded request sizes, and dedicated MCP tests.

**Gate S3:** generator output is clean; runtime validators agree on the approved fixture semantics; unknown or malformed upstream fields cannot create a positive status; security and worker failure-path tests pass.

### Sprint 4 — Full modular IDE integration and accessibility

**Workstreams:** frontend/workspace, API integration, accessibility, QA.

- Integrate the approved modular IDE shell, editor tabs, split view, breadcrumbs, project navigation, notebook and all status-bar zones required by the project scope.
- Connect all visible actions to real stores/services/providers; audit provider mounting and lifecycle rather than importing components without wiring them.
- Show Kimina and Lake subresults and the hybrid verdict without conflating compilation, kernel acceptance, axiom audit, simulation, fallback, or unconfirmed outcomes.
- Implement accessible status/error announcements, keyboard operation, visible focus, stable labels, editor diagnostics, and correct browser back/forward synchronization.
- Ensure branch, toolchain, worker health, document metadata, cursor location, and diagnostics shown in the status bar are derived from live state, not placeholders.

**Gate S4:** end-to-end flow from file selection through editing, snippet checking, full project build, consensus display, diagnostics, and status bar passes; keyboard and assistive-technology checks cover required flows; no unsupported feature is presented as ready.

### Sprint 5 — CI reconciliation, release hardening, and documentation

**Workstreams:** QA/CI, deployment, security, documentation, all component owners.

- Reconcile all 165 declared suites and 260 sub-tests with the actual invocation graph; identify suites included, excluded, archived, or duplicated. Keep the project owner’s supplied Phase 14 baseline as a trusted input, then execute candidate-required gates on the exact release commit.
- Remove tautological tests; include unit, contract, API, worker, security, integration, Lean, Docker/Compose, and E2E suites required by the approved support matrix.
- Validate clean install/build/deploy; record exact commands, software versions, commit SHA, workflow run, exit codes, artifact digest, and skipped jobs.
- Add route/API, toolchain, Docker image, feature status, release notes, troubleshooting, rollback, and known-limitations documentation.
- Preserve the supplied 150.01 KB bundle baseline as an accepted reference, but measure the release candidate and enforce the approved 180 KB budget in the actual build pipeline.

**Gate S5:** all required candidate jobs pass; none is silently skipped; Compose builds from a clean checkout; release artifact and reports identify the exact commit; all P0 findings are closed; no P1 risk is left without named acceptance; documentation matches shipped functionality.

## 7. Required hybrid test matrix

| Kimina result | Lake/build result | Comparability | Final verdict |
|---|---|---|---|
| accepted | accepted, target and axiom policy passed | exact source, context, scope, toolchain, dependencies, and policy match | `confirmed_valid` |
| rejected | rejected under the same policy | exact match | `confirmed_invalid` |
| accepted | rejected | exact match | `unconfirmed`, `disagree`; investigate, never select the positive result |
| rejected | accepted | exact match | `unconfirmed`, `disagree`; investigate, never select the positive result |
| accepted | accepted | different target, wrapper, context, toolchain, or dependency digest | `unconfirmed`, `not_comparable` |
| accepted or rejected | timeout, unavailable, simulated, malformed, or missing result | any | `unconfirmed`, `incomplete` |
| unknown upstream status | any | any | `unconfirmed`, `incomplete`; preserve raw safe diagnostics and raise a protocol-compatibility alert |

The suite must also test response arrays with reordered IDs, missing IDs, duplicate IDs, unexpected IDs, and multiple results. Never assume that `results[0]` belongs to the submitted request.

## 8. Required revision output from Google AI Studio

Return a revised English implementation plan that:

1. Preserves the confirmed full modular IDE scope, both Lean pathways, and the trusted Phase 14 baseline inputs.
2. Removes unsupported claims that product decisions were previously confirmed and attributes project-provided measurements accurately.
3. Corrects router factory names/signatures and the Python worker path.
4. Defines a version-pinned Kimina adapter and a Lake runner contract; explicitly preserves `sorries` and correlation IDs.
5. Defines the hybrid comparability predicate, consensus statuses, typed result envelope, error protocol, serialization and display rules.
6. Includes the confirmed axiom allowlist and a separate transitive axiom audit.
7. Reorders the five sprints and gates so the real runner and contract precede positive UI verification, while the full IDE remains in scope.
8. Replaces source-text-only acceptance checks with behavioral, integration, adversarial, contract and release tests.
9. Lists named workstream ownership roles, dependencies, deliverables, decision gates, and the modules remaining for complete audit.
10. Labels each item as confirmed decision, repository evidence, trusted project baseline, proposal, or open decision; does not describe future work as completed or tested.

## 9. References

The official Kimina repository and source files are on a moving `main` branch. Pin a release tag or immutable image digest in the implementation plan and verify its schemas against the deployed version before implementation. The Lean reference’s `latest` URLs are also mobile; record the actual Lean toolchain version for every result.

[1]: https://lean-lang.org/doc/reference/latest/ValidatingProofs/ "The Lean Language Reference - Validating a Lean Proof"
[2]: https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/ "The Lean Language Reference - Elaboration and Compilation"
[3]: https://spec.openapis.org/oas/v3.1.0.html "OpenAPI Specification Version 3.1.0"
[4]: https://www.rfc-editor.org/rfc/rfc8259.html "RFC 8259 - The JavaScript Object Notation Data Interchange Format"
[5]: https://www.rfc-editor.org/rfc/rfc9457.html "RFC 9457 - Problem Details for HTTP APIs"
[6]: https://github.com/project-numina/kimina-lean-server "Project Numina - Kimina Lean Server"
[7]: https://github.com/project-numina/kimina-lean-server/blob/main/server/routers/check.py "Kimina Lean Server - Current Check API"
[8]: https://github.com/project-numina/kimina-lean-server/blob/main/server/routers/backward.py "Kimina Lean Server - Backward-Compatible Verify API"
[9]: https://github.com/project-numina/kimina-lean-server/blob/main/client/kimina_client/models.py "Kimina Client - Request, Response, and Status Models"
[10]: https://github.com/project-numina/kimina-lean-server/blob/main/client/kimina_client/async_client.py "Kimina Client - Async Check API and Response Handling"
[11]: https://github.com/Dede78dede/Poliglot-Lean4-python-/blob/296a69d16095adcd2dab26d3225332547af725c2/server/src/services/kimina-client-proxy.ts "Polyglot - Kimina Client Proxy at the Reviewed Commit"
