# Toolchain Matrix & Binding Policy

**Polyglot Code Studio — Phase 10.9 Toolchain Architecture**  
*Source of Truth: `src/services/toolchains/toolchain-policy.ts`*

---

## 1. Overview

To support legacy algorithms, upstream forks, and modern formalization tools without cross-contaminating the primary paranoid verification engine (`femev-runner` at `v4.35.0`), Polyglot Code Studio operates an explicit 12-toolchain matrix across isolated runner containers.

### Binding Matrix

| Toolchain Version | Owner Container | Purpose | Stability | Upstream Commit / Pin |
| :--- | :--- | :--- | :--- | :--- |
| `v4.28.0` | `kimina` | Kimina legacy proof search engine support | `stable` | — |
| `v4.31.0` | `kimina` | Kimina intermediate toolchain support | `stable` | — |
| `v4.31.0-rc2` | `pastalean-runner` | PastaLean Python $\to$ Lean AST translation | `rc` | `a8f9c12b4e87d10c81d3ef16e53c457d192e42a9` |
| `v4.32.0` | `leancert-runner` | LeanCert verified numerical certificate checkers | `stable` | `alerad/leancert` v0.3.2 |
| `v4.32.2` | `femev-runner` | LeanInteract v0.11.5 interaction engine | `stable` | — |
| `v4.33.0` | `leanflow-runner` | Verso Blueprint v4.33.0 graph generation | `stable` | `api/graph.mjs` |
| `v4.33.1` | `pantograph` | Pantograph v0.3.19 tactic exploration bridge | `stable` | — |
| `v4.34.0-rc1` | `femev-runner` | lean-beam speculative tactic execution (validated) | `rc` | leanprover/lean-beam v0.1.0 |
| `v4.34.1` | `femev-runner` | Lungo v1.86.160 multi-language compiler & claims | `stable` | `lungo-cli` v1.86.160 |
| `v4.35.0-rc2` | `leanflow-runner` | doc-gen4 documentation compilation | `rc` | `docbuild/lakefile.toml` |
| `v4.35.0-rc4` | `kimina` | Kimina latest release candidate prover | `rc` | — |
| `v4.35.0` | `femev-runner` | 6-kernel paranoid verification, Veriphy, LeanFlow default | `stable` | `SEAL_KERNEL_VERIFIED_TIER5` |

*Last verified: 2026-10-29*

---

## 2. Invariant Policies

1. **Isolation Invariant**: No container shall install multiple conflicting global toolchains into `/root/.elan`. Each runner container is pinned to its designated primary toolchain.
2. **Project Preservation**: Projects importing external Lake packages preserve their `lean-toolchain` via local `elan override set`.
3. **Paranoid Tier 5 Certification**: Authoritative `SEAL_KERNEL_VERIFIED_TIER5` certificates are strictly issued by `femev-runner` running Lean `v4.35.0` across all 6 paranoid kernel checkers.
4. **Change Management**: Any addition or modification to this toolchain matrix in Phase 11 requires a formal Architectural Decision Record (ADR).
