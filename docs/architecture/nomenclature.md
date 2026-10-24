# Canonical Nomenclature & Casing Standards

**Polyglot Code Studio — Phase 10.9 Architecture**  
*Source: Manifesto & Architectural Consolidation*

---

## 1. Naming Conventions

To prevent nomenclature drift across the frontend, Node.js backend, and runner containers, Polyglot Code Studio enforces the following canonical casing and naming standards:

| Entity Type | Casing Rule | Example | Bad Drift Example |
| :--- | :--- | :--- | :--- |
| **Types & Interfaces** | `PascalCase` | `FemevOrchestrator`, `EpistemicStatus` | `FEMEVOrchestrator`, `EpistemicState` |
| **Verification Seals** | `SCREAMING_SNAKE_CASE` | `SEAL_KERNEL_VERIFIED_TIER5` | `SEAL_VERIFIED`, `SealVerified` |
| **Error Codes** | `SCREAMING_SNAKE_CASE` | `KERNEL_DISAGREEMENT`, `LEANCERT_UNAVAILABLE` | `KernelDisagreement`, `err_leancert` |
| **Functions & Methods** | `camelCase` | `validateProofSearchQuery()`, `verifyNumeric()` | `validateSearchQuery()`, `VerifyNumeric()` |
| **Bridge Instances** | `camelCase` | `femevEngine`, `leanFlowBridge`, `lungoBridge` | `FEMEVEngine`, `LeanflowBridge` |
| **Feature Flags** | `SCREAMING_SNAKE_CASE` | `ENABLE_FEMEV`, `PIPELINE_STRICT_GOALS` | `enableFemev`, `pipeline_strict_goals` |

---

## 2. Canonical Alias Replacements

| Legacy / Drifted Identifier | Canonical Standard | Rationalization |
| :--- | :--- | :--- |
| `FEMEVOrchestrator` | `FemevOrchestrator` | Preserves standard PascalCase for multi-letter acronyms |
| `EpistemicState` | `EpistemicStatus` | Distinguishes status union from runtime state objects |
| `SEAL_VERIFIED` | `SEAL_KERNEL_VERIFIED_TIER5` | Explicitly references 6-kernel paranoid verification tier |
| `validateSearchQuery` | `validateProofSearchQuery` | Disambiguates proof query sanitization from Mathlib search |
