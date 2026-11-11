# POLYGLOT CODE STUDIO — PHASE 14.9.9.2
# DEFINITIVE CONSOLIDATED ENGINEERING EXECUTION DIRECTIVE

---

## WINDOW 1/15 — DOCUMENT CONTROL, AUTHORITATIVE SCOPE, AND CONSOLIDATION STATEMENT

Title:
Polyglot Code Studio — Phase 14.9.9.2 Definitive Consolidated Engineering Execution Directive

Recipient:
Google Studio Team (implementation agent) and Polyglot Code Studio engineering workstreams.

Repository:
Dede78dede/Poliglot-Lean4-python-

Phase:
Phase 14.9.9.2 — Search Infrastructure, Verification Authority Containment, Runtime Prerequisite Repair, and Residual Gap Closure

Document Status:
Definitive consolidated directive, third generation. This document supersedes:

1. The original Phase 14.9.9.2 completion draft.
2. The parallel team's 15-window consolidated corrective directive (base commit 469b03b).
3. All partial analyses, summaries, and recommendations circulated outside this document, including the independent full-repository analysis whose verified findings are integrated here.

Basis of Consolidation:
This directive merges the parallel team's corrective structure with the findings of an independent full-repository analysis covering documentation, backend, frontend, deployment, testing, and security. Every repository-specific defect claim in this document was verified directly against the source tree at the observed baseline and carries a file-and-line reference. Every external-tool claim carries an independent web-verification status dated 2026-11-11. Where the inputs conflicted, verification won.

Integration Summary (what this generation adds over the parallel team directive):
- Three P0 stop-ship defects instead of one: the synthetic synchronous adjudicator, the caller-forged consensus route, and the broken runtime prerequisites (hardcoded toolchain, incoherent Docker deployment, placeholder Lake runner) that make genuine evidence unobtainable today.
- Repair of those prerequisites is pulled INTO Window 0, because the Window 0 gate requires an authentic dual-engine end-to-end test that cannot pass while they are broken.
- External-tool decisions updated with verification outcomes: ogrep verified real (PyPI channel to revalidate); semcode verified real (name-collision warning); codeix NOT independently verified (mandatory pre-verification with a pre-authorized owned-generator fallback); Repomix verified real.
- New deliverables: repository hygiene and truthfulness corrections (D3.9), contract export repair (D3.10), and an honest Structural Reality section in the codebase map (D3.11).
- CI corrections grounded in the verified workflow file: single-runner execution, warning-only stale bundle gate.
- Two new invariants: Deployment and Runtime Honesty (13), Verified Tool Identity (14).

Observed Base Commit:
469b03ba77a399f695f844e921898fe8279ec478

Important Baseline Rule:
Before implementation, recheck the live default branch. If origin/HEAD has advanced, identify the new commit hash, redo impact analysis on that tree — re-verifying every file-and-line claim in Window 3 — and adapt this directive before changing files. Do not apply patches against an assumed tree.

Predecessor:
Phase 14.9.9.1, as claimed by prior drafts but not accepted as verified without fresh execution evidence.

Successor:
Phase 15 feature activation. Phase 15 is explicitly out of scope for this phase.

Language Requirement:
All code, project documentation, reports, commits, test names, and sign-off evidence must be written in English.

Calendar Policy:
Do not include dates, durations, or week estimates in implementation planning artifacts. The verification dates attached to tool-status entries in this document are research metadata, not planning commitments.

Authority Hierarchy:
1. Product and verification safety invariants override milestone convenience.
2. The corrective engineering prompt overrides earlier draft claims where the two conflict.
3. Independently verified code-level findings (Window 3) override prose claims from any prior document, including this one, if the tree has changed.
4. Original deliverables D3.1 through D3.7 are retained only where corrected and made evidence-based.
5. No gate is considered passed unless actual execution evidence exists.

Deliverable Mapping:
- D3.1 Repomix context packing → Window 13, corrected to exact pinning and local-only use.
- D3.2 Design system → Window 10, corrected from "create files" to "audit and repair existing files."
- D3.3 Bundle report → Window 10, corrected to ADR-017 thresholds on a fresh production build with a blocking CI gate.
- D3.4 verification-formula.ts cleanup → Window 10, corrected to consumer audit and compatibility preservation.
- D3.5 docs/architecture versus docs/adr rule → Window 10.
- D3.6 README, CHANGELOG, INDEX, versioning → Window 13, with SemVer governance.
- D3.7 Final sweep and sign-off → Windows 14 and 15.
- D3.8 (new) Runtime prerequisite repair — toolchain resolution, deployment coherence, runner classification → Window 8.
- D3.9 (new) Repository hygiene and truthfulness corrections → Window 9.
- D3.10 (new) Contract export repair (schemas/contracts.json) → Window 9.
- D3.11 (new) Honest structural codebase map with Structural Reality section → Window 12.

Release Version Governance:
The repository version is 2.3.0 at the observed baseline. Do not bump the SemVer version solely to encode a milestone. A bump to 2.4.0 is permitted only if an authorized product release decision explicitly requires it. Otherwise, record Phase 14.9.9.2 under an Unreleased or non-version milestone heading in CHANGELOG.md.

End of Window 1.

---

## WINDOW 2/15 — MISSION, EXECUTION MODEL, AND NON-NEGOTIABLE DELIVERY RULES

Mission:
Implement Phase 14.9.9.2 as three coordinated outcomes:
1. Verification authority containment: no reachable code path may mint a formal verification seal without genuine, server-generated dual-engine evidence.
2. Runtime prerequisite repair: fix the verified defects that make genuine evidence unobtainable today — the hardcoded toolchain, the incoherent Docker deployment, and the placeholder Lake runner — so that containment work is testable end-to-end and honestly classified where full repair is out of scope.
3. Isolated developer search, static index, and context-packing capability, plus closure or accurate reclassification of residual gaps.
Preserve the existing Polyglot Code Studio product and its formal-verification trust boundary.

Scope Boundary:
The search, indexing, and context-packing tools introduced in this phase are for local development and repository understanding only. They are not proof engines, verification authorities, production features, or a reason to expose another MCP endpoint. Deployment repair is limited to making the existing documented deployment coherent; no new services, ports, or product endpoints may be introduced.

Document Consumption Protocol:
- Work through the implementation windows (Window 0 through Window 4, carried in directive Windows 8 through 13) sequentially, at most one implementation window per working session.
- For each window, respond using the Evidence Template in Appendix B. Narrative-only claims such as "it works" are insufficient.
- When a window completes, stop and report. The gate must be verified against actual command output before the next window opens.
- If a gate is failing, skipped, or unreported, do not start the next window.

Sequential Execution Rule:
Work sequentially through the implementation windows. A window may contain parallel workstreams only where file ownership is disjoint and the preceding window gate has passed. Do not start a dependent window when a prior gate is failing, skipped, or unreported.

Branch and Publication Rules:
- The implementation agent may edit code and project documents only on an isolated implementation branch.
- Do not push directly to the repository default branch.
- Do not publish generated repository content externally.
- Do not upload source code, generated indexes, or context packs to external services.
- Do not expose a new network service.
- Use atomic commits only if the team's authorized branch workflow permits them.

Evidence Rule:
Never report a commit, test, scan, gate, or build as successful unless it actually ran and its output is recorded. Evidence must include exact commands, versions, exit codes, and relevant artifacts or logs.

Anti-Mock Rule:
Deliver complete implementations, not mocks, stubs, placeholders, or aspirational READMEs. This repository intentionally contains honestly-labeled simulated components (catalogued in Window 3.4); that existing pattern is not a license to extend it. No new simulation may be introduced where this phase requires genuine behavior, and no existing simulation may be escalated, relabeled, or presented as genuine. If an optional external tool cannot be safely pinned, installed, or tested, do not simulate success: keep it disabled and document the concrete blocker plus an approved, supportable alternative.

Verification Integrity Rule:
No search-tool result, generated index, MCP description, local preflight, simulated run, client-supplied evidence, missing exit code, or heuristic may cause a formal-verification seal to be issued.

Fail-Closed Rule:
Engine failure, missing evidence, incomplete scans, mismatched request context, unavailable toolchain, unavailable audit, or unknown status must yield unconfirmed and never certified.

Correctness Principle:
This consolidated directive is internally consistent, and its repository-specific defect claims were verified against the baseline tree (Window 3). They must still be re-established by actual commands and recorded outputs on the current tree per the Baseline Rule. No historical claim is accepted as proof by itself.

End of Window 2.

---

## WINDOW 3/15 — VERIFIED BASELINE, KNOWN DEFECTS, AND MANDATORY CORRECTIONS

All defect claims in this window were verified directly against the tree at 469b03b. File-and-line references are operative; re-verify per the Baseline Rule if the tree has moved.

### 3.1 Stop-Ship Verification Authority Defects — Priority P0 (three defects)

**Defect A — Synthetic synchronous certification (verified).**
Location: server/src/services/verification/hybrid-adjudicator.ts:316-375 (class HybridAdjudicator, method adjudicate()).
The synchronous path fabricates accepted evidence for BOTH engines: it constructs an EngineEvidence with engine 'kimina', outcome 'accepted', and a passed axiom audit with hardcoded observedAxioms ['propext', 'Classical.choice'], then clones it as engine 'lake', and feeds both to adjudicateHybridConsensus, which returns confirmed_valid, verified: true, and SEAL_KERNEL_VERIFIED_TIER5.
Verified unsafe behaviors inside this method:
- Missing exit status is treated as success: `const exitOk = input.exitCode === 0 || input.exitCode === undefined;`
- The source digest is not a hash: `sha256:${Buffer.from(input.source).toString('hex').slice(0, 32)}` renders the source bytes as hexadecimal and labels them sha256.
- Certification is decided by source-string heuristics ('sorry'/'admit' substring, stderr substring), not engine execution.
Reachable call sites (verified): src/services/mcp/mcp-server.ts; server/src/services/mcp/lean-lsp-mcp-client.ts.

**Defect B — Caller-forged evidence via the consensus route (verified).**
Location: server/src/routes/lean.ts.
- Lines 28-29: `kiminaEvidence: z.any().optional()` and `lakeEvidence: z.any().optional()` in ConsensusRequestSchema.
- Lines 114-129: the parsed body fields are cast directly to EngineEvidence (`kiminaEvidence as EngineEvidence`) and passed to the adjudicator without validation.
Consequence: any authenticated client can forge both engine evidence objects over public HTTP and obtain confirmed_valid with a Tier 5 seal. Client-supplied objects are not authentic attestations of engine execution.

**Defect C — Runtime prerequisites broken (verified; blocks genuine evidence).**
- C1 Toolchain hardcode: server/src/services/lean-project-runner.ts:189 — `const current = 'v4.8.0'`. This contradicts AVAILABLE_LEAN_TOOLCHAINS (v4.28.0 through v4.35.0-rc4): every legitimate toolchain yields toolchainMismatch, and v4.8.0 itself would first be rejected as not installed. The genuine Lake path can never verify, independent of seal logic.
- C2 Deployment incoherence: docker-compose.yml service `studio` references `dockerfile: Dockerfile` (line 18) but no root Dockerfile exists; it sets `KIMINA_URL=http://kimina-backend:8080` (line 28) but `kimina-backend` is not defined in the compose.
- C3 Runner placeholder: the docker/lean-runner/Dockerfile CMD answers every request with static JSON ({status:'ok', toolchains:[...]}) and does not implement POST /build. In real mode, LeanProjectRunner receives no exitCode and raises LakeProcessExecutionError ("did not contain an explicit integer exitCode", lean-project-runner.ts:173-179).
Consequence: the authentic dual-engine end-to-end test required by the Window 0 gate is unreachable today regardless of seal-logic fixes. Repair of Defect C is therefore inside Window 0, not deferred.

### 3.2 Verified CI and Reporting Defects

- CI runs only scripts/verify-all.ts (.github/workflows/ci.yml:59). scripts/verify-extended.ts (suites 173-191) is not executed in CI; therefore CI did not establish that all 191 suites pass.
- The CI bundle step runs the measurement but then reads the historical reports/bundle-post-14.json, applies pre-ADR-017 caps (main 180 KB / total 260 KB), and emits a `::warning` only — non-blocking, stale input, superseded thresholds (ci.yml:47-54).
- Redaction gap: server/src/services/telemetry/security-events.ts sanitizeId (lines 29-34) redacts only the top-level tokenId field and only when its length is at least 24 characters. There is no recursive redaction of nested details or traceContext; short token identifiers pass through unredacted.
- Contract export empty: schemas/contracts.json maps 11 schema names to empty objects ({}). The /api/v1/contracts/parity-check endpoint validates against a simulated Pydantic mirror implemented in TypeScript, not actual Pydantic execution.

### 3.3 Verified Repository Hygiene Defects

- Empty files committed at root: `subfolder`, `theorem`, `file.lean` (0 bytes each).
- data/tokens.json is committed and contains 34 token records (1 default-dev, 31 test user, 2+ hygiene check). Only SHA-256 hashes are stored — no plaintext secrets; the raw token is printed once by the CLI and never persisted — but the hashes are public in the repository and must be rotated before any public deployment.
- README §7 states a 9-suite verification scope (obsolete versus the actual 191-suite inventory); package.json repository.url points to https://github.com/polyglot-studio/polyglot-code-studio.git, inconsistent with the actual origin.
- Port map incoherence: src/services/health/health-service.ts:50-63 assigns femev-runner:8080, kimina:8081, pantograph:8082; docker-compose.yml assigns lean-runner:8080 (mapped 8000->8080) and pantograph:8081; the Kimina client defaults to localhost:8000. Three sources disagree.
- .gitignore does not exclude reports/context/, .codeindex/, .ogrep/, or local tool environments (current entries: node_modules/, build/, dist/, coverage/, .DS_Store, *.log, .env*, !.env.example).

### 3.4 Verified Structural Facts (classification input; do not opportunistically "fix" beyond what Windows 0-4 authorize)

- Route inventory: 27 route files define approximately 105 endpoints; only about 40 are reachable at runtime. Eighteen route files are unmounted (~65 endpoints), including autocorrect.ts, femev.ts, proof-automation.ts, settings.ts, blueprint.ts, chat.ts, telemetry.ts, github-auth.ts, workspaces.ts, ai.ts, files.ts, automation.ts, workspace.ts, discovery.ts, interact.ts, and health.ts. Only validateProofSearchQuery (from interact.ts) is consumed elsewhere.
- The WebSocket collaboration server (server/src/services/collaboration/blueprint-relay.ts) is never instantiated; the requireOwnership middleware is applied only in tests, never to mounted routes.
- Dormant frontend components: EditorPane (Monaco), WorkspaceGrid, TopBar, ChatPanel, FileExplorer, ProjectDrawer, ActivityBar, FemevDrawer, AutoCorrectionPanel, FiveTierMemoryDrawer, StorageModal, and others are not imported by any file in src/; the live editor is a textarea (src/App.tsx:370).
- Bridge authenticity: of the external-service bridges, only kimina-client-proxy, lean-project-runner, ai/ai-provider, autocorrect/leanprobe-client, autocorrect/leanstral-repair, and autocorrect/axle-repair perform real HTTP calls. Nine bridges contain zero fetch() calls and are local re-implementations or heuristics: pastalean, lungo, leanscreen, leanflow, leancert, cramf, nerodia, numpyspec, provepy.
- E2E tests: the Playwright-style specs run on mock fixtures without a browser; visual regression returns a simulated diff: 0. Playwright is not among dependencies.
- Notebook: PersistentNotebookKernel (src/workers/notebook.worker.ts) is an in-memory simulated Python engine, not Pyodide.
- Client-to-server coupling: about 20 files in src/ import runtime values from server/src/ (for example, FemevDrawer imports five bridges; mcp-server.ts imports hybridAdjudicator, which also uses Buffer — a browser hazard).
- Testing reality: the active custom runner executes suites 134-172; the extended runner executes 173-191; historical suites 1-133 are not executed by either runner and are runnable only via explicit vitest.
- CORS behavior: server.ts:39-54 reflects any request Origin dynamically. CI bypass secret `polyglot-ci-test-2026` is hardcoded, mitigated by the double guard (NODE_ENV=test AND ALLOW_CI_BYPASS=true). Rate limiting is in-memory and single-process. These are product-security observations for the record and for the deferred-items list, not authorized changes in this phase.

### 3.5 Baseline Claims That Remain Unverified Until Re-Run

The prior draft's claims — 191 suites, 377 sub-tests, clean typechecking, clean architecture gates, 62 compliant flags, specific bundle figures, unique certifying authority — are treated as unverified until re-established by actual execution. At baseline: verify-all.ts registers suites 134-172 (303 sub-tests by comment); verify-extended.ts registers 173-191 (74 by comment).

Command corrections: the available script is `npm run check-flag-expiry:strict` (package.json:33). Do not assume a separate `npm run check-flag-expiry -- --strict` script exists.

File corrections: src/theme/tokens.ts and docs/architecture/design-system.md already exist — audit and repair them; do not recreate. src/services/verification/verification-formula.ts is a facade re-exporting preflight syntax types; trace imports and public consumers before changing or deleting it.

Policy corrections: docs/architecture/feature-flags.md defines metadata and expiry principles but does not ratify a 180-day TTL; any TTL or grandfathering change requires an accepted ADR first. The observed rate limits are 100 requests/60s (general API) and 30 requests/60s (MCP); no 10-per-minute authentication limiter exists in code — do not assert one unless it is adopted, implemented, mounted, tested, and documented. reports/bundle-post-14.json is historical evidence; ADR-017 thresholds must be applied to a fresh production build with a regenerated report and a blocking CI gate.

Boundary corrections: root tsconfig.json includes src and server.ts; tools/** is not a TypeScript production entry — preserve this boundary. TypeScript exclusion alone is not sufficient; dependency-graph enforcement is required. docs/INDEX.md exists and is the navigation source; do not create duplicate copies of architecture decisions or specifications.

### 3.6 Mandatory Baseline Note

Before coding, create a concise evidence-backed baseline note on the implementation branch recording:
- actual head commit and working-tree state
- package.json scripts actually available
- registered test suites and their runners
- current route mounts AND the unmounted-route inventory
- toolchain resolution behavior and runner mode defaults
- differences discovered from this document's expected baseline
Do not include secret values, tokens, or environment dumps.

End of Window 3.

---

## WINDOW 4/15 — PRODUCT AND SECURITY INVARIANTS

All implementation windows must preserve the following invariants.

Invariant 1 — Genuine Server-Side Verification Evidence Only:
Only genuine server-side evidence can support a formal verification verdict. A certifying verdict requires actual, trusted execution of both Kimina and Lake pathways for the same canonical request and source/context/environment.

Invariant 2 — Clients May Submit Intent, Not Fabricated Evidence:
A client may submit source code and request intent. It must not supply fabricated engine evidence used to mint a result.

Invariant 3 — Fail Closed:
Engine failure, missing evidence, incomplete scans, mismatched request data, unavailable toolchain, unavailable audit, or unknown status yields unconfirmed, never confirmed_valid.

Invariant 4 — Developer Search Is Non-Certifying:
No tool under tools/ may be imported by src/ or server/src/, mounted as a product API route, included in a production bundle, or used to set verified, verdicts, axiom audits, or seals.

Invariant 5 — No Hidden Remote Processing:
Indexing, embedding, context packing, scanner execution, and MCP discovery must have declared network behavior. Do not transmit source code, embeddings, descriptions, generated packs, tokens, or telemetry to a third-party service unless the user/project has explicitly approved that specific service and data flow.

Invariant 6 — Least Privilege and Explicit Approval:
External MCP servers are allowlisted by exact identity and immutable version. No automatic discovery or automatic approval is permitted. Require user approval for activation and for write/destructive operations.

Invariant 7 — No Claimed Network Boundary Without Enforcement:
Docker Compose bridge isolation alone does not guarantee egress to only named hosts. If deployment cannot enforce and test an egress allowlist at host, proxy, or cloud-network layer, document the actual limitation and keep the service bound to local development only.

Invariant 8 — No Unverified Security Claims:
Scanner output is evidence with scope and limitations. It is not a certificate that a server or package is secure. Treat tool descriptions and tool results as untrusted content that may contain prompt-injection instructions.

Invariant 9 — Phase 15 Remains Gated:
Do not enable product feature flags, alter default flag states, ship these tools in the user IDE, or activate any Phase 15 feature as part of 14.9.9.2.

Invariant 10 — No Secrets in Artifacts:
No secrets may appear in source, reports, indexes, logs, fixtures, or generated context packs. Use synthetic values for redaction tests and verify generated artifacts, not only configuration intent.

Invariant 11 — SemVer Governance:
Do not change package.json version solely to encode a milestone. Version 2.3.0 remains unless an authorized product release decision requires a bump.

Invariant 12 — Evidence Before Claims:
Historical comments, prior reports, and draft assertions are not proof. Every gate requires current execution evidence.

Invariant 13 — Deployment and Runtime Honesty:
Documentation, configuration, health reporting, and sign-off artifacts must not present a runtime pathway as functional when its infrastructure is absent, placeholder, or simulated. Where a documented deployment or runner cannot be repaired within this phase, the limitation must be recorded explicitly and the affected pathway must fail closed with a typed non-certifying outcome.

Invariant 14 — Verified Tool Identity:
Every external tool introduced in this phase must have its existence, upstream identity, distribution channel, and version verified immediately before installation. A tool whose identity cannot be verified is not installed; an owned fallback or a disabled state with a documented blocker is used instead.

End of Window 4.

---

## WINDOW 5/15 — RESEARCH-VERIFIED TOOL DECISIONS AND INSTALLATION RULES

Revalidation Requirement:
Revalidate package/release metadata immediately before implementation. The versions below are starting pins observed during research on 2026-11-11, cross-checked by independent web verification. They are not permission to silently follow newer releases.

### 5.1 ogrep — Local Primary Search Candidate — VERIFIED REAL, with distribution caveat

Verified status: the upstream repository gplv2/ogrep-marketplace exists on GitHub; the project site ogrep.be announces exactly v0.12.0 ("semantic code search for AI agents and humans"); local SQLite index (.ogrep/index.sqlite); MIT license; local-first design. The primary documented distribution is a Claude Code marketplace skill.

Caveat: the PyPI availability of the exact extras form `ogrep[ast,mcp]==0.12.0` must be revalidated at installation time. If the PyPI channel is absent, diverges from the reviewed upstream, or cannot be integrity-verified, do not install: record the blocker and keep the tool disabled.

Capabilities (documented): SQLite-backed local indexing; Tree-sitter AST support through extras; optional MCP integration with documented tools ogrep_query, ogrep_chunk, ogrep_index, ogrep_status, ogrep_health.

Installation Rules:
- Use an isolated Python environment.
- Use an exact pin such as ogrep[ast,mcp]==0.12.0.
- Use a lockfile that fixes transitive dependencies and artifact hashes.
- Verify package source, release/tag, and artifact checksum before execution.
- Do not treat a version pin or checksum alone as proof of publisher identity.
- If trust review is insufficient, do not install it; record the reason and keep the MCP server disabled.
- Local embeddings require a separately configured local-compatible model endpoint. Do not assume a bundled model or automatic locality.

### 5.2 semcode — Optional History-Aware Secondary Search — VERIFIED REAL, identity-critical

Verified status: GoodbyePlanet/semcode exists (repository plus engineering blog, mid-2026): an MCP semantic code search server with Tree-sitter AST chunking, GitHub history support, Qdrant-backed retrieval, dense/sparse retrieval, and Reciprocal Rank Fusion.

Identity warning: a DIFFERENT project named semcode exists at facebookexperimental/semcode. Pin by exact upstream identity (GoodbyePlanet/semcode) and verified tag/commit — v1.4.3 associated with commit 2deb4c75163640b5a533f2324cdf5315d5266012, to revalidate — never by package name alone.

Deployment Rules:
- Verify tag and commit before pinning.
- Do not copy the upstream Compose example unchanged.
- Pin all container images by immutable digest after compatibility checks.
- Bind services only to local interfaces where practical.
- Expose no unauthenticated endpoint to an untrusted network.
- Treat /reindex as unauthenticated upstream behavior and contain it accordingly.
- A GitHub token with Contents:read restricts GitHub capability only; it does not authenticate MCP requests or constrain every application-level repository selection.
- Use a dedicated identity limited to the required repository and read-only contents.
- Never commit or print a token.
- Prefer a fine-grained token or GitHub App configured outside source control.
- If no token is available, use supported local-only mode or leave semcode disabled.
- Restrict egress through a tested external firewall or proxy if supported.
- Do not claim Compose network alone provides a host allowlist.

### 5.3 codeix — Static Index Candidate — NOT INDEPENDENTLY VERIFIED; conditional, with pre-authorized fallback

Status: independent verification on 2026-11-11 could not confirm the montanetech/codeix upstream or a codeix npm package at 0.5.0. A similarly scoped tool exists (cocoindex-io/cocoindex-code). The documented .codeindex/ draft-1.0 output (index.json, files.jsonl, symbols.jsonl, texts.jsonl) is not confirmed by an independent source.

Mandatory Pre-Verification: at implementation time, verify (a) the npm registry entry — existence, integrity, license; (b) the upstream repository and tag; (c) the actual output format on a fixture repository. Record the evidence in the window report.

Pre-Authorized Fallback: if codeix cannot be verified, implement an OWNED generator under tools/codeindex/ that produces the same committed artifact set (index.json, files.jsonl, symbols.jsonl, texts.jsonl) with a project-owned format manifest. Rationale: the format is simple line-oriented JSONL; an owned generator eliminates supply-chain risk entirely and keeps determinism under project control. The fallback decision and its rationale must be recorded.

Rules (either path):
- Use an exact version only after verifying registry integrity, repository/tag, license, runtime compatibility, and actual output.
- Do not use unpinned `npx codeix` in CI.
- Prefer a dedicated tool directory with exact dependency and lockfile, or an isolated integrity-checked invocation.
- The format is labeled draft 1.0; store the format version and the generator version in the manifest and handle schema changes explicitly.

Freshness Rule:
Do not implement freshness using file modification time compared with git log. Freshness must compare the current indexed path/content set against canonical content hashes and configuration/tool/parser versions. Record the source commit/tree when indexing a committed tree, and separately account for local modifications when indexing a working tree. Treat any upstream short BLAKE3 file hash as a change-detection field, not cryptographic proof of content identity.

### 5.4 Repomix — Local Context Packing Only — VERIFIED REAL

Verified status: repomix.com and the yamadashy/repomix repository are active; capabilities match the documented use (single-file AI-friendly packing of a local repository, security checks, CLI).

Observed pin: 1.19.0 — revalidate and pin exactly.

Rules:
- Never use repomix@latest in a reproducible wrapper or CI.
- Run manually on the local checkout.
- Keep the Secretlint security check and ignore rules enabled.
- Do not use options that disable security checks or repository ignore behavior.
- Review any Repomix configuration, executable JavaScript/TypeScript config, processors, or path expansion before execution.
- Write generated packs only to a dedicated, verified-gitignored directory such as reports/context/ (add the entry to .gitignore — it is absent at baseline).
- Confirm exclusion with git check-ignore and git status.
- Test exclusion behavior using harmless synthetic fixtures and synthetic secrets.
- The CLI local-processing statement is project policy, not an independent network-traffic audit.
- Do not use remote mode, website upload, MCP packing, or send results to a model/service without explicit approval.
- A compressed pack may omit implementation details and is not a replacement for source-level review.

### 5.5 MCP Security Scanner Status — NOT VERIFIED, EXPERIMENTAL

Observed project: ElhamBidarigh/securAI-mcp-scanner. No stable GitHub release was verified; independent verification on 2026-11-11 did not confirm it.

Scope: partial static inspection of MCP configuration/tool descriptions and drift. It does not certify source code, runtime behavior, images, or absence of vulnerabilities.

Rules:
- Do not make it a production or release gate until exact commit/package, version, CLI schema, integrity, license, and execution risk are reviewed and pinned.
- If evaluated, run it in a disposable sandbox without real credentials and record which analyzers actually ran.
- Cisco MCP Scanner and Snyk Agent Scan are distinct products, not aliases.
- Any replacement requires an explicit decision record, exact pin, documented scope, and isolated test.
- Scanner error, skipped analyzer, unsupported transport, or incomplete result is inconclusive, never a clean pass.

End of Window 5.

---

## WINDOW 6/15 — EVIDENCE-BASED MCP THREAT MODEL AND DOCUMENTATION LIMITS

The final documentation may include the following findings, with limits. Do not use unqualified statements.

6.1 MCPTox Benchmark Findings:
MCPTox reports 45 MCP servers, 353 tools, an average attack success rate of 36.5% across evaluated model settings, and 72.8% for o1-mini, the highest among tested models.
Correct interpretation: these are benchmark-specific measurements. They are not a universal compromise probability or incident rate.

6.2 Microsoft Framing:
Microsoft describes tool poisoning as an agent supply-chain risk and recommends treating MCP servers as production dependencies and reviewing tool-description changes.
Correct attribution: attribute this framing to Microsoft. Do not present it as a Polyglot Code Studio guarantee or universal standard.

6.3 OWASP MCP Top 10:
OWASP lists Tool Poisoning as MCP03:2025, the third entry in its beta/living MCP Top 10 project.
Correct interpretation: do not describe it as a final universal ranking or mature normative standard.

6.4 CVE-2025-54136 / MCPoison:
CVE-2025-54136 concerns Cursor versions through 1.2.4 and was fixed in 1.3 according to CVE and research sources.
Correct interpretation: it describes a specific scenario involving a modified, previously approved MCP configuration. Do not describe it as automatic compromise of every team member or a protocol-wide MCP vulnerability.

6.5 Unsupported Claim to Omit:
The prior draft claim of "more than 30 CVEs from January through March 2026" is not supported by a primary source and reproducible deduplicated methodology.
Rule: omit this claim unless the implementation team supplies a valid evidence set.

6.6 Mandatory MCP Security Posture:
Every MCP tool description and tool result must be treated as untrusted input.
Required controls: least privilege; exact allowlists; change review; narrowly scoped approvals; explicit approval for activating a server; explicit approval for tool operations that write, delete, publish, access secrets, or contact external services.
Hash rule: a baseline hash detects change. It does not prove that the original description is safe. Scanner and fingerprint results must never substitute for human review.

End of Window 6.

---

## WINDOW 7/15 — PARALLEL TEAM MODEL, FILE OWNERSHIP, AND MERGE GOVERNANCE

Execution Shape:
The phase is sequential by gate, with parallelism only inside a window for work that has disjoint file ownership.

Recommended Workstreams:

1. Verification/Security Workstream — owns Window 0 in full: seal-path containment, consensus hardening, AND runtime prerequisite repair (toolchain resolution, deployment coherence, runner classification decision), fail-closed tests, seal-integrity evidence.

2. Quality/Governance Workstream — owns suite registration and CI execution (both runners, blocking bundle gate), rate-limit tests, event redaction, feature-flag audit and ADR-019 coordination, repository hygiene corrections (D3.9), contract export repair (D3.10), documentation governance.

3. Developer Tooling Workstream — owns tool isolation, allowlist, ogrep setup, semcode setup, codeix pre-verification or owned-generator fallback, pinning, local service safety.

4. Index/Documentation Workstream — owns .codeindex generation, freshness checking, the codebase map with the Structural Reality section (D3.11), documentation navigation.

5. Integration Owner — owns shared files, including .github/workflows/ci.yml, package.json, scripts/verify-extended.ts, .dependency-cruiser.cjs, .gitignore, docker-compose.yml, docker/**, server.ts, CHANGELOG.md, and final sign-off consolidation.

Other workstreams must submit reviewed patches to the integration owner rather than editing shared files concurrently.

File Ownership Map Requirement:
Before parallel work begins, publish a file-ownership map and merge order. Do not give two agents concurrent write ownership of the same file.

Merge Rule:
The integration owner resolves conflicts only after each workstream has passed its local checks.

Trust Boundary Stop Rule:
Any finding that changes the trust boundary stops dependent implementation until an approved design is recorded.

Required Workstream Deliverables:
Every workstream must provide: a changed-path list; rationale; tests added; exact commands and exit codes; security implications; remaining limitations; patch/diff. Narrative-only claims such as "it works" are insufficient.

End of Window 7.

---

## WINDOW 8/15 — IMPLEMENTATION WINDOW 0: STOP-SHIP VERIFICATION AUTHORITY CONTAINMENT AND RUNTIME PREREQUISITE REPAIR

Objective:
Remove all synthetic authority, make every reachable proof-seal path fail closed unless backed by genuine, server-generated dual-engine evidence, and repair the verified runtime prerequisites (Window 3, Defect C) so genuine evidence is obtainable — or explicitly and typedly unavailable.

Required Work:

1. Inventory Seal Paths.
Trace every call site that can return or transport confirmed_valid, verified: true, or SEAL_KERNEL_VERIFIED_TIER5. Include the HTTP consensus route, the interactive Lean route, MCP tools (including the two verified adjudicate() call sites), the proposal loop, and UI result mapping. Additionally, verify whether any of the eighteen unmounted route files (Window 3.4) can reach the adjudicator, so that future mounting cannot accidentally expose a seal path.

2. Remove Synthetic Synchronous Certification.
Remove HybridAdjudicator.adjudicate() (hybrid-adjudicator.ts:316-375) or reduce it to a typed non-certifying outcome (verified: false, seal: null). Update both call sites (src/services/mcp/mcp-server.ts; server/src/services/mcp/lean-lsp-mcp-client.ts). Replace it with a service API whose evidence can only be produced by server-controlled engine adapters for the exact request. If real dual execution is not available for a call site, return a typed unconfirmed/unavailable outcome with verified: false and no seal.

3. Harden /api/v1/lean/consensus.
Remove kiminaEvidence and lakeEvidence from the request schema (lean.ts:28-29). Callers must not be able to submit engine evidence and have it trusted. The server must: initiate and resolve engine calls itself; bind calls to a generated request ID; bind calls to canonical source/context/environment digests; validate all results at the boundary. If the endpoint cannot be safely implemented now, remove or disable the certifying endpoint and return a documented non-certifying response.

4. Validate Evidence Completeness.
Validate: engine identity; protocol/contract version; request ID; scope; source digest; context digest; target IDs; toolchain; manifest/environment; policy ID; exit code; diagnostics; axiom audit status; error state. Missing or inconsistent fields must fail closed. Never accept exitCode === undefined as success (Defect A).

5. Use Real Cryptographic Digests.
Source digests must use a real cryptographic hash (SHA-256) over canonical bytes, with explicit canonicalization and encoding. The construction `sha256:${Buffer.from(input.source).toString('hex').slice(0, 32)}` identified in Defect A is forbidden. Do not substitute truncated hex rendering or string equality for SHA-256.

6. Correct sorry Detection.
sorry detection must be based on Lean's actual parsed/compiled proof and transitive axiom audit, not a case-sensitive substring search. A text preflight may reject a candidate, but it cannot certify it.

7. Prevent Secondary Seal Minting.
Audit UI, API envelopes, and MCP outputs so transport layers only map the trusted adjudicator's verdict. No second layer may mint or synthesize a seal.

8. Repair Toolchain Resolution [new — Defect C1].
Eliminate the hardcoded 'v4.8.0' at lean-project-runner.ts:189. Derive the current toolchain from the runner response or the project's lean-toolchain file. Add a regression test: every toolchain in AVAILABLE_LEAN_TOOLCHAINS (v4.28.0 through v4.35.0-rc4) resolves without spurious mismatch, and a genuinely mismatched toolchain is detected accurately.

9. Repair Deployment Coherence [new — Defect C2 and C3].
(a) Root Dockerfile: create it, or correct the compose build context — the documented deployment must be buildable.
(b) kimina-backend: define the service in the compose, or point KIMINA_URL to a coherent existing target or default.
(c) lean-runner POST /build — a decision is required, recorded with its owner: EITHER implement a minimal real handler (spawn lake build with a timeout; parse and return exitCode and diagnostics), OR keep the container as-is and make the server classify it correctly: real mode against a placeholder runner must yield a typed unavailable/unconfirmed outcome with a clear diagnostic, never an unclassified LakeProcessExecutionError. Never present placeholder infrastructure as functional (Invariant 13).

10. Update ADRs and Epistemic Documentation.
Update ADR-015 and the epistemic-authority documentation so they describe the behavior actually implemented. Do not merely change prose while leaving a synthetic certifying path. Update docs/deployment-self-hosted.md to match the repaired deployment, or record the limitation.

11. Route Authority Guard [new].
Record the seal-reachability of the unmounted route files in the baseline note. If feasible, add a test or dependency-cruiser rule preventing unmounted route files from importing the certifying adjudicator.

Mandatory Negative and Integration Tests:
- A non-empty theorem-like string with no engine calls, missing exit code, or synthetic evidence must not yield confirmed_valid, verified: true, or any Tier 5 seal.
- A caller-forged consensus request — both evidence objects forged with all JSON fields made to look valid — is rejected or ignored; it cannot mint a seal.
- One engine unavailable, simulated, timed out, mismatched, or with incomplete axiom audit yields unconfirmed and no seal.
- A wrong request ID, digest, context, toolchain, target set, manifest, or policy fails closed.
- A genuine dual-engine acceptance with exact matching context and successful axiom audit can certify only through the server-owned adjudication path, where infrastructure is available; where it is not, the path is explicitly non-certifying.
- MCP proposal and lean_verify_kernel paths do not return a seal unless the same genuine proof exists. "Proposal committed" is separate from "proof certified."
- UI and API compatibility fields derive verified solely from the trusted verdict and cannot override it.
- Toolchain resolution: legitimate toolchains do not produce toolchainMismatch; the hardcoded v4.8.0 path no longer exists.
- Real mode against the placeholder runner yields typed unavailable/unconfirmed — no crash, no misclassified error.

Window 0 Gate:
- All seal call sites inventoried, including unmounted routes.
- Synthetic paths removed or made non-certifying; consensus route hardened or disabled.
- Negative tests pass, including forged-evidence and undefined-exit-code cases.
- Authentic end-to-end dual-engine test passes where infrastructure is available; where not available, the path is explicitly non-certifying and the blocker is documented.
- No client-supplied evidence can certify.
- Toolchain resolution repaired and regression-tested.
- Deployment coherent, or explicitly BLOCKED with typed fail-closed behavior and documentation.
- npm run arch:check-epistemic-authority and ./scripts/seal-integrity-sweep.sh pass.
- ADRs and documentation match the implementation.

Do not start Window 1 until Window 0 is green.

End of Window 8.

---

## WINDOW 9/15 — IMPLEMENTATION WINDOW 1, PART A: BASELINE, CI, FLAGS, RATE LIMITS, REDACTION, AND REPOSITORY HYGIENE

### 1.1 Establish the Real Baseline

Re-run the repository's actual default and extended test runners. At observed baseline: `npm test` (or `npm run test:verify`) for suites 134-172, and `npm run test:extended` for suites 173-191. Capture actual suite count, actual sub-test count, failures, and exit codes. Do not reuse comments as evidence.

CI Requirements:
- CI must execute both default and extended runners.
- CI must fail if either runner fails, skips a registered suite, or reports unexpected suite inventory.
- Preserve the distinction between test count and sub-test count.
- CI bundle budget must be a blocking gate, not warning-only.
- Apply approved ADR-017 thresholds to one authoritative measurement implementation and a fresh production build.

Baseline Evidence:
Record exact head, Node/npm versions, installation command, environment modes, test commands, and exit codes in the phase report. Do not include credentials.

### 1.2 G-D1 — Feature-Flag Audit Integration Test (Suite 192)

Purpose: test the flag-report generator/validator against the authoritative registry without circularity.
Requirements:
- Test the generator or a pure report validator, not a script that rewrites the repository report during an assertion.
- Strict flag validation must complete with npm run check-flag-expiry:strict.
- The expected current registry must parse successfully.
- The checked-in reports/feature-flag-audit.md must be generated from, or semantically match, every registered flag and its metadata.
- Assert set equality and no duplicate/missing flags rather than permanently hard-coding a count.
- Representative entries such as ENABLE_FEMEV and ENABLE_YJS_COLLABORATION must exist because they are in the registry, not because an expected count is frozen.
- When a fixture adds, removes, or duplicates a flag, or changes required metadata, the validator must detect drift and fail with a useful message.
- Regenerate the report only through the supported project command.
- Record the source commit and generator version if the report includes generated metadata.

### 1.3 G-D5 — Ratify Flag TTL Policy in an ADR

Create docs/adr/ADR-019-feature-flag-ttl-policy.md, only after reconciling the current flag registry, audit report, and any existing flag-debt record.
The prior draft proposed grandfathering current flags expiring on 2027-12-31 and a maximum TTL of 180 days for new flags. Treat this as proposed, not approved.
The ADR must document: current evidence; the proposed policy; alternatives, including the previously discussed 90-day policy; consequences; migration and debt treatment; enforcement behavior.
Approval rule: obtain authorized policy approval before marking ADR-019 accepted. Update docs/architecture/feature-flags.md and the flag linter only after approval.
Prohibitions: do not silently move existing expiry dates; do not claim a 180-day threshold is already enforced unless it is implemented and approved; do not weaken strict expiry checks.
After approval: add tests for grandfathered records and new flag TTL.

### 1.4 G-P11 — Deterministic Rate-Limit Burst Tests (Suite 193)

Test the actual configured policies and mounted routes. Use an injectable clock or controlled fake timer. Do not depend on wall-clock timing or burst latency on shared CI.
Observed policies: general API limiter 100 requests per 60 seconds; MCP limiter 30 requests per 60 seconds.
Required coverage: first accepted request; exact threshold; threshold-plus-one; 429 response; Retry-After; limit/remaining headers; window expiry; client/token key isolation.
Deterministic expectations: 150 general-API requests under one identity should produce 100 accepted and 50 rate-limited; 40 MCP requests under one identity should produce 30 accepted and 10 rate-limited — if exercising the actual limiter configuration.
Authentication limiter rule: the prior draft's 10-per-minute authentication limit is not present in observed code. Do not encode it as current behavior. First determine which authentication routes are mounted and what policy the product owner wants. If a dedicated authentication limiter is approved, define it, mount it before sensitive work, test it, and document it; otherwise test the inherited general API limit accurately.
Safety rule: do not send burst traffic to a live external verification engine during tests.

### 1.5 G-P12 — Redaction and Sensitive Logging Tests (Suite 194)

Target the verified gap: sanitizeId currently redacts only the top-level tokenId field and only for values of at least 24 characters; nested details and traceContext are not redacted.
Implement redaction at the logging/event boundary with recursive redaction of structured details.
Required synthetic test inputs: Authorization header; Cookie; test-secret headers; token IDs shorter than 24 characters; nested details; query strings; error messages.
Assertions: the actual serialized log sink and the buffered event record must contain no raw credential value.
Implementation rules: do not log all request headers or bodies by default; use an explicit safe-field allowlist; use recursive redaction for structured details; do not expose secret values in test failure messages.
Trace field rule: traceparent is a tracing correlation field, not a bearer credential by definition. Decide explicitly whether trace/span identifiers may be retained under telemetry policy. Do not classify every trace ID as a secret, but do not copy arbitrary header content into logs. Test that user-controlled values cannot smuggle credentials through trace fields, correlation fields, or nested metadata.

### 1.6 G-H1 — Repository Hygiene and Truthfulness Corrections [new]

- Remove the empty committed files `subfolder`, `theorem`, `file.lean` after verifying that no test references them by existence.
- Rotate all tokens in data/tokens.json via the supported CLI, and decide — with documentation — the committed-state policy: preferred is to keep the file format, rotate values to synthetic or zero entries (or a committed template), and gitignore the live file; alternatively, keep committed hashes by explicit design decision recorded in the window report. No unrotated test token may remain at sign-off.
- README §7: replace the 9-suite scope with the actual current suite inventory and runners.
- README §8 feature matrix: annotate entries accurately — bridges without fetch() calls must be described as local re-implementations, not integrations; fallback/partial/future states must match reality.
- package.json repository.url: point to the actual origin, or record the authoritative fork decision.
- Port map: reconcile src/services/health/health-service.ts, docker-compose.yml, and the Kimina client defaults into one documented mapping; fix the disagreeing source; record the mapping in the codebase map.
- .gitignore: add reports/context/, .codeindex/, .ogrep/, and local tool environment entries.
- CHANGELOG.md: add the Phase 14.9.9.2 section under [Unreleased], per the version governance in Window 1.

### 1.7 G-H2 — Contract Export Repair [new]

- Diagnose and repair src/services/contracts/json-schema-exporter.ts so that npm run contracts:generate emits non-empty schemas; regenerate schemas/contracts.json (currently 11 names mapped to {}).
- npm run contracts:check must pass against the regenerated output.
- Parity honesty: the current parity check validates against a simulated Pydantic mirror implemented in TypeScript. Either add a genuine differential check (execute the Python side against shared fixtures, for example via the existing scripts/verify-python-contracts.py path), or downgrade the parity claim in documentation to "mirror-validated." Record the decision.

Window 1 Part A Gate:
- Baseline runs recorded for both runners.
- Both runners included in CI; bundle gate blocking on fresh measurement.
- Suites 192, 193, and 194 pass.
- Approved flag policy represented accurately; ADR-019 status truthful.
- No unsupported rate-limit claims remain.
- Redaction tests verify actual sinks.
- Hygiene items complete or explicitly BLOCKED with rationale (empty files; tokens; README §7/§8; package.json URL; ports; .gitignore; CHANGELOG).
- contracts.json regenerated non-empty, or BLOCKED with rationale; parity claim accurate.

End of Window 9.

---

## WINDOW 10/15 — IMPLEMENTATION WINDOW 1, PART B: DESIGN SYSTEM, BUNDLE, VERIFICATION FACADE, DOCUMENT GOVERNANCE

### 1.8 G-P13 — Correct the Design-System Documentation Gap

Do not create duplicates: src/theme/tokens.ts and docs/architecture/design-system.md already exist.
Required work:
- Inspect content against actual exported tokens and actual component paths.
- Check implementation paths named in the design-system document against the tree.
- Correct stale paths, unsupported WCAG claims, unmeasured contrast ratios, and inaccurate component mappings.
Evidence rule: if contrast ratios or touch-target sizes are claimed, add a reproducible check or narrow the prose to the evidence actually tested.
Navigation: link the authoritative design-system document from docs/INDEX.md.

### 1.9 G-P14 — Align Bundle Measurement, Report, ADR, and CI

Fix target (verified defect): the CI bundle step currently reads the historical reports/bundle-post-14.json, applies pre-ADR-017 caps (main 180 KB / total 260 KB), and emits a non-blocking warning (ci.yml:47-54). This must become a blocking gate on a fresh production measurement.

Alignment set: scripts/measure-bundle.ts; reports/bundle-methodology.md; docs/adr/ADR-017-bundle-budget-revision.md; bundle tests; CI; the generated bundle report.

ADR-017 thresholds:
- O1: maximum gzip size of one emitted client JavaScript chunk, capped at 100.00 KB.
- O2: initial-load gzip, calculated from the emitted entry document and the exact transitive static JS/CSS assets required for the initial route, capped at 220.00 KB.
- O3: absolute accounting discrepancy between the declared total-JS gzip metric and the sum of relevant emitted JS chunks, no more than 0.50 KB.
- Total client JavaScript gzip capped at 290.00 KB.
- Main entry JavaScript gzip capped at 180.00 KB.

Methodology requirements: document whether HTML and CSS are included in O2 and apply the same rule in code and prose; state whether rounding occurs before or after summation for O3; compare byte counts before rounding; use a production build as measurement input; ignore source maps and server bundles as specified; include tool/runtime version, commit, exact inputs, raw byte counts, and gzip method in the report.

Test requirements: tests must detect missing chunks, duplicate chunks, wrong initial-load graph traversal, rounding errors, and budget breaches.

CI requirement: CI must fail on any unapproved threshold breach.

Report naming: regenerate a canonical bundle report from the fresh build at reports/bundle-post-14.9.9.2.json. Preserve the old report at reports/archive/bundle-post-14.json. Do not copy figures from any draft or prior JSON.

### 1.10 G-P17 — Verification Facade Consumer Audit

Target: src/services/verification/verification-formula.ts.
Required work:
- Inventory all imports of the facade.
- Inventory imports of the canonical server formula (server/src/services/verification-formula.ts).
- Document which module owns the five-term formula (the server module) and which owns syntax-only preflight (the client facade).
- Preserve behavior and import compatibility.
Removal rule: remove a re-export only if the consumer inventory proves it dead, typecheck passes, tests pass, and the architecture owner approves removal.
Documentation rule: update documents that conflate client preflight with server verification authority.

### 1.11 G-P18 — Documentation Source-of-Truth Rules

Establish one durable rule, documented in docs/INDEX.md or a concise documentation policy.
Allocation rule:
- docs/adr/ records decisions, context, alternatives, status, and consequences.
- docs/architecture/ describes currently implemented architecture, contracts, and operational behavior.
Dual-document rule: a topic may have one ADR and one current architecture specification only when the architecture document links back to the ADR and does not copy decision history.
Report rule: reports are dated evidence snapshots and must not replace normative specifications.
Reconciliation rule: reconcile duplicate or stale entries in the index without deleting historical records still needed for auditability.
Readiness rule (new): readiness claims must match wiring. A component not imported by the live application must not be listed as "ready" without an explicit dormant/not-wired qualification. Reconcile reports/ui-inventory.md and README §8 accordingly.

Window 1 Part B Gate:
- Design-system documentation repaired based on real files and paths.
- Bundle methodology, tests, report, ADR-017, and blocking CI agree; fresh bundle report generated.
- verification-formula.ts disposition documented.
- Documentation source-of-truth rule ratified and indexed.

End of Window 10.

---

## WINDOW 11/15 — IMPLEMENTATION WINDOW 2: ISOLATED DEVELOPER-TOOL FOUNDATION AND SEARCH SERVICES

### 2.1 Establish a Hard Architectural Boundary

Create real directories under tools/ for independently configured developer tooling: tools/search/, tools/codeindex/, tools/context/.
Dependency rules:
- Do not add these tools to top-level production dependencies unless a separately approved product decision requires it.
- Keep Python/npm environments, lockfiles, caches, SQLite databases, Qdrant data, and temporary output local and gitignored.
Dependency-cruiser rule: add a forbidden rule preventing src/** and server/src/** from importing tools/**. Test the rule: a prohibited import fixture must fail; a permitted tool-to-tool import must pass.
CI enforcement: make this architecture rule blocking in CI. A non-blocking grep is not sufficient.
Bundle assertion: add a secondary assertion that the production Vite output and dependency graph contain no tool server, tool adapter, token, scanner, or context-packing code.
TypeScript boundary: preserve the root tsconfig scope. If TypeScript scripts are added under tools/, give them an isolated tools/tsconfig.json with explicit scope rather than broadening the production project config.
Allowlist: create and document a versioned allowlist such as tools/search/allowlist.json. For every approved server/package, record: canonical upstream identity; exact version and immutable commit or artifact hash; license; installation environment; enabled transport; expected tool names and reviewed schemas; description hash; permissions; files/data it may read or write; network destinations; approval status. Generate the baseline only after human review. A changed description, schema, executable, commit, or digest blocks activation until review and approved baseline update.

### 2.2 ogrep Setup (verification-first)

Before enabling anything, revalidate the PyPI channel for ogrep[ast,mcp]==0.12.0 against the reviewed upstream (Window 5.1). If the channel cannot be verified, keep the tool disabled, record the blocker, and use lexical search or an owned alternative.
Setup rules: dedicated isolated developer environment; exact package pin and complete lockfile with dependency hashes; verify package artifact integrity against the selected upstream release/tag; record missing PyPI provenance as a supply-chain limitation if applicable.
Functional verification before enabling MCP: ogrep --help; local index creation; SQLite status; local query; AST behavior for the repository languages (TypeScript, Python); MCP initialize/list-tools/schema responses verified from the pinned binary — README names alone are insufficient.
Configuration rules: configure .ogrep/ and the virtual environment as ignored paths; do not include the production src/ or server/src/ import graph; prefer lexical/AST operation or an explicitly local embedding endpoint; do not send source text to a cloud embedding provider by default.

### 2.3 semcode Setup — Optional and Local-Only by Default

Location: separate semcode configuration and Compose file under tools/search/semcode/. Do not assume the root docker-compose.yml provides Qdrant.
Pinning: pin semcode to the verified immutable GoodbyePlanet/semcode release/commit (mind the name collision with facebookexperimental/semcode — Window 5.2). Pin Qdrant and any embedding-service images by digest.
Containment: keep Qdrant and the MCP endpoint bound to localhost or an internal network; publish no port to a shared/public interface; use non-root users where supported; use read-only mounts for configuration/source where practical; use minimal capabilities; use resource limits; use a dedicated data volume.
Authentication and token rules: document that upstream /reindex is unauthenticated and do not expose it beyond the trusted local boundary; if HTTP transport is reachable by another user or process, add a reviewed authentication boundary and test it; do not pass a broad GitHub token to the container; if repository history access requires a token, use a dedicated read-only identity for this repository; provide the token at runtime through a secret mechanism; prove token absence from logs, image layers, config, and generated reports.
Egress rule: implement and test actual egress restrictions at the host/proxy/cloud-network layer when supported. Record allowed destinations and test that an unauthorized destination is blocked. If unsupported, state that egress is not restricted and keep semcode strictly local/on-demand.
Test rule: use a disposable test index and a synthetic fixture repository to confirm indexing, queries, commit-history behavior, tool outputs, token redaction, and deletion/reset behavior. Do not run a destructive reindex against shared data without approval.

### 2.4 codeindex Generator — Verify or Fall Back

- Execute the Window 5.3 pre-verification for codeix: npm registry entry, upstream repository and tag, actual output on a fixture. Record the evidence.
- If verified: exact pin; dedicated directory with lockfile; never unpinned npx in CI; manifest with format and tool version; draft-1.0 schema governance.
- If not verified: implement the pre-authorized owned generator under tools/codeindex/ producing index.json, files.jsonl, symbols.jsonl, texts.jsonl with a project-owned manifest; full determinism tests; document the decision and rationale in the window report.
- Either path: the generator must run offline against the repository with explicit include/exclude configuration.

### 2.5 MCP Hardening and Scanner Evaluation

Discovery rule: no automatic server discovery. Do not mount ogrep or semcode in server.ts, the product /mcp, /api/v1/mcp, UI settings, or the production runtime. Configure only the local developer MCP client if the approved developer setup supports per-project servers.
Activation rule: require human activation approval. Before activation, compare the exact binary/image/package identity and the tool descriptions/schemas against the reviewed allowlist. If any field changes, disable the server and request review.
Description safety: unit-test benign and adversarial synthetic descriptions — including invisible Unicode and instruction-like text — to confirm they are handled as untrusted content and cause no auto-approval or authority escalation.
Scanner rule: do not put securAI-mcp-scanner in a blocking CI/release gate until an immutable version/package and execution model are verified. If evaluated: pin the immutable commit; use a disposable environment with no real secrets; document active and skipped analyzers; save machine-readable output; require human review. A failed or incomplete scan is inconclusive. Do not state "secure" or "no vulnerabilities" based on one scanner.

Window 2 Gate:
- Tool dependencies and artifacts pinned and reviewed; lockfiles and hashes present.
- ogrep channel decision and codeix decision recorded with evidence.
- Local setup instructions tested from a clean environment.
- No product code imports or mounts tools; CI enforces isolation and bundle exclusion.
- semcode not externally exposed; secrets and egress policies tested or limitations explicit.
- MCP names and schemas match the pinned binaries; no auto-approval enabled.

End of Window 11.

---

## WINDOW 12/15 — IMPLEMENTATION WINDOW 3: STATIC CODE INDEX AND HONEST CODEBASE MAP

### 3.1 Generate .codeindex/ Safely

Tool requirement: use only the reviewed, exact generator decided in Window 2.4 (verified codeix or the owned fallback).
Configuration requirements: define explicit source inclusion and exclusions for secrets, environment files, private keys, .git, dependency trees, generated dist/, caches, virtual environments, Qdrant data, temporary reports, and reports/context/.
Content audit requirement: because texts.jsonl contains comments, docstrings, and string literals, inspect the generated content for credentials and unwanted data before committing it.
Commit rule: commit only the declared .codeindex/ files — index.json, files.jsonl, symbols.jsonl, texts.jsonl.
Validation requirements: JSON/JSONL parsing; schema/version; path normalization; no duplicate records; valid source paths; stable sort order; deterministic output for identical source/config/tool versions.
Schema governance: store the format version and the generator version in the manifest and handle schema changes explicitly.

### 3.2 Correct Freshness Verification

Create tools/codeindex/check.sh or an equivalent cross-platform script.
Freshness principle: verify index freshness from content, not modification time.
Canonical input decision: define whether the canonical input is the committed Git tree or the current working tree, and record the decision.
Manifest requirements: compute a deterministic manifest over normalized relative paths; full-length cryptographic hashes of source contents; the generator version; the parser/grammar version; the include/exclude configuration; and the index schema.
Change coverage: additions; deletions; renames; uncommitted changes according to the selected mode.
Commit/tree recording: for committed-tree mode, record the commit and tree OID; for working-tree mode, compute the actual current content manifest.
Failure behavior: fail with a useful explanation when stale and provide the exact regeneration command.
Required freshness tests: changed file; new file; deleted file; rename; changed exclude rule; changed generator version; modified file with preserved mtime; no-change rebuild. The no-change case must be deterministic for the pinned environment.

### 3.3 Add an Accurate Codebase Map with a Mandatory Structural Reality Section

Create docs/architecture/codebase-map.md — a concise, manually reviewed orientation map derived from actual source, not from prior draft assertions. At minimum it must cover:

- Verification architecture: the client preflight (non-certifying) versus the server-side certifying authority (hybrid adjudicator); which engine adapters are real HTTP clients and which are simulated; the module owning the five-term formula.
- Execution infrastructure status: the Kimina proxy (real HTTP, mode-dependent); the lean-project runner with the Window 0 decision outcome (real /build or typed-unavailable placeholder); available toolchains; the deployment coherence state after Window 0.
- Dormant versus wired UI components: the verified dormant list (EditorPane/Monaco, WorkspaceGrid, TopBar, ChatPanel, FileExplorer, ProjectDrawer, ActivityBar, FemevDrawer, AutoCorrectionPanel, FiveTierMemoryDrawer, StorageModal, and others) versus what App.tsx actually mounts; the live editor is a textarea (App.tsx:370).
- Bridge authenticity table: for each bridge, real HTTP (kimina-client-proxy, lean-project-runner, ai-provider, leanprobe-client, leanstral-repair, axle-repair) versus local re-implementation with zero fetch (pastalean, lungo, leanscreen, leanflow, leancert, cramf, nerodia, numpyspec, provepy).
- Route inventory: approximately 105 endpoints defined, about 40 mounted; the eighteen unmounted route files listed with their disposition (dead code, pending mount, or removed).
- Testing reality: custom runner suites 134-172 and extended 173-191; historical suites 1-133 not executed by the active runners; vitest coverage-threshold directories; e2e specs execute on mock fixtures without a browser; visual regression is simulated; the notebook kernel is an in-memory simulation.
- Client-to-server coupling: the approximately 20 src/ files importing runtime values from server/src/, with the top offenders and the Buffer-in-browser hazard.
- The reconciled port map (from G-H1).
- Deferred product-security observations (CORS origin reflection, in-memory single-process rate limiting, the CI bypass secret pattern) recorded as deferred items, not as changes made in this phase.

Rules: every entry must be re-verified against the tree at implementation time and carry file references; every path linked in the map must exist; planned behavior must never be described as implemented.
Navigation: add codebase-map.md to docs/INDEX.md under a clear heading. Keep decision history in ADRs and current implementation facts in architecture documents.

Window 3 Gate:
- .codeindex generation and content audit pass.
- Freshness tests cover content changes independent of mtime; identical inputs yield deterministic output.
- The Structural Reality section is complete, accurate, and re-verified.
- Every map link resolves; the documentation index is updated.
- .codeindex/ contains no secrets or generated context packs.

End of Window 12.

---

## WINDOW 13/15 — IMPLEMENTATION WINDOW 4: SAFE MANUAL CONTEXT PACKING, DOCUMENTATION, AND FINAL EVIDENCE

### 4.1 Repomix Wrapper

Create tools/context/pack.sh or an equivalent documented cross-platform command.
Version rule: use a verified exact Repomix release (observed pin 1.19.0, revalidate), never @latest. Pin the runtime/dependencies where practical.
Execution rule: run only against the local checkout, with Secretlint/security checks and ignore rules enabled.
Allowlist/denylist rule: use an explicit source allowlist and sensitive-file denylist. Never disable default ignore/security behavior, invoke remote mode, load unreviewed executable configuration/processors, or include parent directories outside the repository.
Output rule: write to reports/context/ or a dedicated external directory that is explicitly gitignored (per G-H1) and verified with git check-ignore.
Shell safety: use safe shell settings and restrictive file permissions; refuse to overwrite existing output unexpectedly; report the output path and tool version; perform a post-generation scan for synthetic secret fixtures and prohibited paths.
CI rule: do not run context packing in default CI, scheduled jobs, or automatically on commit. It is an intentional developer command.
Data exfiltration rule: do not upload, send, or publish the generated pack. Later sharing requires separate explicit approval and review of the full artifact.
Required wrapper tests: use a harmless synthetic repository containing included source, excluded .env/key-shaped files, ignored generated files, a symlink/path traversal attempt, and synthetic secret values. Confirm that the generated Markdown contains only allowed content, that the output is ignored by Git, and that no real secrets are used.
Documentation rule: context packing is a convenience for LLM review, not a complete code audit. Compressed output may omit implementation details; the developer must inspect the exact source files for security-sensitive changes.
tools/context/README.md must document: purpose; exact pinned Repomix version; run command; output location; security policy; gitignore verification; retention policy; troubleshooting; and the prohibition on upload or external transmission.

### 4.2 Final Documentation and Evidence

Update docs/INDEX.md, docs/architecture/, and docs/adr/ according to the source-of-truth rules (G-P18).
docs/INDEX.md additions: ADR-019 (if accepted); tools/search/SECURITY.md; docs/architecture/codebase-map.md; .codeindex/; the docs/adr versus docs/architecture allocation rule; the design-system document link.
README.md: add a Search Infrastructure section linking tools/search/README.md, tools/search/SECURITY.md, .codeindex/, and docs/architecture/codebase-map.md. Verify consistency with the G-H1 corrections to §7 and §8.
CHANGELOG.md: add the Phase 14.9.9.2 section under [Unreleased] or the approved milestone heading; keep package.json version unchanged unless an authorized release decision exists.
Window reports under reports/, containing: exact base and resulting commit IDs; changed files and purpose; commands run; tool versions; exit codes; suite and sub-test counts; test environment modes; bundle metrics generated from the actual build against ADR-017 budgets; scanner identity/version, scope, active and skipped checks, results, and limitations (if used); MCP server identities with exact pinned versions/commits/digests, approved tools and schemas, permissions, ports, and verified network limits; the ogrep/semcode/codeix verification evidence and decisions; the runtime prerequisite status (toolchain, deployment, runner decision); remaining limitations and decisions explicitly not made.
Secret rule: do not include API keys, tokens, secret values, private user data, or full source/context-pack dumps in reports. Reports are evidence snapshots, not substitutes for normative ADRs or specifications.

Window 4 Gate:
- Wrapper tests pass; output is local and ignored; no remote data flow occurs without separate approval.
- All docs are indexed and internally consistent.
- All previous window gates remain green.
- Release sign-off is based on actual execution evidence.

End of Window 13.

---

## WINDOW 14/15 — CONSOLIDATED ACCEPTANCE CRITERIA, GATES, RISK REGISTER, AND SIGN-OFF REQUIREMENTS

Phase 14.9.9.2 is complete only when all of the following are true.

A. Verification Authority Criteria
- [ ] No reachable code path fabricates engine evidence.
- [ ] No path treats missing exit status as success.
- [ ] No formal seal is issued without genuine server-side dual-engine execution and required audits.
- [ ] No public/request-body evidence field can be forged by a client to produce certification.
- [ ] Every non-certifying fallback, preflight, simulation, degraded, timeout, and unavailable path is explicitly unconfirmed, verified: false, and seal-free.
- [ ] Tests exercise critical negative cases through service, API/MCP transport, and UI result mapping.
- [ ] Toolchain resolution matches AVAILABLE_LEAN_TOOLCHAINS; no hardcoded version remains.
- [ ] The documented deployment builds coherently, or its limitation is recorded and affected paths fail closed with typed outcomes.
- [ ] No unmounted route file can reach the certifying adjudicator without explicit remount review.

B. Test and CI Criteria
- [ ] The pre-existing registered suites and all newly registered suites run in CI.
- [ ] Default and extended runners are both included.
- [ ] Actual suite and sub-test counts are reported; no prefilled historical counts are accepted as evidence.
- [ ] Suites 192, 193, and 194 are explicitly registered and included in CI.

C. Governance Criteria
- [ ] Flag report tests compare the current registry and report dynamically.
- [ ] Approved TTL governance is recorded in an accepted ADR before enforcement claims are made.
- [ ] Rate-limit tests use actual policy and deterministic time.
- [ ] No unimplemented authentication-specific limit is asserted.
- [ ] Security-event logs and buffered records redact credentials recursively.
- [ ] Telemetry does not accept arbitrary request data as safe telemetry.

D. Design and Bundle Criteria
- [ ] Design-system documentation is repaired based on existing files and real component paths.
- [ ] Unsupported accessibility and contrast claims are removed or backed by checks.
- [ ] Bundle methodology, tests, report, ADR-017, and blocking CI use the same definitions and ceilings: O1 100 KB; O2 220 KB; O3 0.50 KB; total JS 290 KB; main entry 180 KB.

E. Developer Tool Criteria
- [ ] Developer search/context tools are isolated, pinned, reviewed, local/on-demand.
- [ ] They are absent from production imports, product MCP mounts, and the client bundle.
- [ ] Tool schemas and descriptions are verified against the exact binaries that run.
- [ ] Changes block activation until human review.
- [ ] Docker egress restrictions are described only where actually enforced and tested.
- [ ] Unauthenticated semcode endpoints are not exposed beyond the protected local boundary.

F. Index and Context Criteria
- [ ] .codeindex/ freshness is content-based and covers additions, removals, renames, and config changes; no mtime-only gate remains.
- [ ] Repomix is exact-pinned, manual, local, with security checks enabled.
- [ ] Output is verified gitignored; no pack is uploaded or committed.

G. Documentation, Hygiene, and Release Criteria
- [ ] All docs and reports are accurate and traceable to the resulting commit.
- [ ] No credentials or unsupported security claims are present.
- [ ] No Phase 15 feature flag is enabled; no product runtime feature is accidentally added by this phase.
- [ ] package.json version is unchanged unless an authorized release decision exists.
- [ ] Repository hygiene complete: empty files removed; tokens rotated; README §7/§8 and package.json URL corrected; port map reconciled; .gitignore extended.
- [ ] schemas/contracts.json regenerated non-empty and contracts:check passes, or the item is BLOCKED with rationale and the parity claim is accurate.
- [ ] The codebase map's Structural Reality section is present, accurate, and re-verified.

Legacy Gate Mapping:
- G3.1 → Window 13 (Repomix wrapper, gitignored output).
- G3.2 → Window 10 (design-system audit and repair).
- G3.3 → Window 10 (fresh ADR-017 bundle report, blocking CI).
- G3.4 → Window 10 (verification-formula consumer audit).
- G3.5 → Window 10 (docs allocation rule).
- G3.6 → Window 13 (README/CHANGELOG/INDEX/version governance).
- G3.7 → Windows 14/15 (final sweep and sign-off).
- G-R1 (runtime prerequisites) → Window 8, items 8-9.
- G-H1 (hygiene) → Window 9, item 1.6.
- G-H2 (contracts) → Window 9, item 1.7.
- G-SR (structural reality map) → Window 12, item 3.3.

Consolidated Risk Register:

| ID | Risk | Probability | Impact | Mitigation | Rollback/Block Trigger |
|---|---|---:|---:|---|---|
| R0 | Synthetic verification authority or forged evidence mints a seal | Low after Window 0 | Critical | Remove synthetic path; fail closed; negative tests; server-owned evidence | Any client-supplied evidence acceptance blocks release |
| R1 | Tool poisoning via MCP description | Medium | Critical | Allowlist, SHA-256 fingerprinting, human review, no auto-approval, scanner as evidence only | Unreviewed hash/schema/description change blocks activation |
| R2 | MCP supply-chain compromise or registry poisoning | Medium | High | Exact pinning, immutable digest/commit, isolated environments, read-only credentials | Known CVE or integrity failure removes the tool immediately |
| R3 | tools/ imported by src/ or server/src/ by mistake | Low | High | dependency-cruiser forbidden rule, fixture test, CI blocking | Architecture violation triggers rollback |
| R4 | Bundle budget exceeded by tools or accidental production inclusion | Low | Medium | tools exclusion, Vite graph assertion, fresh measure-bundle run | O1/O2/total/main threshold breach blocks sign-off |
| R5 | .codeindex/ diverges from code | Medium | Low | Content-hash freshness, config/tool version manifest, CI check | Stale index triggers regeneration |
| R6 | Secrets or PII in logs, indexes, or Repomix output | Low | High | Recursive redaction, denylists, synthetic secret tests, generated-artifact inspection | Detected secret requires artifact deletion and review |
| R7 | Timing-based test flakiness in rate-limit or burst suites | Medium | Medium | Fake timers, injectable clock, deterministic harness | Flaky behavior triggers isolation and redesign |
| R8 | verification-formula.ts removed while still used | Low | High | Consumer inventory, typecheck, tests, architecture approval | Build/test failure restores the file |
| R9 | Unauthorized SemVer bump or release claim | Low | Medium | Release decision required, CHANGELOG governance | Unauthorized version change reverted |
| R10 | Egress restrictions claimed but not enforced | Medium | High | Test actual proxy/host/network controls or declare the limitation | Failed egress test blocks semcode exposure |
| R11 | Missing provenance for pinned tools | Medium | Medium | Document the limitation, sandbox, disable if trust is insufficient | Unverifiable supply chain blocks activation |
| R12 | Runtime prerequisites remain broken (toolchain hardcode, deployment incoherence, placeholder runner), keeping genuine evidence unobtainable | Medium at baseline | Critical | Window 0 items 8-9; regression tests; typed unavailable classification | Window 0 gate fails; phase blocked until repaired or explicitly classified |
| R13 | codeix identity unverifiable | Medium | Medium | Window 5.3 pre-verification; pre-authorized owned-generator fallback | Unverified identity → do not install; use the fallback |
| R14 | Package identity confusion (ogrep PyPI channel divergence; semcode name collision) | Medium | High | Exact upstream identity checks; tag/commit verification; allowlist identity fields | Divergence → tool disabled, blocker recorded |
| R15 | Committed token hashes remain unrotated | Low | Medium | G-H1 rotation before sign-off; gitignore decision documented | Any unrotated test token at sign-off → hygiene gate fails |
| R16 | Scope creep from structural findings (teams start "fixing" dormant components or unmounted routes beyond authorization) | Medium | Medium | Window 3.4 is classification only; Windows 0-4 define the only authorized changes; integration owner enforces | Unauthorized change reverted |

Final Sign-off Requirements:
Create reports/14.9.9.2-final-signoff.md. The report must state each acceptance criterion as PASS, FAIL, or BLOCKED, with a path to evidence. No unqualified "all done" statement is acceptable while any criterion is blocked.
Required contents: executive summary; gate status table; deliverable completion table (D3.1-D3.11); actual test counts and sub-test counts; bundle metrics from a fresh build; seal integrity result; runtime prerequisite status (toolchain, deployment, runner decision); search infrastructure status with the ogrep/semcode/codeix verification evidence and decisions; codeindex freshness status; contract sync status; flag policy status; hygiene status; risk register status; deferred items with rationale; formal completion declaration only if all criteria pass.
Signatures/Approvals: Engineering Lead; Verification/Security Lead; QA Lead; Documentation Owner; Integration Owner; Google Studio Liaison.

End of Window 14.

---

## WINDOW 15/15 — APPENDICES: COMMANDS, EVIDENCE TEMPLATE, GLOSSARY, AND CORRECTNESS DECLARATION

### APPENDIX A — REQUIRED VERIFICATION COMMANDS

Baseline and Repository State:
    git rev-parse origin/HEAD
    git status --porcelain
    git log --oneline -5

Dependency and Static Checks:
    npm ci --ignore-scripts
    npm run lint
    npx tsc --noEmit

Architecture and Governance:
    npm run arch:check
    npm run arch:check-epistemic-authority
    npm run contracts:check
    npm run check-flag-expiry:strict

Build and Bundle:
    npm run build
    npm run bundle:measure

Tests:
    npm test
    npm run test:extended

Seal Integrity:
    ./scripts/seal-integrity-sweep.sh

Tokens and Hygiene:
    npm run tokens:rotate -- --name "<name>"     (per the approved rotation policy)
    git ls-files | grep -E "^(subfolder|theorem|file.lean)$"     (must be empty after G-H1)
    node -e "const c=require('./schemas/contracts.json');const e=Object.entries(c).filter(([k,v])=>!v||Object.keys(v).length===0).map(([k])=>k);console.log(e.length?'EMPTY SCHEMAS: '+e.join(', '):'OK')"     (must print OK after G-H2)

Tools and Isolation Checks:
    grep -rn "from.*tools/" src/ server/src/ --include="*.ts" --include="*.tsx" && echo "VIOLATION" || echo "OK"
    bash tools/codeindex/check.sh
    bash tools/codeindex/check-map.sh
    npx tsx tools/search/check-descriptions.ts     (if implemented)

Context Packing:
    bash tools/context/pack.sh

Git Ignore Verification:
    git check-ignore -v reports/context/example.md
    git status --porcelain reports/context

### APPENDIX B — EVIDENCE TEMPLATE

For each completed workstream, record:

    Workstream:
    <name>

    Base commit:
    <hash>

    Resulting commit:
    <hash>

    Changed files:
    <path list>

    Commands executed:
    <exact commands>

    Tool versions:
    <versions/pins/digests>

    Exit codes:
    <codes>

    Test evidence:
    <suite count, sub-test count, pass/fail>

    Security implications:
    <summary>

    Remaining limitations:
    <summary>

### APPENDIX C — GLOSSARY

MCP: Model Context Protocol. A standard for connecting agents to external tools.

Tool Poisoning: injection of hidden or malicious instructions into the description field of an MCP tool.

RRF: Reciprocal Rank Fusion. A ranking-fusion algorithm used to combine multiple search result lists.

AST Chunking: splitting code into semantic chunks, such as functions, classes, or symbols, instead of raw line-based chunks.

Grandfathering: retroactive exemption of pre-existing elements from a newly introduced policy.

Seal Integrity: the invariant that only the trusted server-owned adjudication path may issue a formal verification seal, and only when backed by genuine dual-engine evidence.

ADR: Architecture Decision Record. A point-in-time decision document with status.

Fail Closed: a safety behavior where uncertain, incomplete, or invalid conditions produce unconfirmed/non-certifying results.

Level 3 Context Packaging: compressed repository-context generation intended for controlled local review workflows, not certification.

Dormant Component: a fully implemented, tested component not wired into the live application; documented as classification, not defect.

Structural Reality Section: the codebase map section cataloguing what is genuinely wired, simulated, dormant, or unmounted at implementation time.

Owned Generator: a project-maintained tool implementation used as a verified-identity alternative to an unverifiable third-party tool.

Runtime Prerequisite: infrastructure (toolchain resolution, deployment buildability, engine runner) without which genuine verification evidence cannot be produced.

### APPENDIX D — CORRECTNESS DECLARATION

This directive consolidates three inputs: the original Phase 14.9.9.2 completion draft, the parallel team's corrective engineering prompt, and an independent full-repository analysis. Repository defect claims in Window 3 were verified against the tree at 469b03b and carry file-and-line references. External-tool claims carry independent web-verification status dated 2026-11-11. Conflicts between inputs were resolved in favor of verification safety, evidence-based claims, and architectural isolation.

No repository gate, test, build, scan, or sign-off item is asserted as passed by this document alone. All acceptance criteria require actual execution evidence recorded on the implementation branch and in the final sign-off report.

If any acceptance criterion cannot be satisfied, the phase must be reported as BLOCKED for that criterion, with containment, owner role, and next decision recorded. Do not weaken a gate to make the milestone appear green.

END OF CONSOLIDATED DOCUMENT
