# Lean 4 Toolchains & Dependency Matrix (Polyglot Code Studio)

## 1. Supported Toolchain Matrix (October 2026)

| Toolchain Version | Role & Ecosystem Alignment | Status | Network Policy |
| :--- | :--- | :--- | :--- |
| **`leanprover/lean4:v4.35.0-rc4`** | **Default Studio Toolchain**. Compatible with Mathlib `v4.35.0` (2026-10-13) and ProofWidgets `v0.0.113`. Supports LeanPlot v0.2. | Active | Pre-installed (`--internal=true`) |
| **`leanprover/lean4:v4.34.1`** | Latest official stable release (2026-09-24). | Supported | Pre-installed (`--internal=true`) |
| **`leanprover/lean4:v4.33.1`** | Strictly pinned runtime for **Pantograph v0.3.19**. | Specialized | Pre-installed (`--internal=true`) |
| **`leanprover/lean4:v4.31.0`** | Intermediate legacy formal project support. | Supported | Pre-installed (`--internal=true`) |
| **`leanprover/lean4:v4.28.0`** | Baseline legacy support for older Mathlib repositories. | Supported | Pre-installed (`--internal=true`) |

---

## 2. ProofWidgets Integration (`v0.0.113`)

ProofWidgets 4 enables interactive UserWidgets (algebraic structures, commutative diagrams, Rubik's cube states) directly within the Monaco code editor.

- **Pinned Version**: `v0.0.113`
- **Lake Configuration (`lakefile.toml`)**:
  ```toml
  name = "proofwidgets_demo"
  defaultTargets = ["ProofwidgetsDemo"]

  [[require]]
  name = "proofwidgets"
  git = "https://github.com/leanprover-community/ProofWidgets4"
  rev = "v0.0.113"

  [[lean_lib]]
  name = "ProofwidgetsDemo"
  ```
- **Toolchain Resolution & Fallback**:
  - Ecosystem inspection on Reservoir and Mathlib confirms that ProofWidgets `v0.0.113` tracks the `v4.35.0-rc2` API surface alongside other satellite packages (`plausible`, `LeanSearchClient`, `aesop`, `Qq`, `batteries`).
  - For projects requiring ProofWidgets UserWidgets, the template toolchain anchors to `leanprover/lean4:v4.35.0-rc2`.
  - When compiled under runner `v4.35.0-rc4`, if breaking upstream macro changes in rc4 cause a build failure, the runner automatically substitutes `v4.35.0-rc2` and logs the diagnostic entry:
    `[Toolchain Substitution] ProofWidgets v0.0.113 requires Lean v4.35.0-rc2 API surface; substituting toolchain v4.35.0-rc2 for compilation.`

---

## 3. Pantograph v0.3.19 Lock

Pantograph provides interactive tactic state inspection, premise extraction, and goal graph exploration.

- **Ecosystem Reality**: Each Pantograph release is strictly bound to a single Lean compiler version without forward or backward compatibility.
- **Pinning**: Pantograph `v0.3.19` is pinned strictly to **Lean `v4.33.1`**.
- **Enforcement**:
  - If a user opens a project targeting `v4.33.1`, Pantograph features activate seamlessly.
  - If a project specifies `v4.35.0-rc4`, the studio provides full Lake and ProofWidgets support while displaying a diagnostic banner for Pantograph:
    `Pantograph v0.3.19 requires Lean v4.33.1. Standard Lake compilation and ProofWidgets are active.`

---

## 4. LeanPlot Compatibility Gate

- **LeanPlot v0.1.0** requires `v4.32.0-rc1` (not present in the isolated pre-installed toolchain matrix).
- **LeanPlot v0.2 (Skeleton)** targets `v4.35.0-rc4`.
- **Matrix Gate Behavior**:
  - When running on `v4.35.0-rc4`: Native LeanPlot rendering is enabled.
  - When running on `v4.33.1`, `v4.31.0`, or `v4.28.0`: Plotting requests automatically route to the client-side Pyodide/Matplotlib SVG bridge with a notification banner indicating toolchain matrix compatibility.
