# Known Limitations & Runtime Constraints (Polyglot Code Studio)

## 1. WebKit OPFS Ephemeral Context Limitation

- **Issue**: WebKit (Safari and WebKitGTK in ephemeral contexts) does not support the Origin Private File System (`navigator.storage.getDirectory()`).
- **Reference**: Confirmed in Playwright limitation [#42579](https://github.com/microsoft/playwright/issues/42579).
- **Mitigation**: Polyglot Code Studio implements a transparent fallback to IndexedDB (`polyglot_studio_vfs`). Assets that cannot be stored in OPFS are preserved in IndexedDB object stores without user intervention.

---

## 2. Pyodide WebAssembly 4 GB Memory Ceiling

- **Address Space**: WebAssembly currently operates with a 32-bit linear memory address space ($2^{32} \text{ bytes} = 4 \text{ GiB}$).
- **Impact**: Any Python script, matrix manipulation, or dataset in Pyodide that attempts to allocate more than 4 GB of heap memory will raise a WASM `OutOfMemoryError`.
- **Mitigation**: For datasets or computations requiring $> 4 \text{ GB}$, the studio prompts the user to dispatch the execution to the containerized server runtime.

---

## 3. Tree-Sitter-Lean & Syntax Fallback Scope

- **Scope**: The in-browser tree-sitter parser evaluates Lean 4 grammar, keyword boundaries, indentation structure, and unbalanced delimiters.
- **Boundaries**: The parser does **NOT**:
  - Perform macro expansion or type inference.
  - Resolve external Mathlib dependencies.
  - Formally verify proof obligations (`theorem`, `lemma`, `example`).
- **Guarantee**: Fallback parser executions are strictly flagged with `verified: false`, `fallback: true`, and the HTTP header `X-Lean-Fallback: true`. Under no circumstances is a simulated or syntax-only check reported as verified.

---

## 4. Python Native C-Extensions & CUDA Constraints

- **Supported WASM Packages**: Standard scientific packages compiled for Pyodide (including `numpy`, `scipy`, `sympy`, `matplotlib`, `mpmath`, `networkx`, `pandas`, `z3-solver`), pure Python packages (`requests`, `pydantic`, `packaging`), and native PEP 783 `pyemscripten_2026_0_wasm32` wheels (`pydantic_core`, `onnx`, `yaml-rs`, `imgui-bundle`).
- **Unsupported WASM Packages**: Heavy native libraries or GPU bindings (`torch`, `tensorflow`, `opencv-python`, `cuda-python`, `cupy`, `triton`, `mpi4py`).
- **Detection**: The dependency analyzer detects unsupported packages and marks the project with `toolchain: mismatch` and `pyodideCompatible: false`, preventing browser crash loops.

---

## 5. PEP 783 WebAssembly Platform Tags & Emscripten ABI Isolation

- **PEP 783 Specification**: PEP 783 defines standard WebAssembly wheel tags (`pyemscripten_{YEAR}_{RELEASE}_{ARCH}`).
- **Pyodide 314 Target**: Pyodide 314.x runs CPython 3.14 with Emscripten 5.0.3. The designated platform tag is `pyemscripten_2026_0_wasm32`.
- **Correction C1 (Strict 2026 Tag Enforcement)**: Emscripten makes no cross-version ABI stability guarantees between major toolchains. Wheels built for `pyemscripten_2025_0` (Python 3.13 / Pyodide 0.29.x / Emscripten 4.0.9) CANNOT be loaded into Pyodide 314 without memory corruptions or dynamic symbol link failures. The resolver strictly marks `pyemscripten_2025_0` wheels as `incompatible` with the explanation: *"Built for Python 3.13 / Pyodide 0.29.x. Rebuild required for Pyodide 314 (Python 3.14)."*

---

## 6. cibuildwheel >= 4.0.0 Emscripten Toolchain Limitations (Correction C3)

- **Issue**: Upstream `cibuildwheel >= 4.0.0` has known issues packaging WebAssembly wheels with Emscripten ("Emscripten currently fails to build wheels using cibuildwheel >= 4.0.0").
- **Mitigation & Workaround**:
  - The `PyodideBuildService` inspects the build toolchain selection and issues a warning whenever `cibuildwheel >= 4.0.0` is selected.
  - Workaround: Use `pyodide-build` direct CLI (`pyodide build`), which invokes Emscripten without the intermediate cibuildwheel runner wrapper, or pin `cibuildwheel < 4.0.0`.
  - Feature Flag: In-browser compilation is gated behind `ENABLE_PYODIDE_BUILD` (default `false`) with an interactive confirmation modal before build execution.

---

## 7. PEP 783 Six-Tier Compatibility Taxonomy (Correction C4)

Aligned with the official "Are we PEP 783 yet?" ecosystem tracker:
1. **Green (4%) — `wheel-available`**: Ships native `pyemscripten_2026_0_wasm32` wheel on PyPI. Installs directly via `micropip.install()`.
2. **Blue (8%) — `pyodide-recipe`**: Built from source by pyodide-recipes with WebAssembly patches.
3. **Purple (0%) — `recipe-patched-pure-python`**: Pure Python wheel that requires a `pyodide-recipes` patch to run in a browser sandbox (e.g. socket redirection via browser fetch).
4. **Cyan (83%) — `pure-python`**: Universal pure Python wheel (`none-any.whl`) without C extensions.
5. **Yellow (5%) — `build-required`**: Source distribution available on PyPI; can be built via `pyodide-build`.
6. **Incompatible**: Heavy native C/CUDA/GPU binaries or obsolete `pyemscripten_2025_0` ABI wheels.

---

## 8. Pyodide 314.0.7 Runtime & 2026 ABI Stability
- **Version**: Upgraded from 314.0.1 to Pyodide 314.0.7 (released 2026-09-14), providing native `dedent` support in `runPython`/`runPythonAsync` and CPython 3.14 bug fixes.
- **Cache**: OPFS cache directory regenerated as `pyodide_assets_v314.0.7`.
- **Packaging**: Depends on `cibuildwheel v4.1.0` or `pyodide-build` for `pyemscripten_2026_0_wasm32` wheel compatibility.

---

## 9. WebMCP Origin Trial Expiration (2026-11-17)
- **Origin Trial**: Google Chrome's `document.modelContext` origin trial (Chrome 149–156) concludes on **2026-11-17 00:00 UTC**.
- **Mitigation (ADR-0011)**: Polyglot Code Studio relies on **Streamable-HTTP (spec 2026-07-28)** as its primary, authoritative MCP transport, with lazy-loaded `@mcp-b/webmcp-polyfill` (~28 KB) ensuring Phase 11 agentic workflows are immune to trial expiration.

---

## 10. Leanstral Hardware & VRAM Constraints (Full vs Standard)
- **Full Profile (119B MoE)**: Leanstral 1.5 119B/6.5B active Q4_K_M requires **78.5 GB VRAM** (71.4 GB weight file + 256K context). Under NO configuration does this model fit in 8 GB RAM. Requires 4× A100 80GB or DGX Spark NVFP4 hardware.
- **Standard Profile (7B-class)**: For self-hosted workstations (8 GB RAM + 6 GB VRAM), Polyglot Code Studio employs a 7B-class Q4_K_M model requiring **6.2 GB VRAM with 8K KV cache** (fitting RTX 3060/4060). Quality is below full Leanstral (~84% GSM8K, ~71% HumanEval) but mathematically sound when sealed by the kernel.
- **Lite Profile (2 GB RAM)**: Zero local AI models loaded; all non-AI features remain 100% operational. Cloud free APIs optional.

---

## 11. Archon Horizon Cost Boundaries
- **API Consumption**: Archon Horizon v0.1.5 orchestrates long-running multi-agent Lean formalization through Claude Code / Claude Opus 4.8.
- **Estimated Cost**: Operating 3 concurrent accounts for a 1-week formalization sprint costs approximately **$600 USD/week** ($200/month/account).
- **Safety Gate**: Archon Horizon is disabled by default (`ENABLE_ARCHON_HORIZON=false`) and requires explicit UI cost acknowledgment before activation.

---

## 12. GROBID PDF Extraction Memory Footprint (Phase 11 Pre-Flight)
- **Memory Requirements**: Header-only extraction requires ~2 GB RAM; citations extraction requires ~3 GB; fulltext TEI XML parsing requires 4 GB; parallel processing requires 6–8 GB.
- **Recommendation**: Deploy containerized GROBID with `--memory=8g` ceiling.

---

## 13. Semantic Scholar & External Research API Rate Limits (Phase 11 Pre-Flight)
- **Rate Limits**: Unauthenticated calls are limited to 1 request per second; authenticated calls with API key support up to 10 RPS.
- **Mitigation**: Local CSL-JSON bibliography caching and Token Budget Manager request throttling prevent IP bans.

---

## 14. PastaLean Lean Toolchain Pinning (Lean v4.31.0-rc2)
- **Toolchain Pinning**: PastaLean is pinned to Lean `v4.31.0-rc2` as required by its `lean-toolchain`. This is a release candidate; it may change without notice.
- **Reproducibility**: The PastaLean repository is cloned at a pinned commit (`a8f9c12b4e87d10c81d3ef16e53c457d192e42a9`) for deterministic builds.
- **Container Isolation**: To avoid destabilizing the multi-kernel paranoid check container (v4.35.0) and prevent adding 2 GB of duplicate Mathlib cache, PastaLean is isolated in a dedicated `pastalean-runner` container.
- **Scope & Limitations**: PastaLean supports int, string, list, dict, loops, list comprehensions, functions, exceptions, and assert/contract specifications. It does not cover arbitrary Python classes, native C extensions, or dynamic metaprogramming.

---

## 15. Toolchain Tension: Lungo (v4.34.1) vs. Multi-Kernel Paranoid Check (v4.35.0)
- **Tension**: Lungo CLI v1.86.160 natively targets Lean `v4.34.1` for Bridge IR (`crates/lungo-bir`) and multi-language codegen, whereas the 6-kernel paranoid verification engine (`lake check --paranoid`) targets Lean `v4.35.0`.
- **Architectural Resolution**: Polyglot Code Studio maintains the project on `v4.34.1` for distributable code generation and checked claim packaging, while running the 6-kernel paranoid consensus check on a project copy updated to `v4.35.0`.

---

## 16. LeanFlow & leanscreen Runtime Constraints & Screening Boundaries
- **Bubblewrap & User Namespaces**: LeanFlow native proving on Linux requires `bubblewrap` and usable unprivileged user namespaces (`unprivileged_userns_clone`). In container environments lacking unprivileged namespaces, execute with `--privileged` or `--security-opt seccomp=unconfined`.
- **LeanFlow Call & Time Limits**: Default limits are 250 total agent calls, 200 prover calls, 50 orchestration calls, and 24 hours active wall-clock time (`limits.agent_calls`, `limits.wall_time_s`).
- **leanscreen Screening Boundaries**: `leanscreen` is a calibrated semantic defect screen, **never a certification tool**. Calibrated against 886 frozen human verdicts (595 faithful / 291 unfaithful): under two-judge consensus, human-rejected pairs pass 17.0% (theorems) / 35.6% (definitions), while human-certified pairs are flagged 15–18%. Both judges belong to the Anthropic model family (potential correlated blind spots); the adversarial counterexample probe may confabulate. Authoritative mathematical certification is strictly governed by `SEAL_KERNEL_VERIFIED_TIER5`.

---

## 17. Phase 10.8 Numerical Verification & Tooling Constraints

- **LeanCert Toolchain Pinning (v4.32.0)**: The Lean certificate checkers (`alerad/leancert`) are version-pinned to Lean `v4.32.0`. They are strictly isolated in `leancert-runner` (port 8085). The Python SDK (`leancert==0.3.2`) produces interval/Taylor bounds, but formal certification requires Lean certificate checker acceptance.
- **Heron Lean Fork (lean-fork/v4.31.0)**: Heron's refactor and diagnostic engine requires a dedicated Lean 4 compiler fork (`wvhulle/heron` on `lean-fork/v4.31.0`) isolated in `heron-runner` (port 8086). It is disabled by default (`ENABLE_HERON=false`) and excluded from primary proof checking.
- **lean-fmt Unverified Status**: Upstream `lean-fmt` cannot be independently verified at build time. Polyglot Code Studio disables external `lean-fmt` by default (`ENABLE_LEAN_FMT=false`), falling back to `pretty-lean` or Monaco's built-in conservative indentation formatter.
- **Nerodia & NumpySpec Status**:
  - `Nerodia` is an experimental proof-of-concept for compiling Lean to native Python C-extensions; its API is subject to breaking changes and strictly requires Lean $\ge 4.33$ (`ENABLE_NERODIA=false`).
  - `NumpySpec` is in early-stage development on Reservoir; matrix operations must be verified through Lean's type system (`ENABLE_NUMPYSPEC=false`).
- **provepy Status**: `provepy` is an experimental educational alpha supporting only simple functions decorated with `@provable` (`ENABLE_PROVEPY=false`).
- **CRAMF Licence & Plugin**: CRAMF is an ICLR 2026 research plugin for LeanFlow; its license is verified at build time and gated behind `ENABLE_CRAMF=false`.
- **doc-gen4 Build Requirement**: `doc-gen4` requires a `docbuild` subdirectory with its own `lakefile.toml` targeting `v4.35.0-rc2`. Output is served statically from `./build/doc`.



