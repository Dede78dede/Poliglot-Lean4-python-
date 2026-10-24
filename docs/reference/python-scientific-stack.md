# Python Scientific Stack Reference (Pyodide 314.0.7)

**Polyglot Code Studio — Phase 10.9.5 Scientific Stack Audit**  
*Target Runtime: Pyodide 314.0.7 (Python 3.14 on WebAssembly)*

---

## 1. Overview & Architecture

Polyglot Code Studio runs Python in client browser sessions using **Pyodide 314.0.7** running in dedicated Web Workers. This enables mathematicians, computational scientists, and formal verification researchers to execute arbitrary numerical explorations, interval simulations, and heuristic CAS queries locally without sending sensitive code or datasets to an external server.

### Key Architectural Invariants:
1. **Asymmetric Trust Model**: Python code produces numerical bounds, visual orbit data, and heuristic counterexamples. **Lean 4 strictly verifies** formal mathematical proof obligations under paranoid multi-kernel consensus (`SEAL_KERNEL_VERIFIED_TIER5`). Python results never hold verification authority.
2. **OPFS Asset Caching**: Pre-compiled WASM wheels and Pyodide standard libraries are persisted into the Origin Private File System (`MemoryOpfsAdapter` / `fetchPyodideAssetWithFallback`) to achieve instant (<500ms) reloads.
3. **WASM Linear Memory Limits**: 32-bit WebAssembly linear memory is capped at 2 GiB per worker. High-memory jobs must leverage stream chunking or sparse representations.

---

## 2. Audited Scientific Stack Packages

| Package | Version | Capability | WASM Compatibility | Tier |
| :--- | :--- | :--- | :--- | :--- |
| **`numpy`** | `2.1.0` | N-dimensional array processing, linear algebra, FFT | Full WASM Support | Tier 1 (Curated) |
| **`scipy`** | `1.14.1` | Numerical integration, optimization, root finding | Full WASM Support | Tier 1 (Curated) |
| **`sympy`** | `1.13.2` | Computer algebra system, symbolic equations, calculus | Full WASM Support (Pure Python) | Tier 1 (Curated) |
| **`mpmath`** | `1.3.0` | Arbitrary-precision floating-point arithmetic | Full WASM Support (Pure Python) | Tier 1 (Curated) |
| **`z3-solver`**| `4.13.0` | SMT constraint solver, BitVec, integer logic | Full WASM Support | Tier 1 (Curated) |
| **`matplotlib`**| `3.9.2` | 2D/3D visual plotting, bifurcation diagrams | Full WASM Support (Agg canvas) | Tier 2 (Supported) |
| **`pandas`** | `2.2.2` | Tabular data analysis, time series | Full WASM Support | Tier 2 (Supported) |
| **`networkx`** | `3.3` | Graph and network theory, DAG analysis | Full WASM Support (Pure Python) | Tier 2 (Supported) |

---

## 3. Unsupported Native & GPU Extensions

The browser WASM runtime rejects native C/C++ extensions lacking Emscripten compilation, as well as hardware GPU accelerators (CUDA/ROCm):

- `torch`, `torchvision`, `torchaudio` (CUDA dependent)
- `cuda-python`, `cupy`
- `jaxlib` (non-WASM native backend)
- `tensorflow` (heavy binary dependencies)

The `PythonDependencyResolver` evaluates `requirements.txt` and `pyproject.toml` prior to execution. If unsupported libraries are declared, it flags them with `PACCHETTI C/GPU NON COMPATIBILI CON WASM` and disables formal verification mode.

---

## 4. PastaBench Round-Trip Formalization

Polyglot Code Studio benchmarks Python-to-Lean round-trip translation using the **PastaBench 10-Problem Suite**:

1. **Collatz Step**: Simple branching and arithmetic.
2. **Logistic Iteration**: Floating-point parameter iteration.
3. **Greatest Common Divisor**: Euclidean loop invariants.
4. **List Reverse**: Linear collection recursion.
5. **Matrix Transpose**: 2D nested indexing.
6. **Prime Checker**: Modulo search with bounded loops.
7. **Binary Search**: Logarithmic range bisection.
8. **Factorial**: Standard recursive inductive base.
9. **Fibonacci**: Multi-variable state accumulation.
10. **Absolute Difference**: Branchless / conditional numeric logic.

The engine requires a minimum **8/10 (≥80%)** round-trip formalization fidelity threshold before release.
