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

- **Supported WASM Packages**: Standard scientific packages compiled for Pyodide (including `numpy`, `scipy`, `sympy`, `matplotlib`, `mpmath`, `networkx`, `pandas`, `z3-solver`).
- **Unsupported WASM Packages**: Heavy native libraries or GPU bindings (`torch`, `tensorflow`, `opencv-python`, `cuda-python`, `cupy`, `triton`, `mpi4py`).
- **Detection**: The dependency analyzer detects unsupported packages and marks the project with `toolchain: mismatch` and `pyodideCompatible: false`, preventing browser crash loops.
