# Google AI Studio — Implementation Directive: Polyglot Code Studio Consolidation and Phase 15 Completion

**Purpose:** implement and verify a safe, coherent, production-ready release of Polyglot Code Studio. This directive combines the accepted Phase 15 scope, the repository audit, and the additional team checklist. It supersedes unsupported completion claims; it does not assume that a feature is complete because a report, test name, flag, route, or UI component says so.

## 0. Execution rules and authoritative baseline

Work against the latest `main` available at the start of implementation. The latest read-only audit checked GitHub `origin/main` at **`31480c67d1e69df157ee1ff2ce0e871bb5fc018a`**, parent **`4d129163b9ccd445d160bd80e9dcea6601b851e6`**, commit subject `feat: implement phase 15 collaboration and proof beams`, commit timestamp 2026-11-13 13:22:25 +01:00. A fresh fetch at 2026-11-13 13:44 confirmed that `main` still pointed to this SHA. Re-fetch and record the actual SHA before editing; if it differs, inspect the new diff and revalidate every finding below before relying on this directive.

The audit used an immutable archive of the verified Git object. It did not modify the repository. Preserve all unrelated user changes and do not reset, force-push, rewrite shared history, or claim remote synchronization unless the exact resulting GitHub SHA is confirmed. Work on the authorized branch/worktree, report all files changed, and keep the implementation traceable to issue/task IDs and test evidence.

**Truthfulness rules:**
- “Implemented” means code performs the described operation, not that a class, flag, route, fixture, or report exists.
- “Tested” means the stated test command actually ran on the stated SHA and its full output/exit code is retained. A configured CI job is not evidence that a run passed.
- Mocks are acceptable for unit tests but must be labeled as mocks and must not be represented as real provider, kernel, network, Yjs, or collaboration execution.
- Never allow a simulated, heuristic, unavailable, untrusted, or caller-supplied result to yield `verified: true`, `confirmed_valid`, a Tier 5 certificate, or equivalent UI/API language.
- If a Wave cannot be implemented safely in this iteration, keep it disabled and visibly mark it deferred/unavailable; do not leave a success-shaped stub enabled.
- Do not claim “no open work” while any P0/P1 or release gate below remains unresolved.

## 1. Verified audit baseline: findings that must be closed or explicitly gated

At the audited SHA, the repository contains useful scaffolding, routes, UI wiring, feature flags, tests, CI workflow configuration, and Phase 15 reports. The audit found that these artifacts do **not** establish complete runtime integrations. The full assessment is in the user-provided audit context; the most important source observations are summarized here.

### P0 — Certification authority and proof provenance (release stop-ship)

1. `src/services/verification/multi-kernel-verifier.ts` contains synthetic authority paths. `verifyParanoid()` loops through six named kernels and constructs `passed` statuses and fixed timings without launching any kernel process (`:280–317`); it then creates a Tier 5 certificate (`:332–367`). `generateExtendedCertificate()` can construct a Tier 5 certificate directly from caller parameters and a non-cryptographic pseudo-hash (`:182–224`). `verifyMultiKernel()` returns `verified: true` on these synthetic results (`:132–176`).
2. `src/services/femev/femev-engine.ts:356–411` calls this verifier and promotes its output/certificate into FEMEV verified state. This is a reachable secondary certification pathway.
3. `server/src/services/verification/hybrid-adjudicator.ts:197–281` exports `adjudicateHybridConsensus(req, kiminaEvidence, lakeEvidence)` and can emit `verified: true` when supplied evidence objects say both engines accepted and axiom audits passed. It does not establish evidence provenance or that engines ran; required bindings such as exit status, engine identity, request ID, context/toolchain/target/environment/policy digests are not comprehensively validated. The synchronous `HybridAdjudicator.adjudicate()` (`:328–343`) is fail-closed, and `/api/v1/lean/consensus` rejects caller-provided evidence and currently returns `unconfirmed` (`server/src/routes/lean.ts:91–144`), but those narrow guards do not close the exported adjudicator or multi-kernel/FEMEV pathways.
4. Suite 199 (`tests/phase-14/suite-199-e2e-consensus-authority.test.ts:25–85`) constructs hard-coded request/evidence objects and calls the adjudicator directly. It does not execute Kimina, Lake, a runner, or the production route. Its “sole certifier” test (`:147–150`) checks a protocol string and badge type, not exclusivity. Suite 200 checks literal strings and file wiring; it does not perform a repository-wide authority proof.
5. `scripts/seal-integrity-sweep.sh` passed 0 violations during the audit, but its hard-coded scan does not inspect `multi-kernel-verifier.ts`/FEMEV as certificate authorities and therefore gives false confidence for this P0. Expand the invariant checks to cover the whole authority graph and add negative runtime tests; do not preserve “PASS” as proof that these defects are fixed.

**P0 closure requirement:** until authentic dual-engine execution and trustworthy provenance exist, every public/API/UI path must fail closed: `unconfirmed`, `verified: false`, no Tier 5 seal/certificate. Remove or disable all synthetic certificate minting and all secondary `verified: true` paths. A release that claims kernel certification is blocked until all P0 acceptance tests below pass. A release with proof certification explicitly disabled may be considered only through an explicit product/version scope decision, with truthful release notes and no certificate-capable route left reachable.

### P1 — Phase 15 Waves are not yet demonstrated as real integrations

**W1 telemetry.** Browser code formats a W3C `traceparent`, and Express middleware/router scaffolding exists, but the inspected source does not demonstrate browser request-header propagation, correct server child-span/parent linkage, `tracestate` propagation, request-scoped `StructuredLogger` context, complete W3C validation, safe telemetry ingestion, or a nonblocking route under slow exporter conditions. Suite 195 mostly exercises helpers/manual in-memory records, not a real request-to-span-to-log path.

**W2 LeanBeam.** `/api/v1/proof/speculative` is mounted under API middleware and its disabled path returns a 503 Problem Details-style response. The default client (`src/services/mcp/lean-beam-client.ts:324–398`) uses string heuristics and hard-coded goals, not a real LeanBeam/MCP/kernel execution. `Promise.all` parallelizes these simulations. The route’s `Promise.race` timeout does not abort underlying work, candidate fan-out is not adequately bounded, and the actual response is not validated against the canonical `ProofOutcomeSchema`. Suite 196 includes fixture/schema checks that do not prove real execution or cancellation.

**W3 reasoners.** Mathesis logs about a remote endpoint but does not make an HTTP request in the inspected provider; it constructs a fixed trivial `True` theorem and can accept caller-supplied `simulatedScore`. LP2 performs shallow line/string rewriting rather than a parser/IR-based semantic transpilation. TreeThink returns a fixed proof, fixed node count, and `proved: true` without goal-dependent search or a search service. Suite 197 checks superficial output shape, not real inference, translation fidelity, search, or Lean checking.

**W4 collaboration.** The Monaco adapter returns metadata and can set `isBound: true` without creating a `Y.Doc`, Monaco binding, or provider. `HocuspocusServer` is a local in-memory plain-text map and file snapshot, not a Hocuspocus/Yjs transport. Token/origin checks are helper methods, not connection-handshake hooks; default development tokens are hard-coded. The panel displays static “Ready”/one-peer state, and is mounted in Settings rather than the editor workflow. Suite 198 does not test two replicas, CRDT convergence, awareness, real socket authentication, or offline reconnect.

### P1 — Test/report/bundle evidence does not justify “verified/launch-ready”

- The final report claims 303 default + 122 extended = 425 sub-tests over 67 suites. The declared counts for suites 195–200 total 33 (5 + 6 + 5 + 5 + 5 + 7), while the previous extended count is reported as 89; the arithmetic 89 + 33 = 122 and 303 + 122 = 425 is coherent. However, `scripts/verify-extended.ts:89–95` prints a hard-coded 122 rather than aggregating actual assertions, and Suite 200 only checks that suite names occur in the runner. Earlier checkpoints in the supplied completion history report 412, 417, and 423 as well as 425. Resolve historical checkpoint inconsistency; do not claim run success from arithmetic or source declarations.
- `scripts/measure-bundle.ts:57–74,133–153` only makes main-entry and total-JS limits blocking. It defines O1/O2/O3 limits but does not enforce all of them; its O2 value is a hard-coded sum of selected chunk names, not the actual entry dependency graph. `.github/workflows/ci.yml:45–59` fails only on `report.status`, so unimplemented metrics cannot block CI. Do not label all ADR-017 budgets “enforced” until they are computed and enforced.
- The sign-off/checklist mark the phase APPROVED/VERIFIED and all gates checked, but the checked-in documents do not bind claims to immutable workflow run URLs/logs and an exact commit SHA. `reports/bundle-post-14.json` identifies the earlier phase artifact, not an unambiguously Phase-15 build-generated artifact.
- The prior audit also flagged runner concerns that are unchanged in the Phase 15 diff: Kimina endpoint/contract compatibility, project workspace/context passed to the runner, path containment, authentication, resource/time/output bounds, non-root isolation, and pinned toolchain/image. Re-open and verify these against the latest tree; do not assume they were fixed by Waves 1–4.

## 2. Additional team checklist — verified results and corrections

Use the team’s sections 5.8–5.10 and final matrix, with these evidence-based clarifications:

### 2.1 Secret scanning

At the audited tip, the supplied regex (`ghp_|gho_|github_pat_|AKIA|-----BEGIN|BEGIN OPENSSH PRIVATE KEY|xox[baprs]-`) finds the UI placeholder `GitHub Token (ghp_...)` in `src/components/storage/StorageModal.tsx:487`, not a credential value. The available Git history was unshallowed and scanned across 14 reachable commits without printing matched values. Historical pattern hits were confined to that UI placeholder and a synthetic token-vault test fixture (`ghp_volatileSecret999`); no live credential was identified by this scan. Treat these as classified pattern matches, not as proof that no other kind of secret exists.

Implement a safe secret audit that scans the exact release tree and all reachable history without echoing matched secret contents. Record only commit/file/line or finding IDs in normal logs; keep sensitive evidence redacted and access-controlled. Review every alert in context; keep synthetic examples clearly marked and avoid realistic credential prefixes where possible. Add an approved, pinned secret scanner or equivalent CI control, pre-commit guidance, and exclusions only with documented justification. If any real credential is found: stop release, immediately revoke/rotate it with its provider, remove it from active files, invalidate dependent sessions, assess exposure, then follow the authorized history-remediation process. Merely deleting a secret from the current file is insufficient. Never paste any detected secret into tickets, reports, terminal logs, or this prompt.

Suggested low-noise commands (adapt paths to the checked-out repository and make sure output does not print values):

```bash
SECRET_PATTERN='ghp_|gho_|github_pat_|AKIA|-----BEGIN|BEGIN OPENSSH PRIVATE KEY|xox[baprs]-'
# Current tracked tree: list affected paths only, not matching lines/values.
git grep -I -l -E "$SECRET_PATTERN" HEAD -- . ':(exclude)node_modules' || true
# Reachable history: print only commit and affected path. Do not replace -l with line output.
for rev in $(git rev-list --all); do
  git grep -I -l -E "$SECRET_PATTERN" "$rev" -- . ':(exclude)node_modules' 2>/dev/null \
    | sed "s#^#$rev #" || true
done
```

A pattern match is not automatically a leak; classify fixtures/placeholders, then confirm no genuine credential. Also inspect scanner coverage and repository-specific secret formats, not only these sample patterns.

### 2.2 `.gitignore` and generated outputs

At the exact audited tree, `.gitignore` ignores `reports/context/`, `.codeindex/`, `.ogrep/`, `data/tokens.json`, and `.env*` (with `.env.example` allowed). `git check-ignore --no-index -v` confirms those rules. Current `tools/search/README.md` documents generated output paths as `.codeindex/`, `.ogrep/`, and `reports/context/`; `tools/search/` itself currently contains only README, SECURITY, and allowlist files. The team’s proposed `tools/search/output/example.json` check is **not** a current documented output path and is not ignored. Either ensure tools write only into the documented ignored directories, or add a narrowly scoped ignore rule if an actual tool output path is introduced; update docs and check it with `git check-ignore`. Do not report “search outputs ignored” based on a nonexistent folder.

Use checks against the same commit/worktree being reviewed:

```bash
git check-ignore -v --no-index reports/context/example.md
git check-ignore -v --no-index .codeindex/index.json
git check-ignore -v --no-index .ogrep/results.json
git check-ignore -v --no-index data/tokens.json
git check-ignore -v --no-index .env.production
# If a real tools/search output directory is implemented, test that exact path too.
git status --ignored --short
```

Also verify no live token file, generated index, packed context, or search result has been committed; check tracked paths as well as ignore rules.

### 2.3 CI command coverage

CI contains `npm run bundle:measure` and runs `./scripts/seal-integrity-sweep.sh`. It also executes the extended runner directly using `npx tsx scripts/verify-extended.ts` (`.github/workflows/ci.yml:64–65`). `package.json` defines `test:extended`, but the suggested literal grep for `test:extended` in `.github/workflows/ci.yml` will still report a false `MISSING`, because CI uses the direct equivalent command. Replace the brittle text check with a semantic assertion that CI runs the declared extended-verification entry point, or make CI consistently call the npm script; verify command parity rather than searching for one exact string. The grep check must not be interpreted as evidence the extended suite is absent.

The bundle and seal steps are configured, but actual run evidence is still required. Fix the bundle enforcement omissions and broaden the seal/authority control as stated above.

### 2.4 SemVer and Phase 15 governance

At the audited SHA, `package.json` declares version `2.3.0`; no remote `v2.3.0`/`2.3.0` tag was returned by the read-only tag query. Treat this as a declared target version, not proof of a release. Decide explicitly whether this is a release candidate or an approved release. Create/push a release tag only after all required gates pass and the exact target commit is approved; never label a partially disabled or non-functional integration as `2.3.0` complete without an explicit scope decision and accurate release notes.

`docs/adr/ADR-016-phase-15-scope.md` exists, so do not claim that Phase 15 has no governance document. Reconcile its scope/status with implementation and sign-off. Update ADR-016 or add a new ADR only when a new architectural/security/policy decision warrants one (for example authority provenance, real-vs-deferred Waves, budget enforcement, or release criteria). The final report must link the governing decision and list any accepted deferrals.

## 3. Required implementation plan — gated sequence

Do not begin by enabling all flags or editing the sign-off. First make the product safe, then implement integrations, then verify and report.

### Phase 0 — Re-baseline and inventory (read-only first)

1. Record `git status`, latest branch/default branch, full SHA, parent, timestamp, package version, remotes/refs, and exact changed files. Preserve pre-existing uncommitted/untracked user work.
2. Read `README.md`, ADR-016/017/018/019, `docs/tech-debt-backlog.md`, CI, package scripts, all sign-off/report/checklist files, runner/Docker configuration, and implementation modules/tests for every Wave.
3. Produce a claim-to-evidence matrix with statuses `verified in source`, `test executed`, `runtime verified`, `not implemented`, `deferred`, or `not verified`; name the exact source/test/log evidence. Correct mistaken claims from the prior report where source proves them, but do not turn “not inspected” into “complete.”
4. Record feature flags and safe defaults. Keep any currently enabled mock/demo feature disabled by default until its runtime acceptance tests pass.

**Gate 0:** no edits to release claims until source inventory and current SHA are recorded.

### Phase 1 — P0 containment and authentic verification authority

1. Remove/disable `generateExtendedCertificate()` and the synthetic success loop in `verifyParanoid()`. Implement actual subprocess/service calls only for kernels that are truly available, or return a typed `unavailable/unconfirmed` result. Do not fabricate durations, statuses, tool output, hashes, axiom lists, or certificate metadata.
2. Remove all secondary minting of Tier 5 seals and `verified: true`, including FEMEV promotion. Centralize certificate creation in one server-side authority that is not reachable with caller-created evidence. The seal issuer must consume a server-owned verification record linked to the exact request; TypeScript interfaces/brands alone are not a security boundary.
3. Implement/verify Kimina and Lake as two genuine, independent paths over the same canonical source and declared project/snippet scope. Bind each result to request ID, source digest, context/manifest digest, targets, Lean toolchain, runner/server image digest, axiom policy, actual engine identity, actual exit code, diagnostics, and execution result. Require successful exit codes and complete required fields. Reject missing, malformed, simulated, stale, mismatched, or replayed evidence. Ensure both engines saw the same bytes/environment or return `unconfirmed`.
4. Ensure the project runner receives the intended project root and Lake manifest/lock/toolchain, validates workspace containment, uses pinned and permitted toolchains, has authentication, network/resource/time/output limits, cancellation, non-root execution, and no host filesystem escape. Make the Kimina request contract/endpoint match the real pinned Kimina server version; do not assume a `/verify` endpoint/schema without validating it against the configured image.
5. Make `/api/v1/lean/consensus` an orchestrator/status route, not an evidence-accepting certification shortcut. It must run or reference the trusted backend execution, validate authorization, and remain fail-closed when either engine or the axiom audit is unavailable.
6. Inventory all occurrences and callsites of `verified: true`, `confirmed_valid`, `SEAL_KERNEL_VERIFIED_TIER5`, `certificationTier`, certificate constructors and issuers throughout `src/`, `server/src/`, MCP tools, routes, FEMEV, frontend and scripts. Replace the current narrow grep-only invariant with a maintainable architecture/test gate that enumerates allowed issuer(s) and fails on new unauthorized paths. The allowed path must be structurally narrow and documented.
7. Define certificate hashing/signature correctly with cryptographic SHA-256 and a trustworthy signing/provenance model; bind certificate to verified evidence and exact source. Do not call a pseudo-hash or a constructed object a certificate. Validate zero `sorry`/`admit` and enforce the approved axiom allowlist using actual kernel/Lean output, not supplied report fields.

**Phase 1 acceptance tests:**
- No engine execution, simulated result, client evidence, invalid token, missing/incorrect digest, nonzero/missing exit code, unavailable engine, failed/absent axiom audit, context/toolchain/image/target/policy mismatch, or replay can produce a positive verdict or seal.
- A positive result is possible only after both real engine executions complete against the same canonical request and all mandatory checks pass.
- Tests prove FEMEV/MCP/UI cannot create or promote a certificate independently. The certificate can be validated and traces back to the verified request/evidence.
- Integration tests cross actual service/runner boundaries (with controlled real services in CI or a clearly separated integration job). A test fixture may simulate service responses for unit tests, but those tests must not be labeled engine E2E.
- The expanded authority sweep includes `src/services/verification/multi-kernel-verifier.ts`, FEMEV, all certificate constructors/callsites, and tests a deliberately injected secondary issuer.

**Gate 1:** full P0 suite, static authority gate, typecheck/build, and the actual engine integration test pass on the same commit; otherwise no certificate feature or release claim is enabled.

### Phase 2 — Implement or disable Phase 15 Waves

Implement one Wave at a time, keep the flag off by default until acceptance passes, and ensure outputs are suggestions/telemetry/collaboration only—not proof certificates.

**W1 — OTel:**
- Attach valid W3C `traceparent` and supported `tracestate` to actual browser requests; validate version/format/hex/zero IDs/flags at server boundary.
- Start a distinct server child span whose parent is the incoming span; propagate request-scoped trace context to structured logs with safe async isolation/cleanup.
- Gate telemetry ingestion on the flag; validate schemas, bound payload size, redact nested sensitive fields and credential-bearing values before storage/export/logging. Do not accept arbitrary client spans as trusted provider output.
- Export asynchronously with bounded buffering/back-pressure and prove a slow/failed exporter cannot stall request responses.
- Tests: browser request header; malformed contexts; valid parent-child linkage; actual Express route + correlated structured log; nested redaction; disabled route behavior; delayed/failed exporter response latency.

**W2 — LeanBeam:**
- Replace heuristic `runAt()` with a real, typed client/worker/backend protocol that executes against the requested document, version and position. If that service is unavailable, report `unavailable` or explicit `simulated` and do not imply tactic execution.
- Bound candidate count and concurrency; propagate deadline/`AbortSignal` through HTTP/MCP/process and terminate the worker on timeout. Enforce the total request budget, cleanup and no source mutation.
- Map candidates into the canonical discriminated `ProofOutcomeSchema` and validate the actual route output. Preserve `speculativelyTested: true` and explicitly non-certifying semantics.
- Tests: actual adapter/backend invocation, two candidates genuinely concurrent (when parallel is supported), timeout causes underlying cancellation, limit enforcement, source immutability, canonical schema validation, auth/rate limit, full RFC 9457 `application/problem+json` disabled response, and no seal in every path.

**W3 — Mathesis, LP2, TreeThink:**
- Mathesis: use the configured endpoint via actual HTTP with timeout, cancellation, strict request/response validation and error handling; remove caller-supplied `simulatedScore` from production paths. A heuristic score may rank candidate text only and must never mean compilation/proof success. Validate generated Lean with the trusted kernel before any verified claim.
- LP2: implement a parser/AST or documented intermediate representation for supported syntax, explicit reject/diagnostics for unsupported syntax, and semantic round-trip/property fixtures. If full transpilation is out of scope, rename and document the lossy subset as a prototype and do not silently drop source constructs.
- TreeThink: connect a real bounded search service/algorithm or return `not_run/unavailable`; remove fixed `proved: true`, fixed proof text and fixed node counts. Distinguish `candidateFound`, `searchExhausted`, and `kernelVerified`; only the central authority may produce the last status.
- Tests: live/service-contract integration or controlled stub boundary explicitly labeled as such; goal-sensitive output; malformed response/timeouts; unsupported syntax rejection; generated theorem compiled by real Lean; no verifier/seal bypass; disabled routes return validated RFC 9457 errors.

**W4 — Yjs collaboration:**
- Add and pin real Yjs, Monaco binding, provider/transport and Hocuspocus dependencies (or a deliberately selected alternative); implement actual `Y.Doc` state, update transport, document identity, lifecycle cleanup, peer awareness/cursor data and editor binding.
- Authenticate at WebSocket/Hocuspocus connection establishment; enforce origin policy including missing-origin behavior, authorization per room/document and bounded message/resource sizes. Remove default development tokens and fail startup closed when production secrets are not configured. Never log tokens.
- Implement real offline persistence and reconnect/merge (or explicitly scope it out and do not claim offline resilience). Use separate documents/tenant namespaces, safe persistence paths, and retention policy.
- Connect UI to actual connection, room, peer and awareness state; remove hard-coded “Ready”, one-peer and fake connection props. Mount collaboration in the relevant editor workflow if that remains the product requirement, with accessible offline/error states.
- Tests: two independent editor/doc replicas; concurrent edits converge; cursor/awareness updates; unauthorized token/origin/missing origin denied at handshake; room isolation; reconnect/offline merge; persistence/reload; cleanup/unmount; no impact on proof certification. Unit mocks are not CRDT E2E evidence.

**Gate 2:** each Wave is either runtime-verified by its acceptance suite or disabled and explicitly documented as deferred. No checklist may mark an unimplemented Wave “VERIFIED.”

### Phase 3 — Security hygiene, CI, test accounting, budget and governance

1. Add safe current-tree and reachable-history secret scanning. Keep logs redacted; classify the observed synthetic fixture and UI placeholder without treating them as credentials. Add an approved/pinned scanner in CI or provide an equivalent documented control. If a live secret appears, stop and revoke/rotate; remediate history under authorized change control.
2. Keep `.env*`, `data/tokens.json`, `.codeindex/`, `.ogrep/`, and `reports/context/` ignored. Current output docs use those directories; `tools/search/output/` is not present/documented and is not ignored. Decide: keep all outputs within the existing ignored paths, or add and test an ignore rule if an actual output directory is added. Check both `git check-ignore` and whether any such file is already tracked.
3. CI must invoke all required checks on pull request and main. It currently calls `npx tsx scripts/verify-extended.ts` directly; `package.json` also exposes `test:extended`. Avoid a brittle CI grep that insists on literal `test:extended`; either call that npm script consistently or semantically verify that CI runs `scripts/verify-extended.ts`. Keep primary and extended suites, lint/typecheck/build, contract parity, architecture/authority gates, flag governance, bundle checks, secret scan, and final integrity gate blocking.
4. Make every suite return an executed assertion count or use a test framework that reports structured results. Derive total suite/sub-test numbers from registered and executed results; do not hard-code “122” or infer the 420 target from file names. Ensure a failed or skipped suite cannot be reported as passed. Reconcile prior checkpoint counts (412, 417, 423, 425) as historical checkpoints; final report must state only the current run result and its actual output.
5. Enforce every ADR-017 budget: O1 largest emitted JS chunk, O2 actual initial-load dependency graph from HTML/entry graph, O3 accounting discrepancy, main entry and total JS. Store measured values in a build-generated report tied to the current SHA and fail CI independently when any defined limit is exceeded. Add boundary tests for each exact ceiling and one-over-ceiling case. Fix budget-methodology docs and remove hard-coded O2 chunk-name assumptions.
6. Reconcile feature-flag expiry policy across ADR-019/backlog/report and execute the intended strict policy in CI. Validate flag defaults are fail-closed and that no temporary flags remain enabled past expiry.
7. Update/reconcile ADR-016 with actual Wave status, accepted deferrals, dependencies and release gates. Add a new ADR only for a new durable architecture/policy decision. Update README/changelog/sign-off/checklist/codebase map/index to match source reality. Do not call unimplemented code “real-time collaboration,” “remote theorem synthesis,” “dual-engine consensus,” or “end-to-end verified.”
8. Version: package.json currently declares `2.3.0`; the read-only remote tag query found no `v2.3.0` or `2.3.0` tag. Decide explicitly whether 2.3.0 remains the target or is deferred. Do not tag or publish before gates pass and scope is approved. Do not treat package metadata as release evidence.

### Phase 4 — Final verification and release evidence

On the final candidate SHA, in a clean controlled CI environment:

1. Install exactly from lockfile using the approved reproducible command; record Node/npm and Lean/Python/toolchain/container image versions. Do not claim test results from a different SHA.
2. Run lint, typecheck, production build, primary and extended verification suites, contracts parity, architecture checks, complete authority scan, strict flag expiry, safe secret scan, bundle measurement, and seal integrity check. Run the real service/engine/Yjs integration suites in the declared CI service environment. Preserve every exit code and complete raw log as a CI artifact; redact secrets before publication.
3. Verify `/healthz`, `/readyz`, feature disabled/enabled behaviors and protected route behavior in a deployed test environment, but do not label mocks or local stubs “live provider.” Use health/readiness semantics that reveal required downstream dependencies and fail readiness when a required service is missing.
4. Confirm the generated bundle report references the final build and SHA, includes all O1/O2/O3/main/total metrics and limit results, and is consistent with CI output.
5. Run a release checklist with PASS/FAIL/DEFERRED/NOT RUN status, evidence link, SHA, run ID, toolchain and owner for every gate. Require no P0, no undocumented P1, and explicit approval for any disabled/deferred feature. Update package version, changelog and tag only as part of an approved release action.

## 4. Deliverables required from the implementation task

Return all of the following; do not substitute a prose-only success message:

1. A concise change summary mapped to the P0/P1/P2 items and all files changed.
2. An updated architecture/authority diagram or precise module/call graph naming the sole seal issuer and evidence provenance path.
3. Updated/added tests with suite names, executed counts, integration boundaries, and any skipped/deferred test explicitly listed.
4. Raw command summary with exact commands, exit codes, environment versions, final full SHA and CI run link/artifacts. Separate “source inspected,” “unit tests,” “integration tests,” and “runtime probes.”
5. Updated ADR-016/related ADR and truthful README/changelog/sign-off/checklist. Remove unsupported APPROVED/VERIFIED language until evidence exists.
6. An explicit residual-risk list and release decision: `NO-GO`, `CONDITIONAL/FEATURES DISABLED`, or `GO`, with reasons and evidence. Any `GO` must satisfy Gate 1 and the applicable Gate 2/Phase 4 criteria.
7. Confirmation whether changes were committed or pushed. If pushed, report the exact remote branch and SHA verified by fetching GitHub; do not say “synced” based only on a local commit.

## 5. Final acceptance decision

**The default decision is NO-GO until the P0 authority bypass is closed.** The accepted plan and completion transcript are not evidence that runtime behavior exists. An authentic dual-engine verification path must be implemented, or every proof-certification entry point must remain non-certifying and disabled. Phase 15 features that remain scaffolding must be safely disabled and identified as deferred. The final sign-off must be generated only after the actual gates have passed on the release SHA and must accurately disclose any remaining scope exclusions.
